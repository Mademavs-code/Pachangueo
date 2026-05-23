"use client" 

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { Home, Trophy, Users, Settings, LogOut, BarChart3, ChevronDown, Check, Plus } from 'lucide-react'
import { setActiveCommunity } from '@/actions/communities'

interface Community { id: string; name: string; }
interface Membership { role: string; community_id: string; communities: Community | null; }
interface Profile { id: string; alias: string | null; avatar_url: string | null; }

export default function Sidebar() {
  const pathname = usePathname()
  
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [activeMembership, setActiveMembership] = useState<Membership | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      const { data: profileData } = await supabase.from('profiles').select('id, alias, avatar_url').eq('id', user.id).single()
      setProfile(profileData as Profile | null)

      const { data: membershipsData } = await supabase
        .from('community_members')
        .select(`role, community_id, communities:community_id ( id, name )`)
        .eq('profile_id', user.id)
      
      const allMemberships = (membershipsData as unknown as Membership[]) || []
      setMemberships(allMemberships)

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
      
      if (allMemberships.length > 0) setActiveMembership(allMemberships[0])
    }
    loadData()
  }, [])

  async function handleSwitchCommunity(communityId: string) {
    if (activeMembership?.community_id === communityId) {
      setIsDropdownOpen(false)
      return
    }
    await setActiveCommunity(communityId)
    window.location.reload()
  }

  if (!user) return null

  const activeCommunity = activeMembership?.communities

  return (
    <>
      {/* 1. SIDEBAR DE ESCRITORIO */}
      <aside className="hidden md:flex w-64 bg-[#0a0f1c] text-white min-h-screen flex-col fixed left-0 top-0 z-50 border-r border-slate-800/50 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-96 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle at top left, color-mix(in srgb, var(--color-primary) 15%, transparent), transparent 70%)' }}></div>

        <div className="p-6 border-b border-slate-800/60 relative z-20">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Tu Comunidad</p>
          <div className="relative">
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between group transition-all duration-300 hover:border-[var(--color-primary)]">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-xs text-white shadow-sm" style={{ backgroundColor: 'var(--color-primary)' }}>
                  {activeCommunity?.name?.charAt(0) || '?'}
                </div>
                <span className="font-bold truncate text-sm text-slate-200">{activeCommunity?.name || 'Sin comunidad'}</span>
              </div>
              <ChevronDown size={16} className={`text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Menú Desplegable de Comunidades (Desktop) */}
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden">
                  
                  <div className="max-h-48 overflow-y-auto">
                    {memberships.map((m) => (
                      <button key={m.community_id} onClick={() => handleSwitchCommunity(m.community_id)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors border-b border-slate-800/50">
                        <div className="w-6 h-6 rounded flex items-center justify-center font-black text-[10px] text-white bg-slate-700 shrink-0">{m.communities?.name?.charAt(0)}</div>
                        <span className={`text-sm flex-1 truncate ${activeMembership?.community_id === m.community_id ? 'font-bold text-white' : 'font-medium text-slate-400'}`}>{m.communities?.name}</span>
                        {activeMembership?.community_id === m.community_id && <Check size={16} style={{ color: 'var(--color-primary)' }} className="shrink-0" />}
                      </button>
                    ))}
                  </div>

                  {/* NUEVO: Botón para crear/unirse a otra comunidad */}
                  <Link href="/setup" onClick={() => setIsDropdownOpen(false)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors bg-slate-900/80 group">
                    <div className="w-6 h-6 rounded flex items-center justify-center font-black text-slate-400 group-hover:text-white bg-slate-800 group-hover:bg-[var(--color-primary)] transition-all shrink-0">
                      <Plus size={14} />
                    </div>
                    <span className="text-sm flex-1 truncate font-medium text-slate-400 group-hover:text-white transition-colors">Crea tu comunidad</span>
                  </Link>

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
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg border border-white/10 overflow-hidden shrink-0" style={!profile?.avatar_url ? { background: 'linear-gradient(135deg, var(--color-primary), #1e293b)' } : undefined}>
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : (profile?.alias?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase())}
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

      {/* 2. NAVEGACIÓN MÓVIL */}
      <header className="md:hidden fixed top-0 left-0 w-full bg-[#0a0f1c]/95 backdrop-blur-xl border-b border-slate-800/60 z-50 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="relative flex-1 max-w-[65%]">
          <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/50 rounded-xl px-3 py-2 w-full">
            <div className="w-6 h-6 rounded flex items-center justify-center font-black text-[10px] text-white shadow-sm shrink-0" style={{ backgroundColor: 'var(--color-primary)' }}>
              {activeCommunity?.name?.charAt(0) || '?'}
            </div>
            <span className="font-bold truncate text-xs text-slate-200">{activeCommunity?.name || 'Comunidad'}</span>
            <ChevronDown size={14} className={`text-slate-500 ml-auto transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Menú Desplegable de Comunidades (Móvil) */}
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
              <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden">
                <div className="max-h-48 overflow-y-auto">
                  {memberships.map((m) => (
                    <button key={m.community_id} onClick={() => handleSwitchCommunity(m.community_id)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors border-b border-slate-800/50">
                      <div className="w-5 h-5 rounded flex items-center justify-center font-black text-[9px] text-white bg-slate-700 shrink-0">{m.communities?.name?.charAt(0)}</div>
                      <span className={`text-xs flex-1 truncate ${activeMembership?.community_id === m.community_id ? 'font-bold text-white' : 'font-medium text-slate-400'}`}>{m.communities?.name}</span>
                      {activeMembership?.community_id === m.community_id && <Check size={14} style={{ color: 'var(--color-primary)' }} className="shrink-0" />}
                    </button>
                  ))}
                </div>

                {/* NUEVO: Botón para crear/unirse a otra comunidad (Móvil) */}
                <Link href="/setup" onClick={() => setIsDropdownOpen(false)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors bg-slate-900/80 group">
                  <div className="w-5 h-5 rounded flex items-center justify-center font-black text-slate-400 bg-slate-800 shrink-0">
                    <Plus size={12} />
                  </div>
                  <span className="text-xs flex-1 truncate font-medium text-slate-400">Crear / Unirse a otra</span>
                </Link>

              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {activeMembership?.role === 'ADMIN' && (
            <Link href="/settings" className="p-2.5 text-slate-400 hover:text-white bg-slate-900/50 rounded-xl border border-slate-700/50 transition-colors">
              <Settings size={18} />
            </Link>
          )}
          <form action="/auth/signout" method="post">
            <button type="submit" className="p-2.5 text-red-500 hover:text-red-400 bg-red-500/10 rounded-xl border border-red-500/20 transition-colors">
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#0a0f1c]/95 backdrop-blur-xl border-t border-slate-800/60 z-50 flex items-center justify-around pb-4 pt-2 px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
        <MobileNavLink href="/" icon={<Home size={22} />} label="Tablón" currentPath={pathname} />
        <MobileNavLink href="/matches" icon={<Trophy size={22} />} label="Partidos" currentPath={pathname} />
        <MobileNavLink href="/members" icon={<Users size={22} />} label="Plantilla" currentPath={pathname} />
        <MobileNavLink href="/rankings" icon={<BarChart3 size={22} />} label="Top" currentPath={pathname} />
      </nav>
    </>
  )
}

function NavLink({ href, icon, label, currentPath }: { href: string; icon: React.ReactNode; label: string; currentPath: string }) {
  const isActive = currentPath === href || (href !== '/' && currentPath.startsWith(href))
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group border ${isActive ? 'text-white shadow-sm backdrop-blur-sm' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`} style={{ backgroundColor: isActive ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : undefined, borderColor: isActive ? 'color-mix(in srgb, var(--color-primary) 30%, transparent)' : undefined }}>
      <span className="transition-transform duration-300 group-hover:scale-110" style={{ color: isActive ? 'var(--color-primary)' : 'inherit' }}>{icon}</span>
      <span className={`text-sm ${isActive ? 'font-black' : 'font-semibold'}`}>{label}</span>
    </Link>
  )
}

function MobileNavLink({ href, icon, label, currentPath }: { href: string; icon: React.ReactNode; label: string; currentPath: string }) {
  const isActive = currentPath === href || (href !== '/' && currentPath.startsWith(href))
  return (
    <Link href={href} className="flex flex-col items-center gap-1 p-2 min-w-[64px]">
      <span className="transition-transform duration-300" style={{ color: isActive ? 'var(--color-primary)' : '#64748b', transform: isActive ? 'scale(1.1)' : 'scale(1)' }}>{icon}</span>
      <span className="text-[10px] font-bold" style={{ color: isActive ? 'white' : '#64748b' }}>{label}</span>
    </Link>
  )
}