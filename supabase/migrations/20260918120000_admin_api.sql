-- PATs and operational data are only accessible through trusted server code.
create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  prefix text not null,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create table public.api_audit_log (
  id uuid primary key default gen_random_uuid(),
  token_id uuid references public.api_tokens(id) on delete set null,
  token_name text not null,
  operation text not null,
  resource text not null,
  resource_id text,
  status text not null default 'started' check (status in ('started', 'succeeded', 'failed')),
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index api_audit_log_created_idx on public.api_audit_log (created_at desc, id);
create table public.api_uploads (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.api_tokens(id) on delete cascade,
  purpose text not null check (purpose in ('media', 'workshop', 'gift')),
  kind text not null check (kind in ('photo', 'video')),
  bucket text not null check (bucket in ('photos', 'videos')),
  storage_path text not null unique,
  poster_path text unique,
  metadata jsonb not null check (jsonb_typeof(metadata) = 'object'),
  expires_at timestamptz not null,
  completed_at timestamptz,
  result jsonb,
  created_at timestamptz not null default now(),
  check ((kind = 'photo' and bucket = 'photos' and poster_path is null)
    or (kind = 'video' and purpose = 'media' and bucket = 'videos' and poster_path is not null)),
  check ((completed_at is null) = (result is null))
);
create table public.api_storage_cleanup (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('photos', 'videos')),
  paths text[] not null check (cardinality(paths) > 0),
  created_at timestamptz not null default now()
);

do $$
declare name text;
begin
  foreach name in array array['api_tokens', 'api_audit_log', 'api_uploads', 'api_storage_cleanup'] loop
    execute format('alter table public.%I enable row level security', name);
    execute format('revoke all on public.%I from public, anon, authenticated', name);
    execute format('grant all on public.%I to service_role', name);
  end loop;
end;
$$;

-- One acceptance point for token state, owner state, membership and last use.
-- Locks serialize concurrent revocation, owner changes and admin removal.
create function public.admin_api_authenticate(p_token_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  principal jsonb;
begin
  select jsonb_build_object('id', t.id, 'name', t.name, 'owner_id', t.owner_id)
    into principal
    from public.api_tokens t
    join auth.users u on u.id = t.owner_id
    join public.admin_emails a on a.email = u.email
    where t.token_hash = p_token_hash and t.revoked_at is null
      and (u.banned_until is null or u.banned_until <= now())
    for update of t for share of u, a;
  if not found then return null; end if;
  update public.api_tokens set last_used_at = now() where id = (principal->>'id')::uuid;
  return principal;
end;
$$;
revoke all on function public.admin_api_authenticate(text) from public, anon, authenticated;
grant execute on function public.admin_api_authenticate(text) to service_role;

-- UI writes and API writes share the same monotonically increasing version.
create function public.admin_api_bump_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;
revoke all on function public.admin_api_bump_version() from public, anon, authenticated;

do $$
declare name text;
begin
  foreach name in array array['photos', 'booking_tiers', 'booking_faq', 'workshop',
    'gift_certificate', 'booking_requests', 'workshop_applications', 'workshop_subscribers',
    'gift_certificate_requests', 'app_settings'] loop
    execute format('alter table public.%I add column version integer not null default 1 check (version > 0)', name);
    execute format('create trigger admin_api_version before update on public.%I for each row execute function public.admin_api_bump_version()', name);
  end loop;
end;
$$;

-- Upload instructions are immutable after creation; only completion may change.
create function public.admin_api_upload_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new) - array['completed_at', 'result']) is distinct from
     (to_jsonb(old) - array['completed_at', 'result'])
     or (old.completed_at is not null and new is distinct from old) then
    raise exception 'invalid_request';
  end if;
  return new;
end;
$$;
revoke all on function public.admin_api_upload_immutable() from public, anon, authenticated;
create trigger api_upload_immutable before update on public.api_uploads
for each row execute function public.admin_api_upload_immutable();

create function public.admin_api_mutate(
  p_resource text, p_action text, p_id text, p_expected_version integer,
  p_data jsonb, p_token_id uuid, p_audit_id uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  table_name text;
  key_name text := 'id';
  allowed text[];
  row_data jsonb;
  result_data jsonb;
  assignments text;
  columns_sql text;
  values_sql text;
  item jsonb;
  block jsonb;
  field text;
  nested_allowed text[];
  slots integer[];
  item_index integer := 0;
  upload public.api_uploads%rowtype;
  new_position integer;
  has_ties boolean;
begin
  -- Locks linearize revocation/admin removal against an in-flight mutation.
  perform t.id from public.api_tokens t
    join auth.users u on u.id = t.owner_id
    join public.admin_emails a on a.email = u.email
    where t.id = p_token_id and t.revoked_at is null
    for share of t, u, a;
  if not found then raise exception 'unauthorized'; end if;
  perform id from public.api_audit_log where id = p_audit_id
    and token_id = p_token_id and status = 'started' for update;
  if not found then raise exception 'invalid_request'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'invalid_request'; end if;

  if p_resource = 'uploads' and p_action = 'begin-upload' then
    allowed := array['purpose','kind','bucket','storage_path','poster_path','metadata','expires_at'];
    if (p_data - allowed) <> '{}'::jsonb or not (p_data ?& allowed)
      or jsonb_typeof(p_data->'metadata') is distinct from 'object' then
      raise exception 'invalid_request';
    end if;
    block := p_data->'metadata';
    if (block - array['purpose','kind','filename','content_type','size','width','height','duration_seconds']) <> '{}'::jsonb
      or not (block ?& array['purpose','kind','filename','content_type','size','width','height'])
      or block->>'purpose' is distinct from p_data->>'purpose'
      or block->>'kind' is distinct from p_data->>'kind' then
      raise exception 'invalid_request';
    end if;
    foreach field in array array['purpose','kind','bucket','storage_path','expires_at'] loop
      if jsonb_typeof(p_data->field) is distinct from 'string' then raise exception 'invalid_request'; end if;
    end loop;
    foreach field in array array['purpose','kind','filename','content_type'] loop
      if jsonb_typeof(block->field) is distinct from 'string' then raise exception 'invalid_request'; end if;
    end loop;
    if char_length(block->>'filename') not between 1 and 200
      or (block->>'filename') ~ '[[:cntrl:]/\\]'
      or char_length(p_data->>'storage_path') not between 1 and 1024
      or (p_data->>'expires_at')::timestamptz <= now()
      or jsonb_typeof(block->'size') is distinct from 'number'
      or (block->>'size') !~ '^[1-9][0-9]*$'
      or (block->>'size')::numeric > (case when p_data->>'kind' = 'video' then 26214400 else 10485760 end) then
      raise exception 'invalid_request';
    end if;
    foreach field in array array['width','height'] loop
      if block->field <> 'null'::jsonb and (jsonb_typeof(block->field) <> 'number'
        or (block->>field) !~ '^[1-9][0-9]*$' or (block->>field)::numeric > 100000) then
        raise exception 'invalid_request';
      end if;
    end loop;
    if p_data->>'kind' = 'video' then
      if block->>'content_type' <> 'video/mp4'
        or block->'width' = 'null'::jsonb or block->'height' = 'null'::jsonb
        or jsonb_typeof(block->'duration_seconds') is distinct from 'number'
        or (block->>'duration_seconds')::numeric not between 0.001 and 86400
        or jsonb_typeof(p_data->'poster_path') is distinct from 'string'
        or char_length(p_data->>'poster_path') not between 1 and 1024 then
        raise exception 'invalid_request';
      end if;
    elsif block->>'content_type' not in ('image/jpeg','image/png','image/webp','image/gif','image/avif')
      or block ? 'duration_seconds' or p_data->'poster_path' <> 'null'::jsonb then
      raise exception 'invalid_request';
    end if;
    insert into public.api_uploads (id,token_id,purpose,kind,bucket,storage_path,poster_path,metadata,expires_at)
      values (p_id::uuid,p_token_id,p_data->>'purpose',p_data->>'kind',p_data->>'bucket',
        p_data->>'storage_path',p_data->>'poster_path',block,(p_data->>'expires_at')::timestamptz)
      returning to_jsonb(api_uploads.*) into result_data;
  elsif p_resource = 'uploads' and p_action = 'complete-upload' then
    if p_data <> '{}'::jsonb then raise exception 'invalid_request'; end if;
    select * into upload from public.api_uploads where id::text = p_id and token_id = p_token_id for update;
    if not found then raise exception 'not_found'; end if;
    if upload.completed_at is not null then
      result_data := upload.result;
    else
      if upload.expires_at <= now() then raise exception 'invalid_request'; end if;
      if not exists (select 1 from storage.objects where bucket_id = upload.bucket and name = upload.storage_path)
        or (upload.poster_path is not null and not exists (
          select 1 from storage.objects where bucket_id = upload.bucket and name = upload.poster_path)) then
        raise exception 'invalid_request';
      end if;
      if upload.purpose = 'media' then
        lock table public.photos in share row exclusive mode;
        select coalesce(min(position), 0) - 1 into new_position from public.photos;
        insert into public.photos (storage_path, kind, poster_path, width, height, duration_seconds, alt_text, pages, position)
          values (upload.storage_path, upload.kind, upload.poster_path,
            (upload.metadata->>'width')::integer, (upload.metadata->>'height')::integer,
            (upload.metadata->>'duration_seconds')::double precision,
            regexp_replace(upload.metadata->>'filename', '\.[^.]+$', ''), '{}', new_position)
          returning to_jsonb(photos.*) into result_data;
      else
        result_data := jsonb_build_object('storage_path', upload.storage_path, 'bucket', upload.bucket);
      end if;
      update public.api_uploads set completed_at = now(), result = result_data where id = upload.id;
    end if;
  else
    case p_resource
      when 'media' then table_name := 'photos'; allowed := array['title', 'description', 'alt_text', 'pages'];
      when 'tiers' then table_name := 'booking_tiers'; allowed := array['name','subtitle','price_text','description','is_active','is_accent'];
      when 'faq' then table_name := 'booking_faq'; allowed := array['question','answer','is_visible'];
      when 'workshop' then table_name := 'workshop'; allowed := array['banner_visible','sales_open','workshop_number','title','tagline','dates','location','price','seats','hero_photo_path','intro','the_idea_heading','the_idea_quote','apply_heading','apply_intro','closed_heading','closed_intro','program','gallery','faq','tariffs','tariffs_intro','days'];
      when 'gift-certificate' then table_name := 'gift_certificate'; allowed := array['is_visible','body','amounts','gallery'];
      when 'settings' then table_name := 'app_settings'; key_name := 'key'; p_id := 'booking_recipient_email'; allowed := array['value'];
      when 'booking-requests' then table_name := 'booking_requests'; allowed := '{}';
      when 'workshop-applications' then table_name := 'workshop_applications'; allowed := '{}';
      when 'workshop-subscribers' then table_name := 'workshop_subscribers'; allowed := '{}';
      when 'gift-orders' then table_name := 'gift_certificate_requests'; allowed := '{}';
      else raise exception 'invalid_request';
    end case;

    if p_action = 'reorder' then
      if p_resource not in ('media','tiers','faq') or (p_data - 'items') <> '{}'::jsonb
        or jsonb_typeof(p_data->'items') is distinct from 'array'
        or jsonb_array_length(p_data->'items') not between 1 and 100 then raise exception 'invalid_request'; end if;
      if (select count(distinct value->>'id') from jsonb_array_elements(p_data->'items')) <> jsonb_array_length(p_data->'items') then
        raise exception 'invalid_request';
      end if;
      execute format('lock table public.%I in share row exclusive mode', table_name);
      for item in select value from jsonb_array_elements(p_data->'items') loop
        if jsonb_typeof(item) <> 'object' or (item - array['id','version']) <> '{}'::jsonb
          or jsonb_typeof(item->'id') is distinct from 'string'
          or jsonb_typeof(item->'version') is distinct from 'number' then raise exception 'invalid_request'; end if;
        execute format('select to_jsonb(t) from public.%I t where id::text = $1 for update', table_name)
          into row_data using item->>'id';
        if row_data is null then raise exception 'not_found'; end if;
        if (row_data->>'version')::integer <> (item->>'version')::integer then raise exception 'conflict'; end if;
        slots := array_append(slots, (row_data->>'position')::integer);
      end loop;
      -- Concurrent legacy UI inserts can share a numeric position. Repair tied
      -- slots using the existing deterministic visual order before permuting;
      -- omitted rows retain their visual slots, even if numeric ranks change.
      execute format('select exists (select 1 from public.%I group by position having count(*) > 1)', table_name)
        into has_ties;
      if has_ties then
        execute format('with ranked as (select id, (row_number() over (order by position, id))::integer as rank from public.%I) update public.%I t set position = ranked.rank from ranked where t.id = ranked.id and t.position is distinct from ranked.rank', table_name, table_name);
        slots := '{}';
        for item in select value from jsonb_array_elements(p_data->'items') loop
          execute format('select position from public.%I where id::text = $1', table_name)
            into new_position using item->>'id';
          slots := array_append(slots, new_position);
        end loop;
      end if;
      select array_agg(slot order by slot) into slots from unnest(slots) slot;
      result_data := '[]';
      for item in select value from jsonb_array_elements(p_data->'items') loop
        item_index := item_index + 1;
        execute format('update public.%I t set position = $1 where id::text = $2 returning to_jsonb(t)', table_name)
          into row_data using slots[item_index], item->>'id';
        result_data := result_data || jsonb_build_array(row_data);
      end loop;
    elsif p_action in ('create','update','delete') then
      if p_action = 'create' and p_resource not in ('tiers','faq') then raise exception 'invalid_request'; end if;
      if p_action = 'delete' and p_resource in ('workshop','gift-certificate','settings') then raise exception 'invalid_request'; end if;
      if p_action = 'update' and cardinality(allowed) = 0 then raise exception 'invalid_request'; end if;
      if (p_action = 'delete' and p_data <> '{}'::jsonb)
        or (p_action <> 'delete' and (p_data = '{}'::jsonb or (p_data - allowed) <> '{}'::jsonb)) then
        raise exception 'invalid_request';
      end if;

      -- Nested content is also allowlisted, so column updates cannot hide unknown fields.
      for field in select jsonb_object_keys(p_data) loop
        nested_allowed := case field
          when 'program' then array['day','title','body','photo_path']
          when 'gallery' then array['photo_path']
          when 'faq' then array['question','answer']
          when 'tariffs' then array['key','name','days','price','summary','desc','days_list','extras','note','featured']
          when 'amounts' then array['id','price']
          when 'days' then array['day','title','note','bullets'] else null end;
        if nested_allowed is not null then
          if jsonb_typeof(p_data->field) <> 'array' then raise exception 'invalid_request'; end if;
          for block in select value from jsonb_array_elements(p_data->field) loop
            if jsonb_typeof(block) <> 'object' or (block - nested_allowed) <> '{}'::jsonb then raise exception 'invalid_request'; end if;
          end loop;
        end if;
      end loop;
      -- Always acquire the table lock before row locks, matching reorder.
      -- Reversing these locks lets a concurrent reorder/update deadlock.
      execute format('lock table public.%I in share row exclusive mode', table_name);
      if p_action = 'create' then
        execute format('select coalesce(min(position), 0) - 1 from public.%I', table_name) into new_position;
        p_data := (case when p_resource = 'tiers' then '{"is_active":false}'::jsonb else '{"is_visible":false}'::jsonb end)
          || p_data || jsonb_build_object('position', new_position);
        select string_agg(format('%I', k), ', '), string_agg(format('r.%I', k), ', ')
          into columns_sql, values_sql from jsonb_object_keys(p_data) k;
        execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) r returning to_jsonb(%I.*)',
          table_name, columns_sql, values_sql, table_name, table_name) into result_data using p_data;
      else
        if p_expected_version is null or p_expected_version < 1 then raise exception 'invalid_request'; end if;
        if p_resource in ('workshop','gift-certificate') then
          execute format('select to_jsonb(t) from public.%I t for update', table_name) into row_data;
          p_id := row_data->>'id';
        else
          execute format('select to_jsonb(t) from public.%I t where %I::text = $1 for update', table_name, key_name)
            into row_data using p_id;
        end if;
        if row_data is null then raise exception 'not_found'; end if;
        if (row_data->>'version')::integer <> p_expected_version then raise exception 'conflict'; end if;
        if p_action = 'delete' then
          if p_resource = 'media' then
            insert into public.api_storage_cleanup (bucket, paths) values (
              case when row_data->>'kind' = 'video' then 'videos' else 'photos' end,
              array_remove(array[row_data->>'storage_path', row_data->>'poster_path'], null));
          end if;
          execute format('delete from public.%I t where %I::text = $1 returning to_jsonb(t)', table_name, key_name)
            into result_data using p_id;
        else
          select string_agg(format('%I = r.%I', k, k), ', ') into assignments from jsonb_object_keys(p_data) k;
          execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I, $1) r where t.%I::text = $2 returning to_jsonb(t)',
            table_name, assignments, table_name, key_name) into result_data using p_data, p_id;
        end if;
      end if;
    else raise exception 'invalid_request';
    end if;
  end if;
  update public.api_audit_log set status = 'succeeded', completed_at = now(), error_code = null,
    resource_id = coalesce(resource_id, result_data->>'id', p_id)
    where id = p_audit_id;
  return result_data;
exception
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow
    or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation then
    raise exception 'invalid_request';
end;
$$;
revoke all on function public.admin_api_mutate(text,text,text,integer,jsonb,uuid,uuid) from public, anon, authenticated;
grant execute on function public.admin_api_mutate(text,text,text,integer,jsonb,uuid,uuid) to service_role;
