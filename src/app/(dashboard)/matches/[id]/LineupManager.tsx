"use client"

import { useState } from 'react'
import { saveLineups } from '@/actions/matches'
import { useRouter } from 'next/navigation'
import { Loader2, Shuffle, Scale, Eraser, Save } from 'lucide-react'

type Player = {
  member_id: string;
  alias: string;
  position: string;
  rating: number;
  team: string | null;
}

export default function LineupManager({ matchId, initialPlayers }: { matchId: string, initialPlayers: Player[] }) {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [saving, setSaving] = useState(false)

  // -- ALGORITMOS --
  
  const handleClear = () => {
    setPlayers(players.map(p => ({ ...p, team: null })))
  }

  const handleRandom = () => {
    const shuffled = [...players].sort(() => 0.5 - Math.random())
    const newPlayers = shuffled.map((p, index) => ({
      ...p,
      team: index % 2 === 0 ? 'BLANCO' : 'NEGRO'
    }))
    setPlayers(newPlayers)
  }

  const handleBalanced = () => {
    const gks = players.filter(p => p.position === 'GK')
    const fielders = players.filter(p => p.position !== 'GK').sort((a, b) => b.rating - a.rating)
    
    let scoreBlanco = 0
    let scoreNegro = 0
    const newPlayers: Player[] = []

    gks.forEach((gk, i) => {
      const team = i % 2 === 0 ? 'BLANCO' : 'NEGRO'
      newPlayers.push({ ...gk, team })
      if (team === 'BLANCO') scoreBlanco += gk.rating
      else scoreNegro += gk.rating
    })

    const halfSize = Math.ceil(players.length / 2)
    let countBlanco = gks.filter((_, i) => i % 2 === 0).length
    let countNegro = gks.filter((_, i) => i % 2 !== 0).length

    fielders.forEach(p => {
      if (countBlanco >= halfSize) {
        newPlayers.push({ ...p, team: 'NEGRO' }); countNegro++
      } else if (countNegro >= halfSize) {
        newPlayers.push({ ...p, team: 'BLANCO' }); countBlanco++
      } else if (scoreBlanco <= scoreNegro) {
        newPlayers.push({ ...p, team: 'BLANCO' }); scoreBlanco += p.rating; countBlanco++
      } else {
        newPlayers.push({ ...p, team: 'NEGRO' }); scoreNegro += p.rating; countNegro++
      }
    })

    setPlayers(newPlayers)
  }

  // -- DRAG AND DROP --

  const handleDragStart = (e: React.DragEvent, member_id: string) => {
    e.dataTransfer.setData('playerId', member_id)
  }

  const handleDrop = (e: React.DragEvent, targetTeam: string | null) => {
    e.preventDefault()
    const playerId = e.dataTransfer.getData('playerId')
    setPlayers(players.map(p => p.member_id === playerId ? { ...p, team: targetTeam } : p))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // -- GUARDAR --
  const handleSave = async () => {
    setSaving(true)
    const teamBlanco = players.filter(p => p.team === 'BLANCO').map(p => p.member_id)
    const teamNegro = players.filter(p => p.team === 'NEGRO').map(p => p.member_id)
    
    const res = await saveLineups(matchId, teamBlanco, teamNegro)
    if (res?.error) alert(res.error)
    else router.refresh()
    
    setSaving(false)
  }

  // -- RENDERIZADO DE COLUMNAS --
  const renderColumn = (title: string, team: string | null, bgClass: string) => {
    const colPlayers = players.filter(p => p.team === team)
    const avgRating = colPlayers.length > 0 
      ? (colPlayers.reduce((sum, p) => sum + p.rating, 0) / colPlayers.length).toFixed(1) 
      : '0.0'

    return (
      <div 
        className={`flex-1 rounded-2xl p-4 border-2 border-dashed ${bgClass} min-h-[400px] flex flex-col gap-3`}
        onDrop={(e) => handleDrop(e, team)}
        onDragOver={handleDragOver}
      >
        <div className="flex justify-between items-center mb-2 border-b pb-2 border-black/10">
          <h3 className="font-bold text-lg uppercase">{title}</h3>
          <div className="text-right">
            <span className="text-sm font-bold opacity-70 block">{colPlayers.length} Jug.</span>
            {team && <span className="text-xs font-black bg-black/10 px-2 py-1 rounded">Media: {avgRating}</span>}
          </div>
        </div>

        {colPlayers.map(p => (
          <div 
            key={p.member_id}
            draggable
            onDragStart={(e) => handleDragStart(e, p.member_id)}
            className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing flex justify-between items-center transform transition-transform hover:scale-105"
          >
            <span className="font-bold text-gray-900">{p.alias}</span>
            <span className={`text-[10px] font-black px-2 py-1 rounded ${
              p.position === 'GK' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
            }`}>{p.position} ({p.rating})</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-900">Gestor de Alineaciones PRO</h2>
        
        <div className="flex gap-2">
          <button onClick={handleClear} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
            <Eraser size={16}/> Limpiar
          </button>
          <button onClick={handleRandom} className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
            <Shuffle size={16}/> Aleatorio
          </button>
          <button onClick={handleBalanced} className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
            <Scale size={16}/> Balanceado
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {renderColumn('Sin Asignar', null, 'bg-gray-50 border-gray-200 text-gray-800')}
        {renderColumn('Equipo Blanco', 'BLANCO', 'bg-white border-gray-300 text-gray-900 shadow-inner')}
        {renderColumn('Equipo Negro', 'NEGRO', 'bg-gray-900 border-gray-700 text-white shadow-inner')}
      </div>

      <button 
        onClick={handleSave}
        disabled={saving || players.some(p => p.team === null)}
        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl text-lg flex justify-center items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? <Loader2 className="animate-spin" /> : <Save />}
        {players.some(p => p.team === null) ? 'Asigna todos los jugadores para guardar' : 'Confirmar Alineación Definitiva'}
      </button>
    </div>
  )
}