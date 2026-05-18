import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, MapPin, Shield, Users, Euro, Clock, Info, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import MatchButtons from './MatchButtons'
import LineupManager from './LineupManager'
import { togglePayment, updateAttendance } from '@/actions/matches'

export default async function MatchDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await props.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // NUEVO: Obtenemos también is_guest
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, is_guest')
    .eq('id', user.id)
    .single()

  if (!profileData) redirect('/setup')
  const profileId = (profileData as { id: string }).id
  const isGuest = (profileData as { is_guest: boolean }).is_guest

  const { data: matchData } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (!matchData) return <div className="p-8 text-center font-medium text-gray-500">Partido no encontrado</div>
  const match = matchData as any

  const { data: membershipData } = await supabase
    .from('community_members')
    .select('role')
    .eq('profile_id', profileId)
    .eq('community_id', match.community_id)
    .single()

  const membership = membershipData as { role: string } | null
  const isAdmin = membership?.role === 'ADMIN'

  const { data: participants } = await supabase
    .from('match_players')
    .select(`
      member_id,
      team,
      has_paid,
      attendance,
      profiles (
        alias,
        community_members ( alias, preferred_position, community_id )
      )
    `)
    .eq('match_id', matchId)

  const players = (participants as any[])?.map(p => {
    const communityInfo = p.profiles?.community_members?.find(
      (m: any) => m.community_id === match.community_id
    )
    return {
      member_id: p.member_id,
      team: p.team,
      has_paid: p.has_paid || false,
      attendance: p.attendance || 'PENDING',
      alias: communityInfo?.alias || p.profiles?.alias || 'Jugador',
      position: communityInfo?.preferred_position || 'N/A',
      rating: Math.floor(Math.random() * (10 - 5 + 1)) + 5 
    }
  }) || []

  const isJoined = players.some(p => p.member_id === profileId)
  const maxPlayers = match.maxPlayers || 14
  const isFull = players.length >= maxPlayers
  const hasTeams = players.some(p => p.team !== null && p.team !== '')

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--color-primary)] to-gray-900 p-8 text-white">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <Shield size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter">Fútbol {match.match_type}</h1>
              <p className="text-gray-200 flex items-center gap-2 mt-1 italic font-medium">
                <MapPin size={16} /> {match.match_location}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 grid grid-cols-2 lg:grid-cols-4 gap-8 bg-gray-50/50 border-b border-gray-100">
           <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12}/> Fecha</span>
            <p className="text-lg font-bold text-gray-900">{match.match_date}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest flex items-center gap-1.5"><Clock size={12}/> Hora</span>
            <p className="text-lg font-bold text-gray-900">{match.match_time} h</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Users size={12}/> Aforo máximo</span>
            <p className="text-lg font-bold text-gray-900">{maxPlayers} Jugadores</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Euro size={12}/> Coste</span>
            <p className="text-lg font-bold text-gray-900">{match.match_price > 0 ? `${match.match_price}€` : 'Gratis'}</p>
          </div>
        </div>

        <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full animate-pulse ${isFull ? 'bg-red-500' : 'bg-green-500'}`} />
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-tight">Estado de convocatoria</p>
              <p className="text-2xl font-black text-gray-900">{players.length} <span className="text-gray-300 font-light">/</span> {maxPlayers}</p>
            </div>
          </div>
          
          {/* NUEVO: Pasamos las props correctas al componente MatchButtons */}
          <MatchButtons 
            matchId={matchId} 
            isJoined={isJoined} 
            isFull={isFull} 
            isAdmin={isAdmin} 
            hasTeams={hasTeams}
            status={match.status || 'OPEN'}
            isGuest={isGuest}
            players={players}
            currentUserId={profileId}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className={`${isAdmin && isFull ? 'lg:col-span-12' : 'lg:col-span-12'} space-y-6`}>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="text-[var(--color-primary)]" size={20} /> Convocados
              </h2>
            </div>

            <div className="space-y-3">
              {players.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                  <p className="text-gray-400 text-sm font-medium">No hay jugadores inscritos</p>
                </div>
              ) : (
                players.map((p, idx) => (
                  <div key={p.member_id} className="group flex items-center gap-4 p-3 rounded-2xl border border-gray-50 bg-gray-50/30 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all">
                    <span className="text-xs font-black text-gray-300 w-4">{idx + 1}</span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 leading-tight">{p.alias}</p>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-500`}>{p.position}</span>
                    </div>

                    {isAdmin && match.status !== 'CLOSED' ? (
                      <div className="flex items-center gap-3 border-l border-gray-100 pl-4">
                        <form action={async () => {
                          "use server"
                          const nextStatus = p.attendance === 'PENDING' ? 'ON_TIME' : p.attendance === 'ON_TIME' ? 'LATE' : p.attendance === 'LATE' ? 'NO_SHOW' : 'PENDING'
                          await updateAttendance(matchId, p.member_id, nextStatus)
                        }}>
                          <button type="submit" className={`p-2 rounded-lg transition-colors flex items-center justify-center ${p.attendance === 'ON_TIME' ? 'bg-green-100 text-green-700' : p.attendance === 'LATE' ? 'bg-orange-100 text-orange-700' : p.attendance === 'NO_SHOW' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`} title="Cambiar asistencia">
                            {p.attendance === 'ON_TIME' ? <CheckCircle2 size={18} /> : p.attendance === 'LATE' ? <Clock size={18} /> : p.attendance === 'NO_SHOW' ? <XCircle size={18} /> : <AlertTriangle size={18} />}
                          </button>
                        </form>

                        <form action={async () => {
                          "use server"
                          await togglePayment(matchId, p.member_id, p.has_paid)
                        }}>
                          <button type="submit" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${p.has_paid ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}>
                            <Euro size={14} /> {p.has_paid ? 'Pagado' : 'Pendiente'}
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {p.has_paid && <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold border border-emerald-100">PAGADO</span>}
                        {p.team && <div className={`px-3 py-1 rounded-lg text-[10px] font-black border-2 shadow-sm ${p.team === 'BLANCO' ? 'bg-white text-gray-900 border-gray-200' : 'bg-gray-900 text-white border-gray-800'}`}>{p.team}</div>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {isAdmin && isFull && match.status !== 'CLOSED' && (
          <div className="lg:col-span-12">
            <LineupManager matchId={matchId} initialPlayers={players} />
          </div>
        )}

      </div>
    </div>
  )
}