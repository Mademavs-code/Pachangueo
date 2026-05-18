"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCommunity(formData: FormData) {
  const supabase = await createClient()

  // 1. Verificación de sesión
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Debes iniciar sesión para realizar esta acción.' }
  }

  const name = formData.get('name') as string
  const primaryColor = formData.get('primaryColor') as string || '#000000'
  const secondaryColor = formData.get('secondaryColor') as string || '#FFFFFF'

  if (!name || name.trim().length === 0) {
    return { error: 'El nombre de la comunidad es obligatorio.' }
  }

  // 2. Obtener o crear el perfil (Añadimos la lectura del 'alias')
  let profileId: string;
  let userAlias: string;
  
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, alias')
    .eq('id', user.id)
    .single()

  if (!profileData) {
    const defaultAlias = user.user_metadata?.display_name || 'Jugador';
    
    const { data: newProfileData, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        alias: defaultAlias,
        is_guest: false,
      } as any)
      .select('id, alias')
      .single()

    if (createError) return { error: 'No se pudo crear el perfil: ' + createError.message }
    
    const newProfile = (newProfileData as unknown) as { id: string, alias: string }
    profileId = newProfile.id
    userAlias = newProfile.alias
  } else {
    const profile = (profileData as unknown) as { id: string, alias: string }
    profileId = profile.id
    userAlias = profile.alias
  }

  // 3. Crear la comunidad
  const inviteToken = Math.random().toString(36).substring(2, 8).toUpperCase()

  const { data: communityData, error: communityError } = await supabase
    .from('communities')
    .insert({
      name: name.trim(),
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      invite_token: inviteToken,
    } as any)
    .select('id')
    .single()

  if (communityError) {
    return { error: 'Error al crear la comunidad: ' + communityError.message }
  }

  const newCommunity = (communityData as unknown) as { id: string }

  // 4. Vincular el miembro enviando el ALIAS requerido
  const { error: memberError } = await supabase
    .from('community_members')
    .insert({
      community_id: newCommunity.id,
      profile_id: profileId, 
      role: 'ADMIN',
      alias: userAlias,
    } as any)

  if (memberError) {
    return { error: 'Comunidad creada, pero hubo un error al asignarte como administrador: ' + memberError.message }
  }

  // 5. Finalización
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateCommunitySettings(formData: FormData) {
  const supabase = await createClient()
  
  const communityId = formData.get('community_id') as string
  const name = formData.get('name') as string
  const primaryColor = formData.get('primaryColor') as string
  const secondaryColor = formData.get('secondaryColor') as string

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Validar rol ADMIN (Casteo explícito para evitar error never en role)
  const { data: membershipData } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('profile_id', user.id)
    .single()

  const membership = membershipData as { role: string } | null

  if (!membership || membership.role !== 'ADMIN') return { error: 'No autorizado' }

  // Actualizar casteando la tabla a any (como en matches.ts) para evitar el error never en update
  const { error } = await (supabase.from('communities') as any)
    .update({ 
      name, 
      primary_color: primaryColor, 
      secondary_color: secondaryColor 
    })
    .eq('id', communityId)

  if (error) return { error: 'Error al actualizar la comunidad' }

  revalidatePath('/', 'layout') 
  return { success: true }
}