import { externalSupabase as supabase } from "@/integrations/external-supabase/client";

export async function uploadImages(
  files: File[],
  folder = "ofertas",
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("uploads").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("uploads").getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}
