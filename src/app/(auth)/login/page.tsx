"use client"

import { useState, Suspense } from 'react'
import { login } from '@/actions/auth'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { LogIn, Loader2 } from 'lucide-react'

function LoginForm() {
  const searchParams = useSearchParams()
  const callback = searchParams.get('callback') || '/'

  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError(null)
    
    const result = await login(formData)
    
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1c] p-4 relative overflow-hidden">
      
      {/* Brillo de fondo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 rounded-[2.5rem] bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 sm:p-10 shadow-2xl relative z-10">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
            <LogIn size={32} className="text-blue-500" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white">Iniciar Sesión</h2>
          <p className="mt-3 text-sm font-medium text-slate-400">
            Accede a tu comunidad y gestiona tus partidos.
          </p>
        </div>

        <form action={handleSubmit} className="mt-8 space-y-6">
          <input type="hidden" name="callback" value={callback} />

          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 font-bold flex items-center gap-3">
              <span>⚠️</span> {error}
            </div>
          )}
          
          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-bold tracking-widest uppercase text-slate-400 mb-2">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-4 rounded-xl bg-slate-950/50 border-2 border-slate-800 text-white focus:outline-none focus:border-blue-500 transition-colors font-medium placeholder:text-slate-600"
                placeholder="ejemplo@correo.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-bold tracking-widest uppercase text-slate-400 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-4 rounded-xl bg-slate-950/50 border-2 border-slate-800 text-white focus:outline-none focus:border-blue-500 transition-colors font-medium placeholder:text-slate-600"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full justify-center items-center gap-2 rounded-xl bg-blue-600 px-3 py-4 text-base font-black text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-1"
            >
              {isPending ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
              {isPending ? 'Conectando...' : 'Entrar al Vestuario'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm font-medium text-slate-400">
          ¿No tienes cuenta?{' '}
          <Link 
            href={`/register${callback !== '/' ? `?callback=${callback}` : ''}`} 
            className="font-bold text-blue-500 hover:text-blue-400 transition-colors"
          >
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f1c]">
        <div className="animate-pulse font-black tracking-widest uppercase text-blue-500 flex items-center gap-3">
          <Loader2 className="animate-spin" size={24} /> Cargando
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}