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
  match 
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
  match: any 
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

            {/* MODAL DE VOTACIONES (ESTÉTICA DARK PREMIUM) */}
            {showVotingModal && (
              <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
                <div className="bg-slate-900 rounded-[2rem] border border-slate-700 w-full max-w-2xl overflow-hidden shadow-2xl my-8">
                  <div className="bg-slate-800 p-6 flex justify-between items-center text-white border-b border-slate-700 sticky top-0 z-10">
                    <div>
                      <h3 className="text-2xl font-black flex items-center gap-2"><Trophy className="text-yellow-400" /> Votaciones Post-Partido</h3>
                      <p className="text-slate-400 text-sm mt-1">Valora del 1 al 10 y elige al MVP. Es totalmente anónimo.</p>
                    </div>
                    <button onClick={() => setShowVotingModal(false)} className="p-2 bg-slate-700/50 hover:bg-red-500 text-slate-400 hover:text-white rounded-full transition-colors">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 bg-slate-900">
                    {evaluablePlayers.map((p, idx) => (
                      <div key={p.member_id} className={`bg-slate-800/50 p-4 rounded-2xl border-2 transition-all flex flex-col md:flex-row md:items-center gap-4 justify-between shadow-sm ${mvpId === p.member_id ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-slate-700/50 hover:border-slate-600'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 font-black text-sm w-4">{idx + 1}</span>
                          <p className="font-bold text-white text-lg">{p.alias}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Nota: {ratings[p.member_id] || 5}</span>
                            <input 
                              type="range" min="1" max="10" 
                              value={ratings[p.member_id] || 5}
                              onChange={(e) => setRatings({...ratings, [p.member_id]: parseInt(e.target.value)})}
                              className="w-32 cursor-pointer"
                              style={{ accentColor: 'var(--color-primary)' }}
                            />
                          </div>
                          <button 
                            onClick={() => setMvpId(p.member_id)}
                            className={`p-3 rounded-xl flex items-center gap-2 font-bold text-xs border-2 transition-all ${
                              mvpId === p.member_id 
                                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]' 
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-yellow-500/10 hover:text-yellow-400 hover:border-yellow-500/30'
                            }`}
                          >
                            <Trophy size={16} className={mvpId === p.member_id ? 'fill-current' : ''} />
                            {mvpId === p.member_id ? 'ES EL MVP' : 'MVP'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 bg-slate-800 border-t border-slate-700 flex justify-end sticky bottom-0 z-10">
                    <button 
                      onClick={handleSubmitVotes}
                      disabled={submittingVotes || !mvpId}
                      className="text-white font-black py-4 px-8 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:-translate-y-1"
                      style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 0 20px color-mix(in srgb, var(--color-primary) 50%, transparent)' }}
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

      {/* MODAL DE EDICIÓN (ESTÉTICA DARK PREMIUM) */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto text-left">
          <div className="bg-slate-900 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl border border-slate-700 my-8">
            <div className="bg-slate-800 p-6 flex justify-between items-center text-white border-b border-slate-700">
              <h3 className="text-xl font-black flex items-center gap-2"><Settings size={20} style={{ color: 'var(--color-primary)' }}/> Editar Datos del Partido</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white bg-slate-700/50 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateMatch} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Ubicación</label>
                <input 
                  type="text" name="location" defaultValue={match?.match_location} required 
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border-2 border-slate-700 text-white focus:outline-none transition-colors font-medium" 
                  style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.target.style.borderColor = '#334155'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Modalidad</label>
                  <select 
                    name="type" defaultValue={match?.match_type} 
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border-2 border-slate-700 text-white focus:outline-none transition-colors font-medium"
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = '#334155'}
                  >
                    <option value="5">Fútbol 5</option>
                    <option value="7">Fútbol 7</option>
                    <option value="11">Fútbol 11</option>
                    <option value="Sala">Fútbol Sala</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Aforo Máximo</label>
                  <input 
                    type="number" name="maxPlayers" defaultValue={match?.maxPlayers} required 
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border-2 border-slate-700 text-white focus:outline-none transition-colors font-medium" 
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = '#334155'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Fecha</label>
                  <input 
                    type="date" name="date" defaultValue={match?.match_date} required 
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border-2 border-slate-700 text-white focus:outline-none transition-colors font-medium color-scheme-dark" 
                    style={{ colorScheme: 'dark' }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = '#334155'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Hora</label>
                  <input 
                    type="time" name="time" defaultValue={match?.match_time} required 
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border-2 border-slate-700 text-white focus:outline-none transition-colors font-medium color-scheme-dark" 
                    style={{ colorScheme: 'dark' }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = '#334155'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Precio por jugador (€)</label>
                <input 
                  type="number" step="0.5" name="price" defaultValue={match?.match_price} required 
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border-2 border-slate-700 text-white focus:outline-none transition-colors font-medium" 
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.target.style.borderColor = '#334155'}
                />
              </div>

              <div className="pt-4 border-t border-slate-700 mt-2">
                <button 
                  type="submit" disabled={updating} 
                  className="w-full text-white font-black py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1 shadow-lg disabled:opacity-50" 
                  style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 0 20px color-mix(in srgb, var(--color-primary) 50%, transparent)' }}
                >
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