import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, MapPin, Shield, Users, Euro, Clock, Info } from 'lucide-react'
import MatchButtons from './MatchButtons'
import LineupManager from './LineupManager'

export default async function MatchDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await props.params
  const supabase = await createClient()

  // 1. Autenticación y Perfil
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profileData) redirect('/setup')
  const profileId = (profileData as { id: string }).id

  // 2. Obtener datos del partido
  const { data: matchData } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (!matchData) return <div className="p-8 text-center font-medium text-gray-500">Partido no encontrado</div>
  const match = matchData as any

  // 3. Verificar si el usuario es ADMIN de esta comunidad
  const { data: membershipData } = await supabase
    .from('community_members')
    .select('role')
    .eq('profile_id', profileId)
    .eq('community_id', match.community_id)
    .single()

  const isAdmin = membershipData?.role === 'ADMIN'

  // 4. Obtener jugadores (Join: match_players -> profiles -> community_members)
  // Filtramos community_members por la comunidad del partido para obtener el alias/posición correcto
  const { data: participants, error: participantsError } = await supabase
    .from('match_players')
    .select(`
      member_id,
      team,
      profiles (
        alias,
        community_members (
          alias,
          preferred_position,
          community_id
        )
      )
    `)
    .eq('match_id', matchId)

  if (participantsError) console.error("Error al cargar jugadores:", participantsError.message)

  // 5. Procesamiento de jugadores para la UI
  const players = (participants as any[])?.map(p => {
    // Buscamos la membresía que corresponde a la comunidad de este partido
    const communityInfo = p.profiles?.community_members?.find(
      (m: any) => m.community_id === match.community_id
    )
    
    return {
      member_id: p.member_id,
      team: p.team,
      alias: communityInfo?.alias || p.profiles?.alias || 'Jugador',
      position: communityInfo?.preferred_position || 'N/A',
      // Simulamos rating hasta implementar la tabla evaluations
      rating: Math.floor(Math.random() * (10 - 5 + 1)) + 5 
    }
  }) || []

  // 6. Estados de la interfaz
  const isJoined = players.some(p => p.member_id === profileId)
  const maxPlayers = match.maxPlayers || 14
  const isFull = players.length >= maxPlayers
  const hasTeams = players.some(p => p.team !== null && p.team !== '')

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      
      {/* SECCIÓN 1: CABECERA Y DATOS DEL PARTIDO */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <Shield size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter">Fútbol {match.match_type}</h1>
              <p className="text-blue-100 flex items-center gap-2 mt-1 italic font-medium">
                <MapPin size={16} /> {match.match_location}
              </p>
            </div>
          </div>
        </div>

        {/* Grid de Información Técnica */}
        <div className="p-8 grid grid-cols-2 lg:grid-cols-4 gap-8 bg-gray-50/50 border-b border-gray-100">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={12}/> Fecha del encuentro
            </span>
            <p className="text-lg font-bold text-gray-900">{match.match_date}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
              <Clock size={12}/> Hora de inicio
            </span>
            <p className="text-lg font-bold text-gray-900">{match.match_time} h</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Users size={12}/> Aforo máximo
            </span>
            <p className="text-lg font-bold text-gray-900">{maxPlayers} Jugadores</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Euro size={12}/> Coste por persona
            </span>
            <p className="text-lg font-bold text-gray-900">
              {match.match_price > 0 ? `${match.match_price}€` : 'Gratis'}
            </p>
          </div>
        </div>

        {/* Panel de Acción Rápida */}
        <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full animate-pulse ${isFull ? 'bg-red-500' : 'bg-green-500'}`} />
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-tight">Estado de convocatoria</p>
              <p className="text-2xl font-black text-gray-900">
                {players.length} <span className="text-gray-300 font-light">/</span> {maxPlayers}
              </p>
            </div>
          </div>

          <MatchButtons 
            matchId={matchId} 
            isJoined={isJoined} 
            isFull={isFull}
            isAdmin={isAdmin}
            hasTeams={hasTeams}
          />
        </div>
      </div>

      {/* SECCIÓN 2: LISTA DE JUGADORES Y EQUIPOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Columna de Convocados (Izquierda) */}
        <div className={`${isAdmin && isFull ? 'lg:col-span-4' : 'lg:col-span-12'} space-y-6`}>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="text-blue-600" size={20} /> Convocados
              </h2>
              {hasTeams && (
                <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-green-100">
                  <Info size={12} /> Equipos Listos
                </div>
              )}
            </div>

            <div className="space-y-3">
              {players.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                  <p className="text-gray-400 text-sm font-medium">No hay jugadores inscritos</p>
                </div>
              ) : (
                players.map((p, idx) => (
                  <div key={p.member_id} className="group flex items-center gap-4 p-3 rounded-2xl border border-gray-50 bg-gray-50/30 hover:bg-white hover:shadow-md hover:border-blue-100 transition-all">
                    <span className="text-xs font-black text-gray-300 w-4">{idx + 1}</span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 leading-tight">{p.alias}</p>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        p.position === 'GK' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {p.position}
                      </span>
                    </div>
                    {p.team && (
                      <div className={`px-3 py-1 rounded-lg text-[10px] font-black border-2 shadow-sm ${
                        p.team === 'BLANCO' 
                          ? 'bg-white text-gray-900 border-gray-200' 
                          : 'bg-gray-900 text-white border-gray-800'
                      }`}>
                        {p.team}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Columna de Gestión de Alineaciones (Derecha - Solo Admin) */}
        {isAdmin && isFull && (
          <div className="lg:col-span-8">
            <LineupManager 
              matchId={matchId} 
              initialPlayers={players} 
            />
          </div>
        )}
      </div>
    </div>
  )
}