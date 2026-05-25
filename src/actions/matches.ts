"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers' 

// ==========================================
// 1. CREAR PARTIDO Y POST
// ==========================================
export async function createMatch(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado.' }

  const { data: profileData } = await supabase.from('profiles').select('id').eq('id', user.id).single()
  const profile = profileData as { id: string } | null
  if (!profile) return { error: 'Perfil no encontrado.' }

  const { data: membershipsData } = await supabase
    .from('community_members')
    .select('community_id, role')
    .eq('profile_id', profile.id)

  const memberships = (membershipsData as { community_id: string, role: string }[]) || []
  
  const cookieStore = await cookies()
  const cookieCommunityId = cookieStore.get('pachangueo_active_community')?.value
  
  let activeCommunityId = cookieCommunityId
  if (!activeCommunityId && memberships.length > 0) {
    activeCommunityId = memberships[0].community_id
  }

  const activeMembership = memberships.find(m => m.community_id === activeCommunityId)
  if (!activeMembership || activeMembership.role !== 'ADMIN') {
    return { error: 'Solo los administradores pueden crear partidos en esta comunidad.' }
  }

  const location = formData.get('location') as string
  const type = formData.get('type') as string 
  const dateStr = formData.get('date') as string
  const timeStr = formData.get('time') as string
  const price = parseFloat(formData.get('price') as string || '0')

  // 👉 CÁLCULO DE AFORO CON MODO PRUEBA
  let maxPlayers = 14;
  if (type === '[PRUEBA]') maxPlayers = 4;
  else if (type === '5' || type === 'Sala') maxPlayers = 10;
  else if (type === '7') maxPlayers = 14;
  else if (type === '11') maxPlayers = 22;

  const matchDateTime = new Date(`${dateStr}T${timeStr}`)
  if (matchDateTime < new Date()) {
    return { error: 'No puedes programar un partido en una fecha y hora del pasado.' }
  }

  const { data: matchData, error: matchError } = await (supabase.from('matches') as any)
    .insert({
      community_id: activeCommunityId,
      created_by: profile.id,
      match_date: dateStr,
      match_time: timeStr,
      match_location: location,
      match_type: type,
      match_price: price,
      maxPlayers: maxPlayers,
      status: 'OPEN'
    })
    .select('id')
    .single()

  if (matchError || !matchData) return { error: matchError?.message || 'Error al crear partido.' }

  await (supabase.from('posts') as any).insert({
    community_id: activeCommunityId,
    author_id: profile.id, 
    post_type: 'PARTIDO',
    content: `¡Nuevo partido de Fútbol ${type} en ${location}! Fecha: ${dateStr} a las ${timeStr}.`,
    match_id: matchData.id
  })

  revalidatePath('/')
  revalidatePath('/matches')
  return { success: true }
}

// ==========================================
// 2. APUNTARSE AL PARTIDO
// ==========================================
export async function joinMatch(matchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Inicia sesión primero.' }

  const { data } = await supabase.from('matches').select('maxPlayers').eq('id', matchId).single()
  const matchData = data as { maxPlayers: number } | null

  const { count } = await supabase.from('match_players').select('*', { count: 'exact', head: true }).eq('match_id', matchId)
  
  if (count !== null && matchData && count >= (matchData.maxPlayers || 14)) {
    return { error: 'El partido ya está lleno.' }
  }

  const { error } = await (supabase.from('match_players') as any).insert({
    match_id: matchId,
    member_id: user.id
  })

  if (error) return { error: error.message }
  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}

// ==========================================
// 3. BORRARSE DEL PARTIDO
// ==========================================
export async function leaveMatch(matchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado.' }

  const { error } = await (supabase.from('match_players') as any)
    .delete()
    .eq('match_id', matchId)
    .eq('member_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}

// ==========================================
// 4. GUARDAR ALINEACIONES (DESDE EL MANAGER)
// ==========================================
export async function saveLineups(matchId: string, teamBlanco: string[], teamNegro: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado.' }

  const { error: err1 } = await (supabase.from('match_players') as any)
    .update({ team: null })
    .eq('match_id', matchId)
    .select()

  if (err1) return { error: 'Error al limpiar equipos: ' + err1.message }

  if (teamBlanco.length > 0) {
    const { error: errBlanco } = await (supabase.from('match_players') as any)
      .update({ team: 'BLANCO' })
      .eq('match_id', matchId)
      .in('member_id', teamBlanco)
      .select()
      
    if (errBlanco) return { error: 'Error al guardar Equipo Blanco: ' + errBlanco.message }
  }

  if (teamNegro.length > 0) {
    const { error: errNegro } = await (supabase.from('match_players') as any)
      .update({ team: 'NEGRO' })
      .eq('match_id', matchId)
      .in('member_id', teamNegro)
      .select()

    if (errNegro) return { error: 'Error al guardar Equipo Negro: ' + errNegro.message }
  }

  await (supabase.from('matches') as any)
    .update({ status: 'CLOSED' })
    .eq('id', matchId)

  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}

// ==========================================
// 5. CONTROL DE ASISTENCIA Y PAGOS (SOLO ADMIN)
// ==========================================
export async function togglePayment(matchId: string, memberId: string, currentStatus: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await (supabase.from('match_players') as any)
    .update({ has_paid: !currentStatus })
    .eq('match_id', matchId)
    .eq('member_id', memberId)

  if (error) return { error: error.message }
  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}

export async function updateAttendance(matchId: string, memberId: string, status: 'PENDING' | 'ON_TIME' | 'LATE' | 'NO_SHOW') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await (supabase.from('match_players') as any)
    .update({ attendance: status })
    .eq('match_id', matchId)
    .eq('member_id', memberId)

  if (error) return { error: error.message }
  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}

// ==========================================
// 6. FINALIZAR PARTIDO
// ==========================================
export async function endMatch(matchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await (supabase.from('matches') as any)
    .update({ status: 'CLOSED' })
    .eq('id', matchId)

  if (error) return { error: 'Error al finalizar el partido: ' + error.message }
  
  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}

// ==========================================
// 7. SISTEMA DE VOTACIONES Y MVP
// ==========================================
export async function submitVotes(matchId: string, votes: { evaluated_id: string, rating: number, is_mvp: boolean }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const evaluationsToInsert = votes.map(vote => ({
    match_id: matchId,
    evaluator_id: user.id,
    evaluated_id: vote.evaluated_id,
    rating: vote.rating,
    is_mvp: vote.is_mvp
  }))

  const { error } = await (supabase.from('match_evaluations') as any).insert(evaluationsToInsert)

  if (error) {
    if (error.code === '23505') return { error: 'Ya has enviado tus valoraciones para este partido.' }
    return { error: 'Error al guardar los votos: ' + error.message }
  }

  return { success: true }
}

// ==========================================
// 8. EDITAR PARTIDO
// ==========================================
export async function updateMatch(matchId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado.' }

  const location = formData.get('location') as string
  const type = formData.get('type') as string 
  const dateStr = formData.get('date') as string
  const timeStr = formData.get('time') as string
  const price = parseFloat(formData.get('price') as string || '0')

  // 👉 CÁLCULO DE AFORO CON MODO PRUEBA AL EDITAR
  let maxPlayers = 14;
  if (type === '[PRUEBA]') maxPlayers = 4;
  else if (type === '5' || type === 'Sala') maxPlayers = 10;
  else if (type === '7') maxPlayers = 14;
  else if (type === '11') maxPlayers = 22;

  const matchDateTime = new Date(`${dateStr}T${timeStr}`)
  if (matchDateTime < new Date()) {
    return { error: 'No puedes reprogramar un partido hacia el pasado.' }
  }

  const { error } = await (supabase.from('matches') as any)
    .update({
      match_date: dateStr,
      match_time: timeStr,
      match_location: location,
      match_type: type,
      match_price: price,
      maxPlayers: maxPlayers
    })
    .eq('id', matchId)

  if (error) return { error: 'Error al actualizar el partido: ' + error.message }
  
  revalidatePath(`/matches/${matchId}`)
  revalidatePath(`/matches`)
  return { success: true }
}

// ==========================================
// 9. PURGAR PARTIDOS ANTIGUOS (+7 DÍAS)
// ==========================================
export async function purgeOldMatches(communityId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado.' }

  const limitDate = new Date()
  limitDate.setDate(limitDate.getDate() - 7)
  const dateString = limitDate.toISOString().split('T')[0]

  const { error } = await (supabase.from('matches') as any)
    .delete()
    .eq('community_id', communityId)
    .lt('match_date', dateString)

  if (error) return { error: 'Error al purgar partidos antiguos: ' + error.message }
  
  revalidatePath(`/matches`)
  return { success: true }
}

// ==========================================
// 10. ELIMINAR PARTIDO (ADMIN)
// ==========================================
export async function deleteMatch(matchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  await (supabase.from('match_evaluations') as any).delete().eq('match_id', matchId)
  await (supabase.from('match_players') as any).delete().eq('match_id', matchId)
  await (supabase.from('posts') as any).delete().eq('match_id', matchId)
  
  const { error } = await (supabase.from('matches') as any).delete().eq('id', matchId)
  
  if (error) return { error: 'Error al eliminar el partido: ' + error.message }
  
  revalidatePath('/matches')
  revalidatePath('/')
  return { success: true }
}