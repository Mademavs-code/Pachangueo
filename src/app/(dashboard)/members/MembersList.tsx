"use client"

import { useState, useMemo } from 'react'
import { Search, Shield, ShieldOff, UserX, Loader2, Star, Ghost, Edit2, X, CheckCircle2, Camera, Trophy, Flame, Clock, Coins } from 'lucide-react'
import { changeMemberRole, kickMember, updateMemberProfile } from '@/actions/members'
import { createClient } from '@/lib/supabase/client'

type Member = {
  profile_id: string
  role: string
  alias: string
  position: string
  is_guest: boolean
  avatar_url: string | null
  stats: {
    matches: number;
    mvps: number;
    avg_rating: number;
    lates: number;
    no_shows: number;
    debts: number;
  }
}

const POSITION_NAMES: Record<string, string> = {
  'POR': 'Porteros',
  'DEF': 'Defensas',
  'MED': 'Centrocampistas',
  'DEL': 'Delanteros',
  'N/A': 'Sin Posición Definida'
}

const POSITION_ORDER = ['POR', 'DEF', 'MED', 'DEL', 'N/A']

export default function MembersList({ 
  members, 
  isAdmin, 
  currentUserId,
  communityId 
}: { 
  members: Member[]
  isAdmin: boolean
  currentUserId: string
  communityId: string
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const [editModal, setEditModal] = useState<{ 
    isOpen: boolean, 
    profileId: string, 
    alias: string, 
    position: string,
    avatarFile: File | null,
    avatarPreview: string | null
  } | null>(null)

  const filteredMembers = members.filter(m => 
    m.alias.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const groupedMembers = useMemo(() => {
    const groups: Record<string, Member[]> = { 'POR': [], 'DEF': [], 'MED': [], 'DEL': [], 'N/A': [] }
    filteredMembers.forEach(m => {
      const pos = groups[m.position] ? m.position : 'N/A'
      groups[pos].push(m)
    })
    return groups
  }, [filteredMembers])

  async function handleRoleChange(profileId: string, newRole: 'ADMIN' | 'MEMBER') {
    if (!confirm(`¿Seguro que quieres hacer a este jugador ${newRole}?`)) return
    setLoadingAction(profileId)
    const res = await changeMemberRole(communityId, profileId, newRole)
    if (res?.error) alert(res.error)
    else setSelectedMember(null) 
    setLoadingAction(null)
  }

  async function handleKick(profileId: string, alias: string) {
    if (!confirm(`🚨 ¿Estás totalmente seguro de que quieres EXPULSAR a ${alias} de la comunidad?`)) return
    setLoadingAction(profileId)
    const res = await kickMember(communityId, profileId)
    if (res?.error) alert(res.error)
    else setSelectedMember(null)
    setLoadingAction(null)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && editModal) {
      const previewUrl = URL.createObjectURL(file)
      setEditModal({ ...editModal, avatarFile: file, avatarPreview: previewUrl })
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!editModal) return
    setLoadingAction('editing')
    
    let newAvatarUrl: string | undefined = undefined;

    if (editModal.avatarFile) {
      const supabase = createClient()
      const fileExt = editModal.avatarFile.name.split('.').pop()
      const fileName = `${editModal.profileId}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, editModal.avatarFile, { cacheControl: '3600', upsert: true })

      if (uploadError) {
        alert("Error subiendo la imagen: " + uploadError.message)
        setLoadingAction(null)
        return
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      newAvatarUrl = publicUrlData.publicUrl
    }

    const res = await updateMemberProfile(communityId, editModal.profileId, editModal.alias, editModal.position, newAvatarUrl)
    
    setLoadingAction(null)
    if (res?.error) {
      alert(res.error)
    } else {
      setEditModal(null)
      if (selectedMember && selectedMember.profile_id === editModal.profileId) setSelectedMember(null)
    }
  }

  function openEditFromDetail(member: Member) {
    setSelectedMember(null)
    setEditModal({
      isOpen: true,
      profileId: member.profile_id,
      alias: member.alias,
      position: member.position === 'N/A' ? '' : member.position,
      avatarFile: null,
      avatarPreview: member.avatar_url
    })
  }

  return (
    <div className="space-y-12 relative">
      
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-3">
        <Search className="text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar jugador por alias..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 font-medium placeholder:text-gray-400"
        />
      </div>

      {POSITION_ORDER.map((posCode) => {
        const playersInPos = groupedMembers[posCode]
        if (playersInPos.length === 0) return null

        return (
          <div key={posCode} className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900 border-b-2 border-gray-100 pb-2">
              {POSITION_NAMES[posCode]}
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {playersInPos.map((member) => (
                <div 
                  key={member.profile_id} 
                  onClick={() => setSelectedMember(member)}
                  className="relative rounded-2xl overflow-hidden cursor-pointer group aspect-[3/4] bg-gradient-to-b from-gray-100 to-gray-200 shadow-sm hover:shadow-2xl transition-all border border-gray-200/50"
                >
                  {member.avatar_url ? (
                    <img 
                      src={member.avatar_url} 
                      alt={member.alias} 
                      className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-700 ease-in-out" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-7xl font-black text-gray-300 group-hover:scale-110 transition-transform duration-700">
                      {member.alias.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a1128] via-[#0a1128]/40 to-transparent opacity-90 transition-opacity group-hover:opacity-100"></div>
                  
                  <div className="absolute bottom-0 left-0 p-4 w-full">
                    <div className="flex justify-between items-end">
                      <div>
                        {member.profile_id === currentUserId && <span className="inline-block mb-1 text-[8px] bg-[var(--color-primary)] text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">Tú</span>}
                        <h3 className="text-xl md:text-2xl font-black text-white leading-tight drop-shadow-md">{member.alias}</h3>
                        <p className="text-[10px] md:text-xs font-bold text-gray-300 uppercase tracking-widest mt-0.5 drop-shadow-md">
                          {posCode !== 'N/A' ? POSITION_NAMES[posCode].slice(0, -1) : 'Jugador'}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        {member.role === 'ADMIN' && (
                          <span title="Administrador">
                            <Star size={20} className="text-yellow-400 fill-current drop-shadow-md" />
                          </span>
                        )}
                        {member.is_guest && (
                          <span title="Invitado Parche">
                            <Ghost size={20} className="text-gray-300 drop-shadow-md" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {filteredMembers.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-gray-400 font-medium text-lg">No se han encontrado jugadores con ese alias.</p>
        </div>
      )}

      {/* MODAL DE DETALLE DEL JUGADOR (CORREGIDO PARA MÓVILES) */}
      {selectedMember && !editModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-end md:items-center justify-center md:p-4 backdrop-blur-sm transition-all">
          <div className="bg-white md:rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col md:flex-row relative h-[90vh] md:h-auto rounded-t-3xl overflow-hidden">
            
            {/* BOTÓN CERRAR FIJO */}
            <button 
              onClick={() => setSelectedMember(null)} 
              className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-colors shadow-lg backdrop-blur-md"
            >
              <X size={20} />
            </button>

            {/* FOTO JUGADOR */}
            <div className="w-full md:w-[45%] h-64 md:h-auto md:min-h-[500px] bg-gray-100 relative shrink-0">
              {selectedMember.avatar_url ? (
                <img src={selectedMember.avatar_url} alt={selectedMember.alias} className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl md:text-9xl font-black text-gray-300">
                  {selectedMember.alias.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Degradado para que el texto resalte en móvil si la imagen es clara */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:hidden pointer-events-none"></div>
            </div>

            {/* CONTENIDO SCROLLABLE */}
            <div className="w-full md:w-[55%] flex flex-col flex-1 overflow-y-auto bg-white">
              <div className="p-6 md:p-10 flex flex-col justify-center min-h-full">
                
                {/* Cabecera (Sube hacia arriba en móvil para pisar un poco la foto) */}
                <div className="mb-6 -mt-16 md:mt-0 relative z-10">
                  <p className="text-[var(--color-primary)] font-black tracking-widest uppercase text-xs md:text-sm mb-1 drop-shadow-md md:drop-shadow-none">
                    {selectedMember.position !== 'N/A' ? POSITION_NAMES[selectedMember.position].slice(0, -1) : 'Sin Posición'}
                  </p>
                  <h2 className="text-4xl font-black text-white md:text-gray-900 leading-none mb-4 drop-shadow-md md:drop-shadow-none">{selectedMember.alias}</h2>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedMember.role === 'ADMIN' && (
                      <span className="flex items-center gap-1 text-xs font-black uppercase bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg border border-yellow-200 shadow-sm"><Star size={14} className="fill-current"/> Administrador</span>
                    )}
                    {selectedMember.is_guest && (
                      <span className="flex items-center gap-1 text-xs font-black uppercase bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"><Ghost size={14}/> Invitado</span>
                    )}
                  </div>
                </div>

                {/* Grid de Estadísticas */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6">
                  <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                    <Flame size={20} className="text-orange-500 mb-1" />
                    <span className="text-2xl font-black text-gray-900 leading-none">{selectedMember.stats.matches}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Partidos</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                    <Star size={20} className="text-blue-500 mb-1 fill-current opacity-20" />
                    <span className="text-2xl font-black text-gray-900 leading-none">{selectedMember.stats.avg_rating || '-'}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Nota Media</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                    <Trophy size={20} className="text-yellow-500 mb-1" />
                    <span className="text-2xl font-black text-gray-900 leading-none">{selectedMember.stats.mvps}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Premios MVP</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                    <Clock size={20} className={selectedMember.stats.lates > 0 ? 'text-orange-500' : 'text-gray-400'} />
                    <span className="text-2xl font-black text-gray-900 leading-none">{selectedMember.stats.lates}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Tardanzas</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                    <UserX size={20} className={selectedMember.stats.no_shows > 0 ? 'text-red-500' : 'text-gray-400'} />
                    <span className="text-2xl font-black text-gray-900 leading-none">{selectedMember.stats.no_shows}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Faltas</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                    <Coins size={20} className={selectedMember.stats.debts > 0 ? 'text-red-500' : 'text-gray-400'} />
                    <span className="text-2xl font-black text-gray-900 leading-none">{selectedMember.stats.debts}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Deudas</span>
                  </div>
                </div>

                {/* Controles del Administrador / Edición */}
                <div className="mt-auto space-y-3 pt-6 border-t border-gray-100 pb-8 md:pb-0">
                  {(isAdmin || selectedMember.profile_id === currentUserId) && (
                    <button 
                      onClick={() => openEditFromDetail(selectedMember)}
                      className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm"
                    >
                      <Edit2 size={18} /> Editar Perfil / Foto
                    </button>
                  )}

                  {isAdmin && selectedMember.profile_id !== currentUserId && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      {selectedMember.role === 'MEMBER' ? (
                        <button onClick={() => handleRoleChange(selectedMember.profile_id, 'ADMIN')} disabled={loadingAction === selectedMember.profile_id} className="flex-1 flex items-center justify-center gap-2 bg-gray-50 hover:bg-yellow-50 hover:text-yellow-700 text-gray-600 font-bold py-3.5 rounded-xl text-xs transition-colors shadow-sm">
                          {loadingAction === selectedMember.profile_id ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />} Ascender Admin
                        </button>
                      ) : (
                        <button onClick={() => handleRoleChange(selectedMember.profile_id, 'MEMBER')} disabled={loadingAction === selectedMember.profile_id} className="flex-1 flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-200 text-gray-600 font-bold py-3.5 rounded-xl text-xs transition-colors shadow-sm">
                          {loadingAction === selectedMember.profile_id ? <Loader2 size={16} className="animate-spin" /> : <ShieldOff size={16} />} Quitar Admin
                        </button>
                      )}
                      <button onClick={() => handleKick(selectedMember.profile_id, selectedMember.alias)} disabled={loadingAction === selectedMember.profile_id} className="p-3.5 sm:w-auto w-full flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition-colors shadow-sm" title="Expulsar">
                        <UserX size={18} /> <span className="sm:hidden ml-2 font-bold text-xs">Expulsar</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-gray-900 p-5 flex justify-between items-center text-white">
              <h3 className="text-lg font-black flex items-center gap-2"><Edit2 size={18}/> Editar Perfil</h3>
              <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleUpdateProfile} className="p-6 space-y-5">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="relative group">
                  {editModal.avatarPreview ? (
                    <img src={editModal.avatarPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 shadow-sm" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-gray-50 flex items-center justify-center text-gray-400 shadow-sm">
                      <Camera size={32} />
                    </div>
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer font-bold text-xs">
                    Cambiar
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
                <p className="text-xs text-gray-500 font-medium">Haz clic para subir una foto</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Alias en la Comunidad</label>
                <input 
                  type="text" required
                  value={editModal.alias}
                  onChange={e => setEditModal({...editModal, alias: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[var(--color-primary)] focus:ring-0 transition-colors font-medium text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Posición Favorita</label>
                <select 
                  value={editModal.position}
                  onChange={e => setEditModal({...editModal, position: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[var(--color-primary)] focus:ring-0 transition-colors font-medium text-gray-900"
                >
                  <option value="">Selecciona una posición (Opcional)</option>
                  <option value="POR">Portero (POR)</option>
                  <option value="DEF">Defensa (DEF)</option>
                  <option value="MED">Centrocampista (MED)</option>
                  <option value="DEL">Delantero (DEL)</option>
                </select>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={loadingAction === 'editing'} className="w-full bg-[var(--color-primary)] hover:opacity-90 text-white font-bold py-3.5 px-6 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                  {loadingAction === 'editing' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}