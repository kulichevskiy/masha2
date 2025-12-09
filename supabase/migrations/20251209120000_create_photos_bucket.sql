-- Migration: Create public storage bucket for photos
-- Purpose: Store photos in Supabase Storage instead of on disk
-- Affected: storage.buckets, storage.objects (RLS policies)

-- Create a public bucket for photos
-- public = true means files can be accessed without authentication
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true);

-- RLS Policies for storage.objects
-- Since this is a public bucket for a photo gallery, we allow public read access
-- and restrict uploads to authenticated users only

-- Policy: Allow public read access to photos bucket
-- Anyone can view/download photos from this bucket
create policy "Public read access for photos bucket"
on storage.objects
for select
to public
using (bucket_id = 'photos');

-- Policy: Allow authenticated users to upload photos
-- Only authenticated users can upload new photos
create policy "Authenticated users can upload photos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'photos');

-- Policy: Allow authenticated users to update their own photos
-- Users can only update photos they own
create policy "Users can update own photos"
on storage.objects
for update
to authenticated
using (bucket_id = 'photos' and (select auth.uid()) = owner)
with check (bucket_id = 'photos');

-- Policy: Allow authenticated users to delete their own photos
-- Users can only delete photos they own
create policy "Users can delete own photos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'photos' and (select auth.uid()) = owner);
