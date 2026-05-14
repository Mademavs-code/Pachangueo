"use client"

import { useState } from 'react'
import { createCommunity } from '@/actions/communities'
import { useRouter } from 'next/navigation'
import { ShieldPlus } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()
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
      // Si todo fue bien, forzamos la recarga y navegamos al Tablón
      router.refresh()
      router.push('/')
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 font-medium">
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
              className="block w-full rounded-lg border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            />
            <p className="mt-2 text-xs text-gray-500">
              Este nombre será visible para todos los miembros que invites.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="primaryColor" className="block text-sm font-semibold text-gray-900 mb-2">
                Color Principal
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="primaryColor"
                  name="primaryColor"
                  type="color"
                  defaultValue="#2563eb"
                  className="h-10 w-16 rounded cursor-pointer border-0 p-1"
                />
                <span className="text-xs text-gray-500">Equipación local</span>
              </div>
            </div>
            
            <div>
              <label htmlFor="secondaryColor" className="block text-sm font-semibold text-gray-900 mb-2">
                Color Secundario
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="secondaryColor"
                  name="secondaryColor"
                  type="color"
                  defaultValue="#ffffff"
                  className="h-10 w-16 rounded cursor-pointer border-0 p-1 ring-1 ring-inset ring-gray-300"
                />
                <span className="text-xs text-gray-500">Equipación visitante</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full justify-center items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? 'Creando...' : 'Fundar Comunidad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}