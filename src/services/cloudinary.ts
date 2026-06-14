const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined

type ResourceType = 'image' | 'raw' | 'auto'

interface UploadOptions {
  folder?: string
  resourceType?: ResourceType
  publicId?: string
}

export async function uploadToCloudinary(
  file: File,
  { folder, resourceType = 'auto', publicId }: UploadOptions = {}
): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary não configurado: defina VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET no .env'
    )
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  if (folder) formData.append('folder', folder)
  if (publicId) formData.append('public_id', publicId)

  const response = await fetch(endpoint, { method: 'POST', body: formData })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Falha no upload para o Cloudinary (${response.status}): ${detail}`)
  }

  const data = (await response.json()) as { secure_url: string }
  return data.secure_url
}
