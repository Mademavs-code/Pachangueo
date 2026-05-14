"use client"

import { useState, useEffect } from 'react'
import { Copy, CheckCircle2 } from 'lucide-react'

export default function InviteLinkBox({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  // Usamos useEffect para acceder al objeto 'window' solo en el navegador
  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  // Construimos la URL mágica
  const inviteUrl = origin ? `${origin}/invite/${token}` : 'Generando enlace...'

  const handleCopy = async () => {
    if (!origin) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000) // Vuelve a la normalidad en 3 segundos
    } catch (err) {
      console.error('Error al copiar:', err)
    }
  }

  return (
    <div className="mt-4">
      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
        Enlace de Invitación Permanente
      </label>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-sm text-gray-600 truncate select-all">
          {inviteUrl}
        </div>
        <button 
          onClick={handleCopy}
          disabled={!origin}
          className={`w-full sm:w-auto flex justify-center items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            copied 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
          }`}
        >
          {copied ? <><CheckCircle2 size={18} /> ¡Copiado!</> : <><Copy size={18} /> Copiar Enlace</>}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Comparte este enlace por WhatsApp o email. Cualquier persona que haga clic podrá unirse automáticamente a tu comunidad.
      </p>
    </div>
  )
}