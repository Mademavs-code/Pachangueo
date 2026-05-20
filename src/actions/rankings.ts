"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// CREAR RANKING
export async function createRanking(communityId: string, data: { name: string, description: string, metric: string, visual_type: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Verificamos que sea ADMIN
  const { data: adminCheck } = await supabase.from('community_members').select('role').eq('community_id', communityId).eq('profile_id', user.id).single()
  if ((adminCheck as any)?.role !== 'ADMIN') return { error: 'Solo los administradores pueden crear rankings.' }

  const { error } = await (supabase.from('community_rankings') as any).insert({
    community_id: communityId,
    name: data.name.trim(),
    description: data.description.trim(),
    metric: data.metric,
    visual_type: data.visual_type
  })

  if (error) return { error: 'Error al crear el ranking: ' + error.message }
  
  revalidatePath('/rankings')
  return { success: true }
}

// EDITAR RANKING
export async function updateRanking(rankingId: string, communityId: string, data: { name: string, description: string, metric: string, visual_type: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: adminCheck } = await supabase.from('community_members').select('role').eq('community_id', communityId).eq('profile_id', user.id).single()
  if ((adminCheck as any)?.role !== 'ADMIN') return { error: 'Solo los administradores pueden editar rankings.' }

  const { error } = await (supabase.from('community_rankings') as any)
    .update({
      name: data.name.trim(),
      description: data.description.trim(),
      metric: data.metric,
      visual_type: data.visual_type
    })
    .eq('id', rankingId)
    .eq('community_id', communityId)

  if (error) return { error: 'Error al actualizar el ranking: ' + error.message }
  
  revalidatePath('/rankings')
  return { success: true }
}

// BORRAR RANKING
export async function deleteRanking(rankingId: string, communityId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: adminCheck } = await supabase.from('community_members').select('role').eq('community_id', communityId).eq('profile_id', user.id).single()
  if ((adminCheck as any)?.role !== 'ADMIN') return { error: 'Solo los administradores pueden borrar rankings.' }

  const { error } = await (supabase.from('community_rankings') as any)
    .delete()
    .eq('id', rankingId)
    .eq('community_id', communityId)

  if (error) return { error: 'Error al borrar el ranking: ' + error.message }
  
  revalidatePath('/rankings')
  return { success: true }
}