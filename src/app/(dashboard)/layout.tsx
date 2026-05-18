import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { LogOut } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Obtenemos el usuario de Auth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Buscamos el ID real de su perfil y si es INVITADO
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, is_guest, alias')
    .eq('id', user.id)
    .single()

  if (!profileData) {
    redirect('/setup')
  }

  const profile = profileData as unknown as { id: string, is_guest: boolean, alias: string }
  const isGuest = profile.is_guest

  // 3. Buscamos la comunidad y SUS COLORES
  const { data: membershipData } = await supabase
    .from('community_members')
    .select(`
      community_id,
      communities ( primary_color, secondary_color )
    `)
    .eq('profile_id', profile.id)
    .limit(1)
    .single()

  if (!membershipData) {
    redirect('/setup')
  }

  type CommunityData = { primary_color: string | null; secondary_color: string | null }
  const membership = membershipData as unknown as { community_id: string; communities: CommunityData }
  
  const primaryColor = membership.communities?.primary_color || '#2563eb'
  const secondaryColor = membership.communities?.secondary_color || '#ffffff'

  return (
    <div 
      className="min-h-screen bg-gray-50 flex flex-col md:flex-row"
      style={{ 
        '--color-primary': primaryColor,
        '--color-secondary': secondaryColor 
      } as React.CSSProperties}
    >
      
      {/* 🛡️ EL SIDEBAR SOLO SE MUESTRA A MIEMBROS REALES */}
      {!isGuest && <Sidebar />}

      {/* Contenedor principal */}
      <main className={`flex-1 overflow-y-auto ${!isGuest ? 'ml-64 p-4 md:p-8' : ''}`}>
        
        {/* 🛡️ CABECERA ESPECIAL SOLO PARA INVITADOS */}
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
            {/* Botón de cierre de sesión reutilizando tu ruta existente */}
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