import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, MapPin, Shield, Users, Euro, Clock, CheckCircle2, XCircle, AlertTriangle, Trophy, Star } from 'lucide-react'
import MatchButtons from './MatchButtons'
import LineupManager from './LineupManager'
import { togglePayment, updateAttendance } from '@/actions/matches'

export default async function MatchDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await props.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('id, is_guest').eq('id', user.id).single()

  if (!profileData) redirect('/setup')
  const profileId = (profileData as { id: string }).id
  const isGuest = (profileData as { is_guest: boolean }).is_guest

  const { data: matchData } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (!matchData) return <div className="p-8 text-center font-medium text-gray-500">Partido no encontrado</div>
  const match = matchData as any

  const rawDate = match.match_date || ''
  const formattedDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate
  const formattedTime = match.match_time ? match.match_time.substring(0, 5) : ''

  const { data: membershipData } = await supabase.from('community_members').select('role').eq('profile_id', profileId).eq('community_id', match.community_id).single()
  const membership = membershipData as { role: string } | null
  const isAdmin = membership?.role === 'ADMIN'

  const { data: participants } = await supabase
    .from('match_players')
    .select(`member_id, team, has_paid, attendance, profiles ( alias, avatar_url, community_members ( alias, preferred_position, community_id ) )`)
    .eq('match_id', matchId)

  const playerIds = (participants as any[])?.map(p => p.member_id) || []
  let allTimeEvaluations: any[] = []
  
  if (playerIds.length > 0) {
    const { data: evalsData } = await supabase.from('match_evaluations').select('evaluated_id, rating').in('evaluated_id', playerIds)
    allTimeEvaluations = evalsData || []
  }

  const playerStats: Record<string, { totalRating: number; count: number }> = {}
  playerIds.forEach(id => playerStats[id] = { totalRating: 0, count: 0 })

  allTimeEvaluations.forEach(ev => {
    if (playerStats[ev.evaluated_id]) {
      playerStats[ev.evaluated_id].totalRating += ev.rating
      playerStats[ev.evaluated_id].count += 1
    }
  })

  const { data: matchEvalsData } = await supabase.from('match_evaluations').select('*').eq('match_id', matchId)
  const matchEvaluations = (matchEvalsData as any[]) || []
  const hasVoted = matchEvaluations.some(e => e.evaluator_id === profileId)

  const players = (participants as any[])?.map(p => {
    const profileInfo = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    const communityInfo = profileInfo?.community_members?.find((m: any) => m.community_id === match.community_id)
    
    const stats = playerStats[p.member_id]
    const finalRating = stats.count > 0 ? Number((stats.totalRating / stats.count).toFixed(1)) : 5

    const evalsForMeThisMatch = matchEvaluations.filter(e => e.evaluated_id === p.member_id)
    const matchMvpVotes = evalsForMeThisMatch.filter(e => e.is_mvp).length
    const matchAvgRating = evalsForMeThisMatch.length > 0 ? Number((evalsForMeThisMatch.reduce((acc, curr) => acc + curr.rating, 0) / evalsForMeThisMatch.length).toFixed(1)) : 0

    return {
      member_id: p.member_id, team: p.team, has_paid: p.has_paid || false, attendance: p.attendance || 'PENDING',
      alias: communityInfo?.alias || profileInfo?.alias || 'Jugador', avatar_url: profileInfo?.avatar_url || null,
      position: communityInfo?.preferred_position || 'N/A', rating: finalRating, matchMvpVotes, matchAvgRating
    }
  }) || []

  const matchResults = [...players].sort((a, b) => b.matchMvpVotes - a.matchMvpVotes || b.matchAvgRating - a.matchAvgRating)
  const mvp = matchResults.length > 0 && matchResults[0].matchMvpVotes > 0 ? matchResults[0] : null

  const isJoined = players.some(p => p.member_id === profileId)
  const maxPlayers = match.maxPlayers || 14
  const isFull = players.length >= maxPlayers
  const hasTeams = players.some(p => p.team !== null && p.team !== '')

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      
      {/* SECCIÓN RESULTADOS (ADAPTADO AL COLOR DEL CLUB) */}
      {match.status === 'CLOSED' && (hasVoted || isAdmin) && matchEvaluations.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 md:p-8 relative overflow-hidden mb-8">
          {/* Brillo de fondo con el color de la comunidad */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] blur-[100px] pointer-events-none opacity-10" style={{ backgroundColor: 'var(--color-primary)' }}></div>
          
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 mb-8 relative z-10">
            <Trophy size={28} style={{ color: 'var(--color-primary)' }} /> Resultados del Partido
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
            {/* Tarjeta del MVP */}
            {mvp ? (
              <div 
                className="rounded-3xl border p-6 flex flex-col items-center justify-center text-center shadow-sm"
                style={{ 
                  borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
                  background: 'linear-gradient(to bottom, color-mix(in srgb, var(--color-primary) 5%, white), white)'
                }}
              >
                <p className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                  <Trophy size={14}/> MVP del Partido
                </p>
                {mvp.avatar_url ? (
                  <img src={mvp.avatar_url} alt={mvp.alias} className="w-24 h-24 rounded-full border-4 shadow-md mb-4 object-cover" style={{ borderColor: 'var(--color-primary)' }} />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 bg-gray-50 flex items-center justify-center text-3xl font-black mb-4 shadow-md" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                    {mvp.alias.charAt(0)}
                  </div>
                )}
                <h3 className="text-3xl font-black text-gray-900">{mvp.alias}</h3>
                <div className="flex gap-3 mt-4">
                  <span className="font-bold px-4 py-2 rounded-xl text-sm border shadow-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)', borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}>
                    {mvp.matchMvpVotes} Votos
                  </span>
                  <span className="bg-gray-100 text-gray-600 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1 border border-gray-200">
                    <Star size={14} className="fill-current text-gray-400"/> {mvp.matchAvgRating}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-3xl border border-dashed border-gray-200 p-6 flex items-center justify-center text-gray-400 font-medium">Aún no hay votos MVP.</div>
            )}

            {/* Resto de calificaciones */}
            <div className="space-y-3">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Mejores Puntuaciones</p>
              {matchResults.slice(0, 5).map((p, idx) => {
                if (p.matchAvgRating === 0) return null;
                return (
                  <div key={p.member_id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all hover:border-gray-200">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-black text-sm w-4">{idx + 1}</span>
                      <span className="font-bold text-gray-900">{p.alias}</span>
                    </div>
                    <span 
                      className="font-black px-3 py-1 rounded-lg border shadow-sm"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)', borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}
                    >
                      {p.matchAvgRating} pts
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* CABECERA NORMAL DEL PARTIDO */}
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
            <p className="text-lg font-bold text-gray-900">{formattedDate}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest flex items-center gap-1.5"><Clock size={12}/> Hora</span>
            <p className="text-lg font-bold text-gray-900">{formattedTime} h</p>
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
          
          <MatchButtons 
            matchId={matchId} isJoined={isJoined} isFull={isFull} isAdmin={isAdmin} hasTeams={hasTeams}
            status={match.status || 'OPEN'} isGuest={isGuest} players={players} currentUserId={profileId}
            match={{...match, match_date: formattedDate, match_time: formattedTime}} hasVoted={hasVoted}
          />
        </div>
      </div>

      {/* LISTA DE CONVOCADOS */}
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
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{p.position}</span>
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