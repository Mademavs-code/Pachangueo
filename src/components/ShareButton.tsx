"use client"

import { Share2, Check } from 'lucide-react'
import { useState } from 'react'

export default function ShareButton({ title, text }: { title: string, text: string }) {
  const [copied, setCopied] = useState(false)
  
  const handleShare = async () => {
    const shareData = { title, text }
    
    // Si el móvil/navegador soporta compartir nativo (WhatsApp, Telegram, etc.)
    if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log('Compartir cancelado')
      }
    } else {
      // Si estamos en PC, copiamos al portapapeles
      navigator.clipboard.writeText(`${title}\n\n${text}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  return (
    <button 
      onClick={handleShare} 
      className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-[var(--color-primary)] transition-colors p-2 -m-2 rounded-lg hover:bg-gray-50"
    >
      {copied ? <Check size={16} className="text-green-500"/> : <Share2 size={16} />}
      {copied ? 'Copiado al portapapeles' : 'Compartir Anuncio'}
    </button>
  )
}