-- Add videos to the shared photos ordering model and provision their storage.

alter table public.photos
  add column kind text not null default 'photo',
  add column poster_path text,
  add column duration_seconds double precision,
  add constraint photos_kind_valid check (kind in ('photo', 'video'));

comment on column public.photos.kind is 'Media type: photo or video.';
comment on column public.photos.poster_path is 'Poster jpg path in the videos bucket; set for videos only.';
comment on column public.photos.duration_seconds is 'Video duration in seconds; set for videos only.';
comment on column public.photos.storage_path is 'Path to the source object in the photos or videos bucket, according to kind.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 26214400, array['video/mp4', 'image/jpeg']);

create policy "Public read access for videos bucket"
on storage.objects
for select
to public
using (bucket_id = 'videos');

create policy "Admins can upload to videos bucket"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'videos' and public.is_admin());

create policy "Admins can update videos in videos bucket"
on storage.objects
for update
to authenticated
using (bucket_id = 'videos' and public.is_admin())
with check (bucket_id = 'videos' and public.is_admin());

create policy "Admins can delete videos in videos bucket"
on storage.objects
for delete
to authenticated
using (bucket_id = 'videos' and public.is_admin());
