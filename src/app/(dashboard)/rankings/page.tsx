import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'
import RankingsClient from './RankingsClient'
import { getActiveCommunityId } from '@/lib/community'

export default async function RankingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('id, is_guest').eq('id', user.id).single()
  const profile = profileData as { id: string, is_guest: boolean } | null
  if (!profile || profile.is_guest) redirect('/')

  const { data: membershipsData } = await supabase
    .from('community_members')
    .select('community_id, role')
    .eq('profile_id', profile.id)
  
  const memberships = (membershipsData as { community_id: string, role: string }[]) || []
  if (memberships.length === 0) redirect('/setup')
  
  const activeCommunityId = await getActiveCommunityId(memberships)
  const activeMembership = memberships.find(m => m.community_id === activeCommunityId)
  const isAdmin = activeMembership?.role === 'ADMIN'

  // 👉 CORRECCIÓN: Ahora SÍ pedimos 'preferred_position' a la base de datos
  const { data: membersData } = await supabase
    .from('community_members')
    .select(`
      profile_id, alias, preferred_position,
      profiles ( avatar_url )
    `)
    .eq('community_id', activeCommunityId)

  // 👉 CORRECCIÓN: Se la pasamos al cliente
  const members = (membersData as any[])?.map(m => ({
    id: m.profile_id,
    alias: m.alias,
    position: m.preferred_position || 'N/A', 
    avatar: Array.isArray(m.profiles) ? m.profiles[0]?.avatar_url : m.profiles?.avatar_url
  })) || []

  const { data: rankingsData } = await supabase
    .from('community_rankings')
    .select('*')
    .eq('community_id', activeCommunityId)
    .order('created_at', { ascending: true })
  
  const initialRankings = (rankingsData as any[]) || []

  // 👉 BLINDAJE: Evitamos el error 'never' al mapear los IDs
  const { data: matchesData } = await supabase.from('matches').select('id').eq('community_id', activeCommunityId)
  const matchIds = (matchesData as { id: string }[])?.map(m => m.id) || []

  let evaluations: any[] = []
  let playerRecords: any[] = []

  if (matchIds.length > 0) {
    const { data: evals } = await supabase.from('match_evaluations').select('evaluated_id, is_mvp, rating').in('match_id', matchIds)
    evaluations = (evals as any[]) || [] // Blindado

    const { data: records } = await supabase.from('match_players').select('member_id, attendance, has_paid').in('match_id', matchIds)
    playerRecords = (records as any[]) || [] // Blindado
  }

  return (
    <div className="max-w-5xl mx-auto w-full space-y-12 pb-12 pt-8 px-4 md:px-8">
      
      <div className="bg-gray-900 rounded-3xl shadow-xl overflow-hidden relative border border-gray-800">
        <div className="absolute inset-0 opacity-20" style={{ background: 'linear-gradient(to bottom right, var(--color-primary, #3b82f6), transparent)' }}></div>
        <div className="p-8 md:p-10 relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left justify-between">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center transform -rotate-6"
              style={{ backgroundColor: 'var(--color-primary, #3b82f6)', boxShadow: '0 0 30px var(--color-primary, #3b82f6)' }}
            >
              <Trophy size={40} className="text-white fill-current" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter drop-shadow-md">
                Estadísticas Dinámicas
              </h1>
              <p className="text-gray-400 font-medium mt-2 text-base md:text-lg">
                Personaliza, edita y gestiona las métricas oficiales de tu plantilla.
              </p>
            </div>
          </div>
        </div>
      </div>

      <RankingsClient 
        communityId={activeCommunityId}
        isAdmin={isAdmin}
        members={members}
        initialRankings={initialRankings}
        evaluations={evaluations}
        playerRecords={playerRecords}
      />

    </div>
  )
}