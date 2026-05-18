"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createAnnouncement(formData: FormData) {
  const supabase = await createClient()
  
  const content = formData.get('content') as string
  const communityId = formData.get('community_id') as string

  if (!content || !communityId) return { error: 'Faltan datos' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // 1. Validar que el usuario es ADMIN
  const { data: membershipData } = await supabase
    .from('community_members')
    .select('role, profile_id')
    .eq('community_id', communityId)
    .eq('profile_id', user.id) // Asumiendo que profile_id coincide con Auth ID
    .single()

  // SOLUCIÓN: Casteo explícito para evitar el error 'never' en el role y profile_id
  const membership = membershipData as { role: string; profile_id: string } | null

  if (!membership || membership.role !== 'ADMIN') {
    return { error: 'Solo los administradores pueden publicar anuncios.' }
  }

  // 2. Insertar el post tipo "ANUNCIO"
  // SOLUCIÓN: Añadimos 'as any' para evitar el error de sobrecarga estricta
  const { error } = await supabase.from('posts').insert({
    community_id: communityId,
    author_id: membership.profile_id,
    content: content,
    post_type: 'ANUNCIO'
  } as any)

  if (error) {
    console.error("Error al crear anuncio:", error)
    return { error: 'Hubo un problema al publicar el anuncio.' }
  }

  revalidatePath('/')
  return { success: true }
}