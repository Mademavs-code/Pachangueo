"use client"

import { useState, Suspense } from 'react'
import { createCommunity } from '@/actions/communities'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldPlus, ArrowRight } from 'lucide-react'

function SetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callback = searchParams.get('callback') // Extraemos la URL de destino
  
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError(null)
    
    const result = await createCommunity(formData)
    
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    } else if (result?.success) {
      router.refresh()
      // Si por lo que sea decidieron crear la comunidad, los mandamos a su destino o al inicio
      router.push(callback || '/') 
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-4">
      
      {/* Banner Salvavidas: Si detecta que el usuario tiene una invitación pendiente */}
      {callback && callback.includes('/invite/') && (
        <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div>
            <h3 className="font-bold text-indigo-900 text-lg">Tienes una invitación pendiente</h3>
            <p className="text-sm text-indigo-700">No necesitas crear una comunidad nueva si vas a unirte a otra.</p>
          </div>
          <button 
            onClick={() => router.push(callback)}
            className="flex items-center justify-center w-full sm:w-auto gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            Aceptar mi invitación <ArrowRight size={18}/>
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <ShieldPlus size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold">Crea tu Comunidad</h2>
          <p className="mt-2 text-blue-100">
            Estás a un paso de organizar tus partidos como un profesional.
          </p>
        </div>

        <form action={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 font-medium border border-red-100">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
              Nombre del Equipo o Comunidad
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Ej. Los Galácticos del Domingo"
              className="block w-full rounded-xl border-0 py-3.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="primaryColor" className="block text-sm font-semibold text-gray-900 mb-2">
                Color Principal
              </label>
              <div className="flex items-center gap-3">
                <input id="primaryColor" name="primaryColor" type="color" defaultValue="#2563eb" className="h-10 w-16 rounded-lg cursor-pointer border-0 p-1" />
                <span className="text-xs text-gray-500 font-medium">Equipación local</span>
              </div>
            </div>
            
            <div>
              <label htmlFor="secondaryColor" className="block text-sm font-semibold text-gray-900 mb-2">
                Color Secundario
              </label>
              <div className="flex items-center gap-3">
                <input id="secondaryColor" name="secondaryColor" type="color" defaultValue="#ffffff" className="h-10 w-16 rounded-lg cursor-pointer border-0 p-1 ring-1 ring-inset ring-gray-200" />
                <span className="text-xs text-gray-500 font-medium">Equipación visitante</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full justify-center items-center gap-2 rounded-xl bg-blue-600 px-4 py-4 text-sm font-bold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? 'Creando...' : 'Fundar Comunidad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Next.js exige envolver useSearchParams en Suspense en componentes de cliente
export default function SetupPage() {
  return (
    <Suspense fallback={<div className="text-center mt-20 text-gray-400 font-medium animate-pulse">Cargando panel...</div>}>
      <SetupForm />
    </Suspense>
  )
}