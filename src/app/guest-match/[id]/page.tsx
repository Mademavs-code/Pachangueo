"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client' // Usamos el cliente de navegador de tu carpeta lib
import { Calendar, MapPin, UserPlus, Loader2 } from 'lucide-react'
import { joinAsGuest } from '@/actions/guest'

export default function GuestJoinPage() {
  const params = useParams()
  const matchId = params.id as string
  const router = useRouter()
  
  const [match, setMatch] = useState<any>(null)
  const [loadingMatch, setLoadingMatch] = useState(true)
  const [issubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Al ser un componente de cliente, cargamos los datos del partido con un useEffect
  useEffect(() => {
    async function loadMatchData() {
      const supabase = createClient()
      const { data } = await supabase
        .from('matches')
        .select('match_type, match_location, match_date, match_time, maxPlayers, communities(name)')
        .eq('id', matchId)
        .single()
      
      if (data) setMatch(data)
      setLoadingMatch(false)
    }
    if (matchId) loadMatchData()
  }, [matchId])

  if (loadingMatch) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-xl font-bold text-gray-500">Este partido no existe o ha sido eliminado.</p>
      </div>
    )
  }

  const communityName = match.communities?.name || 'la comunidad'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
        
        {/* Cabecera visual */}
        <div className="bg-gray-900 p-8 text-center text-white">
          <h1 className="text-3xl font-black mb-2 uppercase tracking-tight">¡Estás Invitado!</h1>
          <p className="text-gray-400 font-medium text-sm">Únete como jugador externo al partido de {communityName}</p>
        </div>

        {/* Resumen del Partido */}
        <div className="p-6 bg-gray-50 border-b border-gray-100 flex flex-col gap-3">
          <div className="flex items-center gap-3 text-gray-700 font-semibold text-sm">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0"><MapPin size={16}/></div>
            Fútbol {match.match_type} en {match.match_location}
          </div>
          <div className="flex items-center gap-3 text-gray-700 font-semibold text-sm">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0"><Calendar size={16}/></div>
            {match.match_date} a las {match.match_time}h
          </div>
        </div>

        {/* Formulario */}
        <div className="p-8">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold">
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={async (e) => {
            e.preventDefault()
            setIsSubmitting(true)
            setErrorMessage('')

            const formData = new FormData(e.currentTarget)
            const res = await joinAsGuest(formData)

            if (res?.error) {
              setErrorMessage(res.error)
              setIsSubmitting(false)
            } else if (res?.success) {
              // SOLUCIÓN: Forzamos la redirección desde el cliente. 
              // Damos un margen de 200ms para asegurar que las cookies se asienten bien.
              setTimeout(() => {
                router.push(`/matches/${res.matchId}`)
              }, 200)
            }
          }} className="space-y-6">
            <input type="hidden" name="match_id" value={matchId} />
            
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                ¿Con qué nombre/alias te vas a presentar?
              </label>
              <input 
                type="text" 
                name="alias"
                required
                disabled={issubmitting}
                placeholder="Ej. Carlos G." 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[var(--color-primary)] focus:ring-0 transition-colors font-medium text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50"
              />
            </div>

            <button 
              type="submit" 
              disabled={issubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {issubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Inscribiendo...
                </>
              ) : (
                <>
                  <UserPlus size={20} /> Unirme al Partido
                </>
              )}
            </button>
            <p className="text-xs text-center text-gray-400 mt-4">
              Al unirte entrarás como invitado para este encuentro específico.
            </p>
          </form>
        </div>

      </div>
    </div>
  )
}