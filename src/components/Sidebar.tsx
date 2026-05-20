"use client" 

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, Trophy, Users, Settings, LogOut, BarChart3, ChevronDown, Check } from 'lucide-react'
import { setActiveCommunity } from '@/actions/communities'

interface Community { id: string; name: string; }
interface Membership { role: string; community_id: string; communities: Community | null; }
interface Profile { id: string; alias: string | null; }

export default function Sidebar() {
  const pathname = usePathname()
  
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  // Ahora guardamos la lista completa de membresías
  const [memberships, setMemberships] = useState<Membership[]>([])
  // Y cuál es la que está activa actualmente
  const [activeMembership, setActiveMembership] = useState<Membership | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      const { data: profileData } = await supabase.from('profiles').select('id, alias').eq('id', user.id).single()
      setProfile(profileData as Profile | null)

      // 1. Obtenemos TODAS las comunidades del usuario (sin .limit(1))
      const { data: membershipsData } = await supabase
        .from('community_members')
        .select(`role, community_id, communities:community_id ( id, name )`)
        .eq('profile_id', user.id)
      
      const allMemberships = (membershipsData as unknown as Membership[]) || []
      setMemberships(allMemberships)

      // 2. Leemos la cookie para saber cuál marcar como activa visualmente
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('pachangueo_active_community='))
        ?.split('=')[1]

      if (cookieValue) {
        const found = allMemberships.find(m => m.community_id === cookieValue)
        if (found) {
          setActiveMembership(found)
          return
        }
      }
      
      // Si no hay cookie, ponemos la primera por defecto
      if (allMemberships.length > 0) setActiveMembership(allMemberships[0])
    }
    loadData()
  }, [])

  async function handleSwitchCommunity(communityId: string) {
    if (activeMembership?.community_id === communityId) {
      setIsDropdownOpen(false)
      return
    }
    // Llamamos a la Server Action para actualizar la cookie
    await setActiveCommunity(communityId)
    // Recargamos la ventana para asegurar que todo el Layout agarra los nuevos colores
    window.location.reload()
  }

  if (!user) return null

  const activeCommunity = activeMembership?.communities

  return (
    <aside className="w-64 bg-[#0a0f1c] text-white min-h-screen flex flex-col fixed left-0 top-0 z-50 border-r border-slate-800/50 shadow-2xl">
      
      {/* Brillo superior usando color-mix */}
      <div 
        className="absolute top-0 left-0 w-full h-96 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle at top left, color-mix(in srgb, var(--color-primary) 15%, transparent), transparent 70%)' }}
      ></div>

      {/* Selector de Comunidad Múltiple */}
      <div className="p-6 border-b border-slate-800/60 relative z-20">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Tu Comunidad</p>
        
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between group transition-all duration-300"
            style={{ '--hover-border': 'var(--color-primary)' } as React.CSSProperties}
          >
            <style jsx>{`button:hover { border-color: var(--hover-border); box-shadow: 0 0 15px color-mix(in srgb, var(--color-primary) 10%, transparent); }`}</style>
            <div className="flex items-center gap-3 overflow-hidden">
              <div 
                className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-xs text-white shadow-sm"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {activeCommunity?.name?.charAt(0) || '?'}
              </div>
              <span className="font-bold truncate text-sm text-slate-200">
                {activeCommunity?.name || 'Sin comunidad'}
              </span>
            </div>
            <ChevronDown size={16} className={`text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Menú Desplegable */}
          {isDropdownOpen && memberships.length > 1 && (
            <>
              {/* Overlay invisible para cerrar al clicar fuera */}
              <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
              
              <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden">
                {memberships.map((m) => (
                  <button
                    key={m.community_id}
                    onClick={() => handleSwitchCommunity(m.community_id)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-0"
                  >
                    <div className="w-6 h-6 rounded flex items-center justify-center font-black text-[10px] text-white bg-slate-700">
                      {m.communities?.name?.charAt(0)}
                    </div>
                    <span className={`text-sm flex-1 truncate ${activeMembership?.community_id === m.community_id ? 'font-bold text-white' : 'font-medium text-slate-400'}`}>
                      {m.communities?.name}
                    </span>
                    {activeMembership?.community_id === m.community_id && (
                      <Check size={16} style={{ color: 'var(--color-primary)' }} />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 mt-2 relative z-10">
        <NavLink href="/" icon={<Home size={18} />} label="Tablón" currentPath={pathname} />
        <NavLink href="/matches" icon={<Trophy size={18} />} label="Partidos" currentPath={pathname} />
        <NavLink href="/members" icon={<Users size={18} />} label="Plantilla" currentPath={pathname} />
        <NavLink href="/rankings" icon={<BarChart3 size={18} />} label="Estadísticas" currentPath={pathname} />
        
        {activeMembership?.role === 'ADMIN' && (
          <div className="pt-6 mt-6 border-t border-slate-800/60">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-3">Administración</p>
            <NavLink href="/settings" icon={<Settings size={18} />} label="Configuración" currentPath={pathname} />
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800/60 bg-slate-950/40 relative z-10">
        <div className="flex items-center gap-3 p-2">
          <div 
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white shadow-lg border border-white/10"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), #1e293b)' }}
          >
            {profile?.alias?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate text-slate-200">{profile?.alias || 'Usuario'}</p>
            <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        
        <form action="/auth/signout" method="post" className="mt-2">
          <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/5 text-red-500 hover:bg-red-500/10 hover:shadow-[0_0_15px_rgba(239,68,68,0.1)] text-xs font-bold transition-all border border-transparent hover:border-red-500/20">
            <LogOut size={14} /> Cerrar Sesión
          </button>
        </form>
      </div>
    </aside>
  )
}

function NavLink({ href, icon, label, currentPath }: { href: string; icon: React.ReactNode; label: string; currentPath: string }) {
  const isActive = currentPath === href || (href !== '/' && currentPath.startsWith(href))

  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group border ${
        isActive ? 'text-white shadow-sm backdrop-blur-sm' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
      }`}
      style={{
        backgroundColor: isActive ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : undefined,
        borderColor: isActive ? 'color-mix(in srgb, var(--color-primary) 30%, transparent)' : undefined,
      }}
    >
      <span 
        className="transition-transform duration-300 group-hover:scale-110"
        style={{ color: isActive ? 'var(--color-primary)' : 'inherit' }}
      >
        {icon}
      </span>
      <span className={`text-sm ${isActive ? 'font-black' : 'font-semibold'}`}>{label}</span>
    </Link>
  )
}