import { createClient } from "./supabase/client"

export async function uploadReceipt(file: File): Promise<string> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("Usuário não autenticado")
  }

  const fileExt = file.name.split(".").pop()
  const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`
  const filePath = `${fileName}`

  // Upload the file to the "receipts" bucket
  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    })

  if (uploadError) {
    console.error("Storage upload error:", uploadError)
    throw new Error("Erro ao fazer upload do arquivo. O Bucket 'receipts' existe?")
  }

  // Get the public URL
  const { data } = supabase.storage
    .from("receipts")
    .getPublicUrl(filePath)

  return data.publicUrl
}
