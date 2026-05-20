import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { LogOut } from 'lucide-react'
import { getActiveCommunityId } from '@/lib/community'
import React from 'react' // Añadido para React.ReactNode

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, is_guest, alias')
    .eq('id', user.id)
    .single()

  if (!profileData) redirect('/setup')

  const profile = profileData as unknown as { id: string, is_guest: boolean, alias: string }
  const isGuest = profile.is_guest

  const { data: membershipsData } = await supabase
    .from('community_members')
    .select(`
      community_id,
      role,
      communities ( primary_color, secondary_color )
    `)
    .eq('profile_id', profile.id)

  const memberships = (membershipsData as any[]) || []

  if (!isGuest && memberships.length === 0) redirect('/setup')

  let primaryColor = '#2563eb'
  let secondaryColor = '#ffffff'

  if (!isGuest) {
    const activeCommunityId = await getActiveCommunityId(memberships)
    const activeMembership = memberships.find(m => m.community_id === activeCommunityId)

    if (activeMembership && activeMembership.communities) {
      const commData = Array.isArray(activeMembership.communities) 
        ? activeMembership.communities[0] 
        : activeMembership.communities;
        
      primaryColor = commData.primary_color || '#2563eb'
      secondaryColor = commData.secondary_color || '#ffffff'
    }
  }

  return (
    <div 
      className="min-h-screen bg-gray-50 flex flex-col md:flex-row transition-colors duration-500"
      style={{ 
        '--color-primary': primaryColor,
        '--color-secondary': secondaryColor 
      } as React.CSSProperties}
    >
      {!isGuest && <Sidebar />}

      <main className={`flex-1 overflow-y-auto ${!isGuest ? 'md:ml-64 pt-20 md:pt-0 pb-24 md:pb-0 p-4 md:p-8' : ''}`}>
        {isGuest && (
          <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow-md mb-8 sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-primary)] rounded-full flex items-center justify-center font-bold shadow-sm">
                {profile.alias?.charAt(0).toUpperCase() || 'G'}
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">{profile.alias || 'Invitado'}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Modo Invitado</p>
              </div>
            </div>
            <form action="/auth/signout" method="post">
              <button type="submit" className="flex items-center gap-2 bg-white/10 hover:bg-red-500 hover:text-white text-gray-300 px-4 py-2 rounded-xl text-sm font-bold transition-all">
                <LogOut size={16} /> Salir
              </button>
            </form>
          </header>
        )}

        <div className={`max-w-7xl mx-auto ${isGuest ? 'px-4 md:px-8 pb-8' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  )
}