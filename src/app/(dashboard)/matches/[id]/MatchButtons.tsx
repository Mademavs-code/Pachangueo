"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinMatch, leaveMatch, endMatch, submitVotes, updateMatch } from '@/actions/matches'
import { CheckCircle2, XCircle, Loader2, Shuffle, Link as LinkIcon, Check, Flag, Star, Trophy, X, Settings } from 'lucide-react'

export default function MatchButtons({ 
  matchId, 
  isJoined, 
  isFull,
  isAdmin,
  hasTeams,
  status,
  isGuest,
  players,
  currentUserId,
  match // <-- NUEVO PROP
}: { 
  matchId: string, 
  isJoined: boolean, 
  isFull: boolean,
  isAdmin: boolean,
  hasTeams: boolean,
  status: 'OPEN' | 'CLOSED',
  isGuest: boolean,
  players: any[],
  currentUserId: string,
  match: any // <-- NUEVO PROP
}) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  // Estados para Votación
  const [showVotingModal, setShowVotingModal] = useState(false)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [mvpId, setMvpId] = useState<string | null>(null)
  const [submittingVotes, setSubmittingVotes] = useState(false)

  // Estados para Edición
  const [showEditModal, setShowEditModal] = useState(false)
  const [updating, setUpdating] = useState(false)

  const evaluablePlayers = players.filter(p => p.member_id !== currentUserId)

  async function handleAction(action: 'join' | 'leave' | 'generate' | 'end') {
    setLoading(true)
    let res: any;
    
    if (action === 'join') res = await joinMatch(matchId)
    else if (action === 'leave') res = await leaveMatch(matchId)
    else if (action === 'end') res = await endMatch(matchId)
    
    if (res?.error) alert("Error: " + res.error)
    else router.refresh()
    
    setLoading(false)
  }

  function handleCopyGuestLink() {
    const url = `${window.location.origin}/guest-match/${matchId}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSubmitVotes() {
    if (!mvpId) {
      alert("¡Debes elegir a un MVP antes de enviar tus votos!")
      return
    }
    setSubmittingVotes(true)
    const votesPayload = evaluablePlayers.map(p => ({
      evaluated_id: p.member_id,
      rating: ratings[p.member_id] || 5,
      is_mvp: p.member_id === mvpId
    }))
    const res = await submitVotes(matchId, votesPayload)
    setSubmittingVotes(false)
    if (res?.error) alert(res.error)
    else {
      alert("¡Votos registrados correctamente!")
      setShowVotingModal(false)
    }
  }

  async function handleUpdateMatch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUpdating(true)
    const formData = new FormData(e.currentTarget)
    const res = await updateMatch(matchId, formData)
    setUpdating(false)
    if (res?.error) alert(res.error)
    else {
      setShowEditModal(false)
      router.refresh()
    }
  }

  // ==========================================
  // VISTA 1: PARTIDO FINALIZADO (CLOSED)
  // ==========================================
  if (status === 'CLOSED') {
    return (
      <div className="flex items-center gap-3">
        {isJoined && !isGuest ? (
          <>
            <button 
              onClick={() => setShowVotingModal(true)}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-sm transform hover:scale-105"
            >
              <Star size={20} className="fill-current" /> Votar Rendimiento
            </button>

            {/* MODAL DE VOTACIONES */}
            {showVotingModal && (
              <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
                <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
                  <div className="bg-gray-900 p-6 flex justify-between items-center text-white sticky top-0 z-10">
                    <div>
                      <h3 className="text-2xl font-black flex items-center gap-2"><Trophy className="text-yellow-400" /> Votaciones Post-Partido</h3>
                      <p className="text-gray-400 text-sm mt-1">Valora del 1 al 10 y elige al MVP. Es totalmente anónimo.</p>
                    </div>
                    <button onClick={() => setShowVotingModal(false)} className="p-2 bg-white/10 hover:bg-red-500 rounded-full transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 bg-gray-50">
                    {evaluablePlayers.map((p, idx) => (
                      <div key={p.member_id} className={`bg-white p-4 rounded-2xl border-2 transition-all flex flex-col md:flex-row md:items-center gap-4 justify-between shadow-sm ${mvpId === p.member_id ? 'border-yellow-400 bg-yellow-50/30' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-300 font-black text-sm w-4">{idx + 1}</span>
                          <p className="font-bold text-gray-900 text-lg">{p.alias}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Nota: {ratings[p.member_id] || 5}</span>
                            <input 
                              type="range" min="1" max="10" 
                              value={ratings[p.member_id] || 5}
                              onChange={(e) => setRatings({...ratings, [p.member_id]: parseInt(e.target.value)})}
                              className="w-32 accent-blue-600 cursor-pointer"
                            />
                          </div>
                          <button 
                            onClick={() => setMvpId(p.member_id)}
                            className={`p-3 rounded-xl flex items-center gap-2 font-bold text-xs border-2 transition-all ${
                              mvpId === p.member_id 
                                ? 'bg-yellow-100 border-yellow-400 text-yellow-700' 
                                : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200'
                            }`}
                          >
                            <Trophy size={16} className={mvpId === p.member_id ? 'fill-current' : ''} />
                            {mvpId === p.member_id ? 'ES EL MVP' : 'MVP'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-6 bg-white border-t border-gray-100 flex justify-end sticky bottom-0 z-10">
                    <button 
                      onClick={handleSubmitVotes}
                      disabled={submittingVotes || !mvpId}
                      className="bg-gray-900 hover:bg-black text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {submittingVotes ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                      Confirmar Votos
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-gray-100 text-gray-500 font-bold py-3 px-6 rounded-xl border border-gray-200">
            🏁 Partido Finalizado
          </div>
        )}
      </div>
    )
  }

  // ==========================================
  // VISTA 2: PARTIDO ABIERTO (OPEN)
  // ==========================================
  return (
    <div className="flex flex-wrap items-center gap-3">
      
      {isAdmin && (
        <button onClick={() => setShowEditModal(true)} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold py-3 px-4 rounded-xl transition-all shadow-sm">
          <Settings size={18} /> Editar
        </button>
      )}

      {isAdmin && (
        <button onClick={handleCopyGuestLink} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold py-3 px-4 rounded-xl transition-all shadow-sm">
          {copied ? <Check size={18} className="text-green-600" /> : <LinkIcon size={18} />}
          {copied ? '¡Enlace Copiado!' : 'Enlace para Invitados'}
        </button>
      )}

      {isAdmin && (
        <button 
          onClick={() => { if (confirm('¿Estás seguro de que quieres finalizar el partido? Esto cerrará las inscripciones y habilitará las votaciones de MVP.')) handleAction('end') }}
          disabled={loading}
          className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Flag size={18} />} Finalizar Partido
        </button>
      )}

      {isAdmin && isFull && !hasTeams && (
        <button onClick={() => handleAction('generate')} disabled={loading} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Shuffle size={20} />} Generar Equipos
        </button>
      )}

      {isJoined ? (
        <button onClick={() => handleAction('leave')} disabled={loading} className="flex items-center gap-2 bg-red-50 text-red-700 font-bold py-3 px-6 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={20} /> : <XCircle size={20} />} Darse de baja
        </button>
      ) : (
        <button onClick={() => handleAction('join')} disabled={isFull || loading} className={`flex items-center gap-2 font-bold py-3 px-8 rounded-xl shadow-sm transition-all ${isFull ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white transform hover:scale-105'}`}>
          {loading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /> {isFull ? 'Partido Lleno' : '¡Apuntarme!'}</>}
        </button>
      )}

      {/* MODAL DE EDICIÓN (SOLO ADMIN) */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto text-left">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
            <div className="bg-gray-900 p-6 flex justify-between items-center text-white">
              <h3 className="text-xl font-black flex items-center gap-2"><Settings size={20} style={{ color: 'var(--color-primary)' }}/> Editar Datos del Partido</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 bg-white/10 hover:bg-red-500 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateMatch} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Ubicación</label>
                <input type="text" name="location" defaultValue={match?.match_location} required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent outline-none bg-gray-50" style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Modalidad</label>
                  <select name="type" defaultValue={match?.match_type} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent outline-none bg-gray-50" style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}>
                    <option value="5">Fútbol 5</option>
                    <option value="7">Fútbol 7</option>
                    <option value="11">Fútbol 11</option>
                    <option value="Sala">Fútbol Sala</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Aforo Máximo</label>
                  <input type="number" name="maxPlayers" defaultValue={match?.maxPlayers} required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent outline-none bg-gray-50" style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Fecha</label>
                  <input type="date" name="date" defaultValue={match?.match_date} required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent outline-none bg-gray-50" style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Hora</label>
                  <input type="time" name="time" defaultValue={match?.match_time} required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent outline-none bg-gray-50" style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Precio por jugador (€)</label>
                <input type="number" step="0.5" name="price" defaultValue={match?.match_price} required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent outline-none bg-gray-50" style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties} />
              </div>
              <div className="pt-4 border-t border-gray-100 mt-2">
                <button type="submit" disabled={updating} className="w-full text-white font-black py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1 shadow-lg" style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 4px 15px color-mix(in srgb, var(--color-primary) 40%, transparent)' }}>
                  {updating ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} Guardar Modificaciones
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}