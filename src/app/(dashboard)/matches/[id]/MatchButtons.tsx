"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinMatch, leaveMatch, saveLineups } from '@/actions/matches'
import { CheckCircle2, XCircle, Loader2, Shuffle } from 'lucide-react'

export default function MatchButtons({ 
  matchId, 
  isJoined, 
  isFull,
  isAdmin,      // <-- Nuevo prop
  hasTeams      // <-- Nuevo prop
}: { 
  matchId: string, 
  isJoined: boolean, 
  isFull: boolean,
  isAdmin: boolean,
  hasTeams: boolean
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleAction(action: 'join' | 'leave' | 'generate') {
    setLoading(true)
    let res;
    
    if (action === 'join') res = await joinMatch(matchId)
    else if (action === 'leave') res = await leaveMatch(matchId)
    else if (action === 'generate') res = await generateLineups(matchId)
    
    if (res?.error) {
      alert("Error: " + res.error)
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3">
      {/* Botón de Generar Equipos (Solo visible para ADMIN si está lleno y aún no hay equipos) */}
      {isAdmin && isFull && !hasTeams && (
        <button 
          onClick={() => handleAction('generate')}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Shuffle size={20} />}
          Generar Equipos Blanco/Negro
        </button>
      )}

      {/* Botones de Unirse/Salir */}
      {isJoined ? (
        <button 
          onClick={() => handleAction('leave')}
          disabled={loading}
          className="flex items-center gap-2 bg-red-50 text-red-700 font-bold py-3 px-6 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <XCircle size={20} />}
          Darse de baja
        </button>
      ) : (
        <button 
          onClick={() => handleAction('join')}
          disabled={isFull || loading}
          className={`flex items-center gap-2 font-bold py-3 px-8 rounded-xl shadow-sm transition-all ${
            isFull 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-green-600 hover:bg-green-700 text-white transform hover:scale-105'
          }`}
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : (
            <><CheckCircle2 size={20} /> {isFull ? 'Partido Lleno' : '¡Apuntarme!'}</>
          )}
        </button>
      )}
    </div>
  )
}