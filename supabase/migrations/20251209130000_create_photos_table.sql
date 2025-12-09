-- Migration: Create photos table for managing photo metadata and ordering
-- Purpose: Store photo metadata, ordering, and visibility separate from storage
-- Affected: public.photos table

-- Create photos table
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  title text,
  description text,
  alt_text text,
  position integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add comment for documentation
comment on table public.photos is 'Photo metadata and ordering for the portfolio gallery';
comment on column public.photos.storage_path is 'Path to the file in the photos storage bucket';
comment on column public.photos.position is 'Display order position (lower = first)';
comment on column public.photos.is_visible is 'Whether the photo is publicly visible';

-- Create index on position for efficient ordering queries
create index photos_position_idx on public.photos (position);

-- Create index on is_visible for filtering
create index photos_visible_idx on public.photos (is_visible) where is_visible = true;

-- Enable Row Level Security
alter table public.photos enable row level security;

-- RLS Policies

-- Policy: Anyone can view visible photos (for public gallery)
create policy "Anyone can view visible photos"
on public.photos
for select
to anon, authenticated
using (is_visible = true);

-- Policy: Authenticated users can view all photos (including hidden)
create policy "Authenticated users can view all photos"
on public.photos
for select
to authenticated
using (true);

-- Policy: Authenticated users can insert photos
create policy "Authenticated users can insert photos"
on public.photos
for insert
to authenticated
with check (true);

-- Policy: Authenticated users can update photos
create policy "Authenticated users can update photos"
on public.photos
for update
to authenticated
using (true)
with check (true);

-- Policy: Authenticated users can delete photos
create policy "Authenticated users can delete photos"
on public.photos
for delete
to authenticated
using (true);

-- Function to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger to update updated_at on row update
create trigger photos_updated_at
  before update on public.photos
  for each row
  execute function public.handle_updated_at();
