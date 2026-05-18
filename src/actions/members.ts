"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function changeMemberRole(communityId: string, profileId: string, newRole: 'ADMIN' | 'MEMBER') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: adminCheck } = await supabase.from('community_members').select('role').eq('community_id', communityId).eq('profile_id', user.id).single()
  const check = adminCheck as { role: string } | null
  if (check?.role !== 'ADMIN') return { error: 'Solo los administradores pueden cambiar roles.' }

  const { error } = await (supabase.from('community_members') as any).update({ role: newRole }).eq('community_id', communityId).eq('profile_id', profileId)
  if (error) return { error: 'Error al actualizar el rol: ' + error.message }
  
  revalidatePath('/members')
  return { success: true }
}

export async function kickMember(communityId: string, profileId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: adminCheck } = await supabase.from('community_members').select('role').eq('community_id', communityId).eq('profile_id', user.id).single()
  const check = adminCheck as { role: string } | null
  if (check?.role !== 'ADMIN') return { error: 'Solo los administradores pueden expulsar jugadores.' }

  if (user.id === profileId) return { error: 'No puedes expulsarte a ti mismo.' }

  const { error } = await (supabase.from('community_members') as any).delete().eq('community_id', communityId).eq('profile_id', profileId)
  if (error) return { error: 'Error al expulsar al jugador: ' + error.message }
  
  revalidatePath('/members')
  return { success: true }
}

// ACTUALIZADO: Ahora acepta y guarda también la URL del Avatar
export async function updateMemberProfile(
  communityId: string, 
  profileId: string, 
  alias: string, 
  position: string,
  avatarUrl?: string // <-- NUEVO: Parámetro opcional
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  let canEdit = user.id === profileId;
  if (!canEdit) {
    const { data: adminCheck } = await supabase.from('community_members').select('role').eq('community_id', communityId).eq('profile_id', user.id).single()
    if ((adminCheck as any)?.role === 'ADMIN') canEdit = true;
  }

  if (!canEdit) return { error: 'No tienes permisos para editar este perfil.' }
  if (!alias || alias.trim().length === 0) return { error: 'El alias no puede estar vacío.' }

  // 1. Actualizamos los datos específicos de la membresía en la comunidad
  const { error: memberError } = await (supabase.from('community_members') as any)
    .update({ alias: alias.trim(), preferred_position: position })
    .eq('community_id', communityId)
    .eq('profile_id', profileId)

  if (memberError) return { error: 'Error al actualizar membresía: ' + memberError.message }

  // 2. Actualizamos los datos globales en la tabla de perfiles (Alias y Foto de Perfil)
  const profileUpdates: any = { alias: alias.trim() }
  if (avatarUrl) {
    profileUpdates.avatar_url = avatarUrl
  }

  const { error: profileError } = await (supabase.from('profiles') as any)
    .update(profileUpdates)
    .eq('id', profileId)

  if (profileError) return { error: 'Error al actualizar perfil global: ' + profileError.message }

  revalidatePath('/members')
  return { success: true }
}