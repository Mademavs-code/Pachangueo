"use client"

import { useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Calendar, Clock, Megaphone, Image as ImageIcon, X, Loader2, Edit3, Trash2, Settings } from 'lucide-react'
import { createAnnouncement, deleteAnnouncement, updateAnnouncement } from '@/actions/posts'
import ShareButton from '@/components/ShareButton'

export default function TablonClient({ posts, isAdmin, activeCommunityId }: { posts: any[], isAdmin: boolean, activeCommunityId: string }) {
  
  // Estados para crear anuncio
  const [content, setContent] = useState('')
  const [expiresIn, setExpiresIn] = useState('0')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estados para editar anuncio
  const [editModal, setEditModal] = useState<any | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // --- HANDLERS PARA CREAR ---
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>, isEdit = false) {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      if (isEdit) {
        setEditModal({ ...editModal, newImageFile: file, previewUrl: url, removeImage: false })
      } else {
        setImageFile(file)
        setImagePreview(url)
      }
    }
  }

  function clearImageSelection(isEdit = false) {
    if (isEdit) {
      setEditModal({ ...editModal, newImageFile: null, previewUrl: null, removeImage: true })
    } else {
      setImageFile(null)
      setImagePreview(null)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append('community_id', activeCommunityId)
    formData.append('content', content)
    formData.append('expires_in_days', expiresIn)
    if (imageFile) formData.append('image', imageFile)

    const res = await createAnnouncement(formData)
    setIsSubmitting(false)

    if (res?.error) {
      alert(res.error)
    } else {
      setContent('')
      setExpiresIn('0')
      setImageFile(null)
      setImagePreview(null)
    }
  }

  // --- HANDLERS PARA BORRAR Y EDITAR ---
  async function handleDelete(postId: string) {
    if (!confirm('🚨 ¿Estás seguro de que deseas borrar este anuncio definitivamente?')) return
    const res = await deleteAnnouncement(postId)
    if (res?.error) alert(res.error)
  }

  function openEditModal(post: any) {
    setEditModal({
      ...post,
      newContent: post.content,
      newExpiresIn: '-1', // -1 significa mantener como está
      previewUrl: post.image_url,
      newImageFile: null,
      removeImage: false
    })
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setIsUpdating(true)

    const formData = new FormData()
    formData.append('community_id', activeCommunityId)
    formData.append('content', editModal.newContent)
    formData.append('expires_in_days', editModal.newExpiresIn)
    formData.append('remove_image', String(editModal.removeImage))
    if (editModal.newImageFile) formData.append('image', editModal.newImageFile)

    const res = await updateAnnouncement(editModal.id, formData)
    setIsUpdating(false)

    if (res?.error) alert(res.error)
    else setEditModal(null)
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pt-4 px-2 md:px-4">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Tablón de Anuncios</h1>
          <p className="text-gray-500 font-medium mt-1">Mantente al día de lo que ocurre en tu comunidad.</p>
        </div>
        
        {isAdmin && (
          <Link href="/matches/new" className="inline-flex items-center justify-center gap-2 text-white px-6 py-3 rounded-2xl font-bold shadow-lg transition-all hover:scale-105" style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 4px 14px color-mix(in srgb, var(--color-primary) 40%, transparent)' }}>
            <Calendar size={18} /> Organizar Partido
          </Link>
        )}
      </div>

      {/* Formulario de Creación */}
      {isAdmin && (
        <form onSubmit={handleCreate} className="bg-white rounded-3xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4 transition-all">
          <textarea 
            value={content} onChange={e => setContent(e.target.value)} required placeholder="¿Tienes algún comunicado para la comunidad?"
            className="w-full resize-none border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 text-gray-900 font-medium placeholder:text-gray-400 focus:ring-0 focus:border-[var(--color-primary)] transition-colors min-h-[120px]"
          />
          
          {/* PREVISUALIZACIÓN DE IMAGEN */}
          {imagePreview && (
            <div className="relative inline-block w-fit mt-2 border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <img src={imagePreview} alt="Previsualización" className="h-40 w-auto object-cover" />
              <button type="button" onClick={() => clearImageSelection(false)} className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors">
                <X size={16} />
              </button>
            </div>
          )}
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-gray-100 pt-4">
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              {/* Botón de Adjuntar Cartel */}
              <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-[var(--color-primary)] transition-colors font-bold text-sm bg-gray-50 hover:bg-gray-100 px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm">
                <ImageIcon size={18} /> <span>Adjuntar Cartel</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, false)} />
              </label>

              {/* Caducidad */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-gray-500">Caducidad:</label>
                <select value={expiresIn} onChange={e => setExpiresIn(e.target.value)} className="text-sm font-medium border-2 border-gray-100 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none focus:border-[var(--color-primary)]">
                  <option value="0">Nunca</option>
                  <option value="1">24 horas</option>
                  <option value="3">3 días</option>
                  <option value="7">1 semana</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full md:w-auto flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 shadow-md disabled:opacity-50">
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Megaphone size={18} />} Publicar
            </button>
          </div>
        </form>
      )}

      {/* Feed de Posts */}
      <div className="grid gap-6">
        {posts.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 text-gray-400 rounded-full mb-4"><MessageSquare size={32} /></div>
            <h3 className="text-lg font-bold text-gray-900">No hay anuncios vigentes</h3>
            <p className="text-gray-500 text-sm mt-1">El administrador aún no ha publicado ningún comunicado.</p>
          </div>
        ) : (
          posts.map((post) => {
            const date = new Date(post.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            return (
              <div key={post.id} className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 md:p-8 hover:shadow-md transition-all overflow-hidden relative group">
                
                {/* Opciones de Administrador */}
                {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(post)} className="p-2 bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 rounded-xl transition-colors"><Edit3 size={18} /></button>
                    <button onClick={() => handleDelete(post.id)} className="p-2 bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded-xl transition-colors"><Trash2 size={18} /></button>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--color-primary)' }}>
                      {post.author?.avatar_url ? <img src={post.author.avatar_url} alt="Avatar" className="w-full h-full object-cover"/> : post.author?.alias?.charAt(0).toUpperCase() || 'J'}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 text-lg leading-tight">{post.author?.alias || 'Administración'}</p>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 mt-0.5"><Clock size={12} /><span>{date}</span></div>
                    </div>
                  </div>
                </div>
                
                <div className="text-gray-700 font-medium leading-relaxed whitespace-pre-wrap pl-1 mb-5">{post.content}</div>

                {post.image_url && (
                  <div className="mb-5 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 flex justify-center">
                    <img src={post.image_url} alt="Cartel del anuncio" className="max-w-full h-auto max-h-[500px] object-contain" />
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-50 flex justify-end">
                  <ShareButton title="Anuncio en Pachangueo" text={`Anuncio de ${post.author?.alias}:\n"${post.content}"`} />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* MODAL DE EDICIÓN */}
      {editModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-gray-900 p-5 flex justify-between items-center text-white">
              <h3 className="text-lg font-black flex items-center gap-2"><Settings size={18} style={{ color: 'var(--color-primary)' }}/> Editar Anuncio</h3>
              <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6 flex flex-col gap-5">
              <textarea 
                value={editModal.newContent} onChange={e => setEditModal({...editModal, newContent: e.target.value})} required 
                className="w-full resize-none border-2 border-gray-100 bg-gray-50 rounded-2xl p-4 text-gray-900 font-medium focus:ring-0 focus:border-[var(--color-primary)] min-h-[120px]"
              />

              {editModal.previewUrl && (
                <div className="relative inline-block w-fit border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  <img src={editModal.previewUrl} alt="Preview" className="h-32 w-auto object-cover" />
                  <button type="button" onClick={() => clearImageSelection(true)} className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors"><X size={16} /></button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <label className="flex items-center justify-center gap-2 cursor-pointer text-gray-600 font-bold text-sm bg-gray-50 hover:bg-gray-100 px-4 py-3 rounded-xl border border-gray-200 w-full sm:w-auto">
                  <ImageIcon size={18} /> <span>{editModal.previewUrl ? 'Cambiar Cartel' : 'Añadir Cartel'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, true)} />
                </label>

                <select value={editModal.newExpiresIn} onChange={e => setEditModal({...editModal, newExpiresIn: e.target.value})} className="text-sm font-bold border-2 border-gray-100 rounded-xl px-4 py-3 bg-gray-50 text-gray-700 outline-none w-full sm:w-auto">
                  <option value="-1">Mantener caducidad actual</option>
                  <option value="0">Quitar caducidad (Nunca)</option>
                  <option value="1">Caduca en 24 horas</option>
                  <option value="3">Caduca en 3 días</option>
                  <option value="7">Caduca en 1 semana</option>
                </select>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={isUpdating} className="w-full flex items-center justify-center gap-2 text-white font-black px-6 py-4 rounded-xl transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50" style={{ backgroundColor: 'var(--color-primary)' }}>
                  {isUpdating ? <Loader2 size={20} className="animate-spin" /> : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}