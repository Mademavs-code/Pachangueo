"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 1. CREAR ANUNCIO
export async function createAnnouncement(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: profileData } = await supabase.from('profiles').select('id').eq('id', user.id).single()
  const profile = profileData as { id: string } | null
  if (!profile) return { error: 'Perfil no encontrado' }

  const communityId = formData.get('community_id') as string
  const content = formData.get('content') as string
  const expiresInDays = parseInt(formData.get('expires_in_days') as string || '0')
  const imageFile = formData.get('image') as File | null

  const { data: membershipData } = await supabase.from('community_members').select('role').eq('profile_id', profile.id).eq('community_id', communityId).single()
  const membership = membershipData as { role: string } | null
  if (!membership || membership.role !== 'ADMIN') return { error: 'Solo los administradores pueden publicar anuncios.' }

  // Caducidad
  let expiresAt = null
  if (expiresInDays > 0) {
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + expiresInDays)
    expiresAt = expirationDate.toISOString()
  }

  // Imagen
  let imageUrl = null
  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${communityId}-${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('announcements').upload(fileName, imageFile, { cacheControl: '3600', upsert: true })
    if (uploadError) return { error: 'Error subiendo la imagen: ' + uploadError.message }
    const { data: publicUrlData } = supabase.storage.from('announcements').getPublicUrl(fileName)
    imageUrl = publicUrlData.publicUrl
  }

  const { error } = await (supabase.from('posts') as any).insert({
    community_id: communityId,
    author_id: profile.id,
    post_type: 'ANUNCIO',
    content: content,
    expires_at: expiresAt,
    image_url: imageUrl
  })

  if (error) return { error: 'Error al publicar el anuncio: ' + error.message }
  revalidatePath('/')
  return { success: true }
}

// 2. BORRAR ANUNCIO
export async function deleteAnnouncement(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await (supabase.from('posts') as any).delete().eq('id', postId)
  if (error) return { error: 'Error al borrar el anuncio: ' + error.message }

  revalidatePath('/')
  return { success: true }
}

// 3. EDITAR ANUNCIO
export async function updateAnnouncement(postId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const communityId = formData.get('community_id') as string
  const content = formData.get('content') as string
  const expiresInDays = parseInt(formData.get('expires_in_days') as string || '-1')
  const imageFile = formData.get('image') as File | null
  const removeImage = formData.get('remove_image') === 'true'

  let updateData: any = { content: content }

  // Solo recalculamos caducidad si han seleccionado un valor válido (distinto de -1)
  if (expiresInDays !== -1) {
    if (expiresInDays === 0) {
      updateData.expires_at = null
    } else {
      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() + expiresInDays)
      updateData.expires_at = expirationDate.toISOString()
    }
  }

  // Tratamiento de la imagen
  if (removeImage) {
    updateData.image_url = null
  } else if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${communityId}-edit-${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('announcements').upload(fileName, imageFile, { cacheControl: '3600', upsert: true })
    if (uploadError) return { error: 'Error subiendo nueva imagen: ' + uploadError.message }
    const { data: publicUrlData } = supabase.storage.from('announcements').getPublicUrl(fileName)
    updateData.image_url = publicUrlData.publicUrl
  }

  const { error } = await (supabase.from('posts') as any).update(updateData).eq('id', postId)
  if (error) return { error: 'Error al actualizar: ' + error.message }

  revalidatePath('/')
  return { success: true }
}