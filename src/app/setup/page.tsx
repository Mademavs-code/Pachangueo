"use client"

import { useState, Suspense } from 'react'
import { createCommunity } from '@/actions/communities'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldPlus, ArrowRight, Loader2, Palette } from 'lucide-react'

function SetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callback = searchParams.get('callback') 
  
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#3b82f6') // Azul por defecto para la preview

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError(null)
    
    const result = await createCommunity(formData)
    
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    } else if (result?.success) {
      // Forzamos un recargo completo de la ventana para que Layout y Cookies se refresquen de golpe
      window.location.href = callback || '/'
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 md:mt-20 p-4 relative z-10" style={{ '--color-primary': primaryColor } as React.CSSProperties}>
      
      {/* Brillo de fondo dinámico basado en el color seleccionado */}
      <div 
        className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] blur-[120px] pointer-events-none opacity-20 transition-colors duration-500 rounded-full"
        style={{ backgroundColor: 'var(--color-primary)' }}
      ></div>

      {/* Banner Salvavidas: Si detecta que el usuario tiene una invitación pendiente */}
      {callback && callback.includes('/invite/') && (
        <div className="mb-8 bg-indigo-500/10 border border-indigo-500/30 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl backdrop-blur-md animate-fade-in">
          <div>
            <h3 className="font-black text-indigo-400 text-lg md:text-xl tracking-tight">Tienes una invitación pendiente</h3>
            <p className="text-sm text-indigo-200/70 font-medium mt-1">No necesitas crear una comunidad nueva si vas a unirte a otra.</p>
          </div>
          <button 
            onClick={() => router.push(callback)}
            className="flex items-center justify-center w-full sm:w-auto gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transform hover:-translate-y-1"
          >
            Aceptar mi invitación <ArrowRight size={18}/>
          </button>
        </div>
      )}

      <div className="bg-[#0f172a] rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden relative">
        <div 
          className="p-10 md:p-12 text-center text-white relative overflow-hidden transition-colors duration-500"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' }}
        >
          <div 
            className="absolute inset-0 opacity-50"
            style={{ background: 'linear-gradient(to bottom, color-mix(in srgb, var(--color-primary) 40%, transparent), transparent)' }}
          ></div>

          <div className="relative z-10">
            <div 
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl transition-colors duration-500 border border-white/10"
              style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 0 40px color-mix(in srgb, var(--color-primary) 50%, transparent)' }}
            >
              <ShieldPlus size={40} className="text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white drop-shadow-md">Forja tu Comunidad</h2>
            <p className="mt-3 font-medium text-lg" style={{ color: 'color-mix(in srgb, var(--color-primary) 80%, white)' }}>
              El vestuario de tu equipo empieza aquí.
            </p>
          </div>
        </div>

        <form action={handleSubmit} className="p-8 md:p-12 space-y-8 bg-slate-900/50">
          {error && (
            <div className="rounded-2xl bg-red-500/10 p-5 text-sm text-red-400 font-bold border border-red-500/20 flex items-center gap-3">
              <span className="text-xl">⚠️</span> {error}
            </div>
          )}
          
          <div>
            <label htmlFor="name" className="block text-sm font-black text-slate-300 mb-3 uppercase tracking-widest">
              Nombre del Equipo o Comunidad
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Ej. Los Galácticos del Domingo"
              className="block w-full rounded-2xl border-2 border-slate-800 bg-slate-950/50 py-4 px-5 text-white font-bold placeholder:text-slate-600 focus:outline-none transition-colors"
              style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = '#1e293b'}
            />
          </div>

          <div className="pt-6 border-t border-slate-800">
            <h3 className="text-sm font-black text-slate-300 mb-6 uppercase tracking-widest flex items-center gap-2">
              <Palette size={16} /> Identidad Visual
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <label htmlFor="primaryColor" className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                  Color Principal
                </label>
                <div className="flex items-center gap-4">
                  <input 
                    id="primaryColor" 
                    name="primaryColor" 
                    type="color" 
                    defaultValue={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-14 w-20 rounded-xl cursor-pointer border-0 p-1 bg-slate-900 ring-2 ring-inset ring-slate-700 hover:ring-slate-500 transition-all" 
                  />
                  <div>
                    <span className="block text-sm font-bold text-white">Equipación Local</span>
                    <span className="text-xs font-medium text-slate-500">Afecta a toda la App</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <label htmlFor="secondaryColor" className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                  Color Secundario
                </label>
                <div className="flex items-center gap-4">
                  <input 
                    id="secondaryColor" 
                    name="secondaryColor" 
                    type="color" 
                    defaultValue="#ffffff" 
                    className="h-14 w-20 rounded-xl cursor-pointer border-0 p-1 bg-slate-900 ring-2 ring-inset ring-slate-700 hover:ring-slate-500 transition-all" 
                  />
                  <div>
                    <span className="block text-sm font-bold text-white">Equipación Visitante</span>
                    <span className="text-xs font-medium text-slate-500">Color de contraste</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full justify-center items-center gap-3 rounded-2xl py-5 text-lg font-black text-white transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{ 
                backgroundColor: 'var(--color-primary)', 
                boxShadow: '0 10px 30px -10px var(--color-primary)' 
              }}
            >
              {isPending ? <Loader2 size={24} className="animate-spin" /> : <ShieldPlus size={24} />}
              {isPending ? 'Fundando equipo...' : 'Fundar Comunidad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center gap-4 animate-pulse">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-indigo-400 font-bold uppercase tracking-widest">Preparando vestuario...</p>
        </div>
      }>
        <SetupForm />
      </Suspense>
    </div>
  )
}