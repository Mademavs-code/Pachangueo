import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveCommunityId } from '@/lib/community'
import TablonClient from './TablonClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('is_guest').eq('id', user.id).single()
  const profile = profileData as { is_guest: boolean } | null
  
  if (profile?.is_guest) {
    const { data: matchInfoData } = await (supabase.from('match_players') as any).select('match_id').eq('member_id', user.id).limit(1).single()
    const matchInfo = matchInfoData as { match_id: string } | null
    if (matchInfo) redirect(`/matches/${matchInfo.match_id}`)
    else redirect('/login')
  }

  const { data: membershipsData } = await supabase
    .from('community_members')
    .select('community_id, role')
    .eq('profile_id', user.id) 

  const memberships = (membershipsData as { community_id: string, role: string }[]) || []
  if (memberships.length === 0) redirect('/setup')

  const activeCommunityId = await getActiveCommunityId(memberships)
  const activeMembership = memberships.find(m => m.community_id === activeCommunityId)
  const isAdmin = activeMembership?.role === 'ADMIN'

  const limitDate = new Date().toISOString()
  
  const { data: postsData } = await supabase
    .from('posts')
    .select(`
      id, content, created_at, expires_at, image_url,
      author:profiles!posts_author_id_fkey ( alias, avatar_url )
    `)
    .eq('community_id', activeCommunityId)
    .eq('post_type', 'ANUNCIO')
    .or(`expires_at.is.null,expires_at.gt.${limitDate}`)
    .order('created_at', { ascending: false })

  const posts = (postsData as any[]) || []

  return (
    <TablonClient 
      posts={posts} 
      isAdmin={isAdmin} 
      activeCommunityId={activeCommunityId} 
    />
  )
}