"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createMatch } from '@/actions/matches'
import { Calendar, MapPin, Users, Euro } from 'lucide-react'

export default function NewMatchPage() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    const res = await createMatch(formData)
    if (res.error) {
      setError(res.error)
      setIsPending(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configurar Nuevo Partido</h1>
      
      <form action={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
              <input name="location" required className="pl-10 w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500" placeholder="Nombre del polideportivo" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Juego</label>
            <div className="relative">
              <Users className="absolute left-3 top-3 text-gray-400" size={18} />
              <select name="type" className="pl-10 w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                <option value="7">Fútbol 7</option>
                <option value="11">Fútbol 11</option>
                <option value="Sala">Fútbol Sala</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input type="date" name="date" required className="w-full rounded-lg border-gray-300" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
            <input type="time" name="time" required className="w-full rounded-lg border-gray-300" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio por persona (€)</label>
            <div className="relative">
              <Euro className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="number" step="0.50" name="price" className="pl-10 w-full rounded-lg border-gray-300" placeholder="5.00" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Límite de Jugadores</label>
            <input type="number" name="maxPlayers" defaultValue="14" className="w-full rounded-lg border-gray-300" />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Publicando partido...' : 'Crear Partido y Notificar'}
        </button>
      </form>
    </div>
  )
}