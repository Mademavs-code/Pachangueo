"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createMatch } from '@/actions/matches'
import { Calendar, MapPin, Users, Euro, Loader2, ArrowLeft, Trophy, Clock } from 'lucide-react'
import Link from 'next/link'

export default function NewMatchPage() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError(null)
    
    try {
      const res = await createMatch(formData)
      
      if (res.error) {
        setError(res.error)
        setIsPending(false)
      } else {
        // Envolvemos el push en un timeout para evitar conflictos con Vercel
        setTimeout(() => {
          router.push('/matches')
          router.refresh()
        }, 150)
      }
    } catch (err) {
      setError('Ocurrió un error inesperado al contactar con el servidor.')
      setIsPending(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto pt-4 px-2 md:px-4 pb-12 space-y-8">
      
      {/* Botón Volver */}
      <Link href="/matches" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-medium text-sm">
        <ArrowLeft size={16} /> Volver a Partidos
      </Link>

      {/* Cabecera Espectacular */}
      <div className="bg-[#0a0f1c] p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div 
          className="absolute -top-24 -right-24 w-64 h-64 opacity-10 rounded-full blur-3xl pointer-events-none" 
          style={{ backgroundColor: 'var(--color-primary)' }}
        ></div>
        
        <div className="relative z-10 flex items-center gap-5">
          <div 
            className="p-4 rounded-2xl shadow-lg flex items-center justify-center border"
            style={{ 
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
              color: 'var(--color-primary)',
              borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)'
            }}
          >
            <Trophy size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Forjar Partido</h1>
            <p className="text-slate-400 font-medium mt-1">Configura la próxima convocatoria del equipo.</p>
          </div>
        </div>
      </div>
      
      {/* Formulario Premium */}
      <form 
        action={handleSubmit} 
        className="bg-[#0f172a] p-6 md:p-8 rounded-[2rem] shadow-2xl border border-slate-800 space-y-8 relative overflow-hidden group transition-all" 
        style={{ '--hover-border-color': 'color-mix(in srgb, var(--color-primary) 50%, transparent)' } as React.CSSProperties}
      >
        <style jsx>{`form:hover { border-color: var(--hover-border-color); }`}</style>
        
        {/* Brillo de fondo sutil */}
        <div 
          className="absolute top-0 right-0 w-[500px] h-[500px] blur-[100px] pointer-events-none transition-opacity opacity-5 group-hover:opacity-10" 
          style={{ backgroundColor: 'var(--color-primary)' }}
        ></div>

        {error && (
          <div className="p-4 bg-red-950/50 text-red-400 border border-red-900 rounded-xl text-sm font-bold flex items-center gap-2 relative z-10">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          
          {/* Ubicación */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-300">Ubicación</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-3.5 text-slate-500" size={18} />
              <input 
                name="location" required 
                className="pl-11 w-full bg-slate-900 border-2 border-slate-700 rounded-xl py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] transition-colors" 
                placeholder="Ej: Polideportivo Municipal" 
              />
            </div>
          </div>

          {/* Tipo de Juego */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-300">Tipo de Juego</label>
            <div className="relative">
              <Users className="absolute left-4 top-3.5 text-slate-500" size={18} />
              <select 
                name="type" 
                className="pl-11 w-full bg-slate-900 border-2 border-slate-700 rounded-xl py-3 text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                <option value="7">Fútbol 7</option>
                <option value="11">Fútbol 11</option>
                <option value="Sala">Fútbol Sala</option>
              </select>
            </div>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-300">Fecha</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-3.5 text-slate-500" size={18} />
              <input 
                type="date" name="date" required 
                className="pl-11 w-full bg-slate-900 border-2 border-slate-700 rounded-xl py-3 text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors color-scheme-dark" 
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Hora */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-300">Hora</label>
            <div className="relative">
              <Clock className="absolute left-4 top-3.5 text-slate-500" size={18} />
              <input 
                type="time" name="time" required 
                className="pl-11 w-full bg-slate-900 border-2 border-slate-700 rounded-xl py-3 text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors color-scheme-dark" 
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Precio */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-300">Precio por persona (€)</label>
            <div className="relative">
              <Euro className="absolute left-4 top-3.5 text-slate-500" size={18} />
              <input 
                type="number" step="0.50" name="price" 
                className="pl-11 w-full bg-slate-900 border-2 border-slate-700 rounded-xl py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] transition-colors" 
                placeholder="5.00" 
              />
            </div>
          </div>

          {/* Límite Jugadores */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-300">Límite de Jugadores</label>
            <div className="relative">
              <Users className="absolute left-4 top-3.5 text-slate-500" size={18} />
              <input 
                type="number" name="maxPlayers" defaultValue="14" 
                className="pl-11 w-full bg-slate-900 border-2 border-slate-700 rounded-xl py-3 text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors" 
              />
            </div>
          </div>
        </div>

        {/* Botón de Submit */}
        <div className="pt-6 relative z-10 border-t border-slate-800">
          <button
            type="submit"
            disabled={isPending}
            className="w-full text-white py-4 rounded-xl font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02]"
            style={{ 
              backgroundColor: 'var(--color-primary)', 
              boxShadow: '0 0 20px color-mix(in srgb, var(--color-primary) 40%, transparent)' 
            }}
          >
            {isPending ? <><Loader2 size={20} className="animate-spin" /> Configurando convocatoria...</> : 'Crear Partido y Notificar'}
          </button>
        </div>
      </form>
    </div>
  )
}