'use server';

import { createClient } from '@supabase/supabase-js';

export async function uploadFileBypassingRLS(formData: FormData, bucket: string, fileName: string) {
  const file = formData.get('file') as File;
  if (!file) throw new Error('No file provided');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are missing');
  }

  const admin = createClient(supabaseUrl, supabaseKey);

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const { error } = await admin.storage
    .from(bucket)
    .upload(fileName, bytes, { contentType: file.type, upsert: true });

  if (error) throw new Error(error.message);

  const { data: { publicUrl } } = admin.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
}
