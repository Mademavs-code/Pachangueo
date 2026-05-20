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

  // NUEVA LÓGICA MULTICOMUNIDAD
const { data: membershipsData } = await supabase
    .from('community_members')
    .select('community_id, role')
    .eq('profile_id', profile.id)

  const memberships = (membershipsData as { community_id: string, role: string }[]) || []

  if (memberships.length === 0) redirect('/setup')

  const activeCommunityId = await getActiveCommunityId(memberships)
  const activeMembership = memberships.find(m => m.community_id === activeCommunityId)
  const isAdmin = activeMembership?.role === 'ADMIN'

  // Pedimos los miembros de la comunidad ACTIVA
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

  const members = (membersData as any[])?.map(m => {
    const profileInfo = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    
    return {
      profile_id: m.profile_id,
      role: m.role,
      alias: m.alias,
      position: m.preferred_position || 'N/A',
      is_guest: profileInfo?.is_guest || false,
      avatar_url: profileInfo?.avatar_url || null 
    }
  }) || []

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