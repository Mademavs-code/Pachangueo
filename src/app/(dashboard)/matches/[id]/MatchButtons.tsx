"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinMatch, leaveMatch, endMatch, submitVotes } from '@/actions/matches'
import { CheckCircle2, XCircle, Loader2, Shuffle, Link as LinkIcon, Check, Flag, Star, Trophy, X } from 'lucide-react'

export default function MatchButtons({ 
  matchId, 
  isJoined, 
  isFull,
  isAdmin,
  hasTeams,
  status,
  isGuest,
  players,
  currentUserId
}: { 
  matchId: string, 
  isJoined: boolean, 
  isFull: boolean,
  isAdmin: boolean,
  hasTeams: boolean,
  status: 'OPEN' | 'CLOSED',
  isGuest: boolean,
  players: any[],
  currentUserId: string
}) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  // Estados para el Modal de Votación
  const [showVotingModal, setShowVotingModal] = useState(false)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [mvpId, setMvpId] = useState<string | null>(null)
  const [submittingVotes, setSubmittingVotes] = useState(false)

  // Filtramos la lista: no puedes votarte a ti mismo
  const evaluablePlayers = players.filter(p => p.member_id !== currentUserId)

  async function handleAction(action: 'join' | 'leave' | 'generate' | 'end') {
    setLoading(true)
    let res: any;
    
    if (action === 'join') res = await joinMatch(matchId)
    else if (action === 'leave') res = await leaveMatch(matchId)
    else if (action === 'end') res = await endMatch(matchId)
    // else if (action === 'generate') res = await generateLineups(matchId)
    
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
      rating: ratings[p.member_id] || 5, // 5 por defecto si no lo tocan
      is_mvp: p.member_id === mvpId
    }))

    const res = await submitVotes(matchId, votesPayload)
    
    setSubmittingVotes(false)
    
    if (res?.error) {
      alert(res.error)
    } else {
      alert("¡Votos registrados correctamente!")
      setShowVotingModal(false)
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
    </div>
  )
}