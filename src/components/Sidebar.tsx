import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Home, Trophy, Users, Settings, LogOut } from 'lucide-react'

// 1. Definimos las interfaces
interface Community {
  id: string;
  name: string;
}

interface Membership {
  role: string;
  community_id: string;
  communities: Community | null; 
}

interface Profile {
  id: string;
  alias: string | null;
}

export default async function Sidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // 2. Obtener el perfil
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, alias')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null

  // 3. Obtener membresías
  const { data: membershipsData } = await supabase
    .from('community_members')
    .select(`
      role,
      community_id,
      communities:community_id ( id, name )
    `)
    .eq('profile_id', user.id)

  const memberships = (membershipsData as unknown as Membership[]) || []
  
  const activeMembership = memberships[0]
  const activeCommunity = activeMembership?.communities

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col fixed left-0 top-0 z-50 border-r border-gray-800">
      
      {/* Selector de Comunidad */}
      <div className="p-6 border-b border-gray-800">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Tu Comunidad</p>
        {/* Cambiamos el borde hover por la variable primaria */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex items-center justify-between group cursor-pointer hover:border-[var(--color-primary)] transition-all">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Cambiamos bg-blue-600 por la variable dinámica */}
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex-shrink-0 flex items-center justify-center font-black text-xs text-white shadow-sm">
              {activeCommunity?.name?.charAt(0) || '?'}
            </div>
            <span className="font-bold truncate text-sm">
              {activeCommunity?.name || 'Sin comunidad'}
            </span>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-4 space-y-1 mt-2">
        <NavLink href="/" icon={<Home size={18} />} label="Tablón" />
        <NavLink href="/matches" icon={<Trophy size={18} />} label="Partidos" />
        <NavLink href="/members" icon={<Users size={18} />} label="Jugadores" />
        
        {activeMembership?.role === 'ADMIN' && (
          <div className="pt-4 mt-4 border-t border-gray-800">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 px-3">Administración</p>
            <NavLink href="/settings" icon={<Settings size={18} />} label="Configuración" />
          </div>
        )}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-3 p-2">
          {/* Cambiamos el from-blue-600 por from-[var(--color-primary)] */}
          <div className="w-9 h-9 bg-gradient-to-tr from-[var(--color-primary)] to-gray-700 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
            {profile?.alias?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate">{profile?.alias || 'Usuario'}</p>
            <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
        
        <form action="/auth/signout" method="post" className="mt-2">
          <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/5 text-red-500 hover:bg-red-500/10 text-xs font-bold transition-all">
            <LogOut size={14} /> Cerrar Sesión
          </button>
        </form>
      </div>
    </aside>
  )
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
    >
      {/* Al pasar el ratón por encima, el icono coge el color principal */}
      <span className="group-hover:scale-110 group-hover:text-[var(--color-primary)] transition-all">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  )
}