import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, ArrowRight, Clock, MapPin, Users, Plus } from 'lucide-react'

export default async function MatchesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipData } = await supabase
    .from('community_members')
    .select('community_id, role')
    .eq('profile_id', user.id) 
    .single()

  if (!membershipData) redirect('/setup')
  const membership = membershipData as { community_id: string, role: string }
  const isAdmin = membership.role === 'ADMIN'

  // OBTENEMOS SOLO LOS POSTS DE TIPO PARTIDO
  const { data: matchesData } = await supabase
    .from('posts')
    .select(`
      id, content, match_id, created_at,
      author:profiles!posts_author_id_fkey ( alias )
    `)
    .eq('community_id', membership.community_id)
    .eq('post_type', 'PARTIDO') // <-- EL FILTRO CLAVE
    .order('created_at', { ascending: false })

  const matches = (matchesData as any[]) || []

  return (
    <div className="space-y-8 max-w-5xl mx-auto pt-4 px-2 md:px-4">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0f1c] p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--color-primary)] opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Calendar className="text-[var(--color-primary)]" size={32} /> Central de Partidos
          </h1>
          <p className="text-slate-400 font-medium mt-1">Apúntate, gestiona alineaciones y no te pierdas ninguna convocatoria.</p>
        </div>
        
        {isAdmin && (
          <Link 
            href="/matches/new" 
            className="relative z-10 inline-flex items-center justify-center gap-2 text-white px-6 py-3 rounded-2xl font-bold shadow-lg transition-all hover:scale-105"
            style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 4px 15px color-mix(in srgb, var(--color-primary) 40%, transparent)' }}
          >
            <Plus size={18} /> Crear Partido
          </Link>
        )}
      </div>

      {/* Feed de Partidos */}
      <div className="grid gap-6 md:grid-cols-2">
        {matches.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 text-gray-400 rounded-full mb-4">
              <Calendar size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No hay partidos a la vista</h3>
            <p className="text-gray-500 font-medium mt-1">Cuando el administrador organice una pachanga, aparecerá aquí.</p>
          </div>
        ) : (
          matches.map((match) => {
            const date = new Date(match.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })

            return (
              <div key={match.id} className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 flex flex-col hover:shadow-lg hover:border-[var(--color-primary)] transition-all group">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-primary)' }}></span>
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Convocatoria Abierta</span>
                  </div>
                  <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><Clock size={12}/> {date}</span>
                </div>

                <div className="text-gray-800 font-medium leading-relaxed mb-6 whitespace-pre-wrap flex-1">
                  {match.content}
                </div>

                {match.match_id && (
                  <Link 
                    href={`/matches/${match.match_id}`}
                    className="flex items-center justify-between w-full bg-gray-50 group-hover:bg-[var(--color-primary)] group-hover:text-white border border-gray-100 text-gray-700 px-5 py-4 rounded-2xl font-black transition-all"
                  >
                    <span className="flex items-center gap-2">Ver Detalles y Vestuario</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}