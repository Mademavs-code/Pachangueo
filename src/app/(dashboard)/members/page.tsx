import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import MembersList from './MembersList'
import { getActiveCommunityId } from '@/lib/community'

export default async function MembersPage() {
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

  const { data: membersData, error } = await supabase
    .from('community_members')
    .select(`
      profile_id,
      role,
      alias,
      preferred_position,
      profiles ( is_guest, avatar_url )
    `)
    .eq('community_id', activeCommunityId)
    .order('role', { ascending: true })

  if (error) console.error("Error cargando jugadores:", error.message)

  const { data: matches } = await supabase.from('matches').select('id').eq('community_id', activeCommunityId)
  const matchIds = (matches as { id: string }[])?.map(m => m.id) || []

  let evaluations: any[] = []
  let playerRecords: any[] = []

  if (matchIds.length > 0) {
    const { data: evals } = await supabase.from('match_evaluations').select('evaluator_id, evaluated_id, rating, is_mvp').in('match_id', matchIds)
    evaluations = (evals as any[]) || [] 
    
    const { data: recs } = await supabase.from('match_players').select('member_id, attendance, has_paid').in('match_id', matchIds)
    playerRecords = (recs as any[]) || [] 
  }

  const statsMap: Record<string, { matches: number, mvps: number, totalRating: number, ratingCount: number, lates: number, noShows: number, debts: number }> = {}
  
  ;(membersData as any[])?.forEach(m => {
    statsMap[m.profile_id] = { matches: 0, mvps: 0, totalRating: 0, ratingCount: 0, lates: 0, noShows: 0, debts: 0 }
  })

  evaluations.forEach(ev => {
    if (ev.evaluator_id === ev.evaluated_id) return; // 👉 NUEVO: Ocultamos las autoevaluaciones del histórico global
    if (statsMap[ev.evaluated_id]) {
      if (ev.is_mvp) statsMap[ev.evaluated_id].mvps++
      statsMap[ev.evaluated_id].totalRating += ev.rating
      statsMap[ev.evaluated_id].ratingCount++
    }
  })

  playerRecords.forEach(rec => {
    if (statsMap[rec.member_id]) {
      statsMap[rec.member_id].matches++
      if (rec.attendance === 'LATE') statsMap[rec.member_id].lates++
      if (rec.attendance === 'NO_SHOW') statsMap[rec.member_id].noShows++
      if (!rec.has_paid) statsMap[rec.member_id].debts++
    }
  })

  // 👉 NUEVO: Lógica de Fusión para invitados clonados
  const finalMembersMap = new Map();

  (membersData as any[])?.forEach(m => {
    const profileInfo = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    const s = statsMap[m.profile_id]
    const avgRating = s.ratingCount > 0 ? Number((s.totalRating / s.ratingCount).toFixed(1)) : 0

    const memberObj = {
      profile_id: m.profile_id,
      role: m.role,
      alias: m.alias,
      position: m.preferred_position || 'N/A',
      is_guest: profileInfo?.is_guest || false,
      avatar_url: profileInfo?.avatar_url || null,
      stats: {
        matches: s.matches,
        mvps: s.mvps,
        avg_rating: avgRating,
        lates: s.lates,
        no_shows: s.noShows,
        debts: s.debts,
        _ratingCount: s.ratingCount, // Interno para poder sumar medias matemáticas después
        _totalRating: s.totalRating
      }
    }

    if (memberObj.is_guest) {
      const key = memberObj.alias.toLowerCase().trim();
      if (finalMembersMap.has(key)) {
        // ¡Se ha encontrado un clon! Lo fusionamos.
        const existing = finalMembersMap.get(key);
        existing.stats.matches += memberObj.stats.matches;
        existing.stats.mvps += memberObj.stats.mvps;
        existing.stats.lates += memberObj.stats.lates;
        existing.stats.no_shows += memberObj.stats.no_shows;
        existing.stats.debts += memberObj.stats.debts;
        
        // Calculamos la nueva media real
        existing.stats._totalRating += memberObj.stats._totalRating;
        existing.stats._ratingCount += memberObj.stats._ratingCount;
        existing.stats.avg_rating = existing.stats._ratingCount > 0 
          ? Number((existing.stats._totalRating / existing.stats._ratingCount).toFixed(1)) 
          : 0;
      } else {
        finalMembersMap.set(key, memberObj);
      }
    } else {
      finalMembersMap.set(memberObj.profile_id, memberObj);
    }
  });

  const members = Array.from(finalMembersMap.values());

  members.sort((a, b) => {
    if (a.role === b.role) return a.alias.localeCompare(b.alias);
    return 0;
  });

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--color-primary)] to-gray-900 p-8 text-white flex items-center gap-5">
          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
            <Users size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Plantilla Oficial</h1>
            <p className="text-gray-200 font-medium mt-1">Conoce a los {members.length} jugadores de la comunidad</p>
          </div>
        </div>
      </div>

      <MembersList 
        members={members} 
        isAdmin={isAdmin} 
        currentUserId={profile.id}
        communityId={activeCommunityId}
      />
    </div>
  )
}