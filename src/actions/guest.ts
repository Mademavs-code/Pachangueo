"use server"

import { createClient } from '@/lib/supabase/server'

export async function joinAsGuest(formData: FormData) {
  const supabase = await createClient()
  const matchId = formData.get('match_id') as string
  const alias = formData.get('alias') as string

  if (!alias || alias.trim().length === 0) return { error: 'El alias es obligatorio.' }

  const { data: matchData } = await supabase.from('matches').select('maxPlayers, community_id').eq('id', matchId).single()
  const match = matchData as { maxPlayers: number, community_id: string } | null
  if (!match) return { error: 'Partido no encontrado.' }
  
  const { count } = await supabase.from('match_players').select('*', { count: 'exact', head: true }).eq('match_id', matchId)
  if (count !== null && count >= (match.maxPlayers || 14)) return { error: 'El partido ya está lleno.' }

  const dummyEmail = `guest_${Date.now()}_${Math.random().toString(36).substring(2,7)}@guest.local`
  const dummyPassword = Math.random().toString(36).slice(-10) + "A1!"
  
  // 1. Crear usuario en la autenticación de Supabase
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: dummyEmail,
    password: dummyPassword
  })

  if (authError || !authData.user) return { error: 'Error de Auth: ' + (authError?.message || 'Desconocido') }

  if (!authData.session) {
    return { error: 'Supabase bloqueó el acceso. Ve a Supabase > Authentication > Providers > Email y desactiva "Confirm Email".' }
  }

  // 2. Insertar perfil incluyendo el email para cumplir con la restricción NOT NULL de tu BD
  const { error: profileError } = await (supabase.from('profiles') as any).upsert({
    id: authData.user.id,
    alias: alias.trim(),
    email: dummyEmail, // 🛡️ ¡Añadimos esto para solucionar el error de columna obligatoria!
    is_guest: true
  })
  if (profileError) return { error: 'Error al crear perfil: ' + profileError.message }

  // 3. Insertar membresía temporal
  const { error: memberError } = await (supabase.from('community_members') as any).insert({
    community_id: match.community_id,
    profile_id: authData.user.id,
    role: 'MEMBER',
    alias: alias.trim()
  })
  if (memberError) return { error: 'Error al vincular comunidad: ' + memberError.message }

  // 4. Inscribir al partido
  const { error: matchError } = await (supabase.from('match_players') as any).insert({
    match_id: matchId,
    member_id: authData.user.id,
    has_paid: false,
    attendance: 'PENDING'
  })
  if (matchError) return { error: 'Error al inscribir en el partido: ' + matchError.message }

  return { success: true, matchId: matchId }
}