import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Settings, Shield, Link as LinkIcon } from 'lucide-react'
import InviteLinkBox from './InviteLinkBox'

export default async function SettingsPage() {
  const supabase = await createClient()

  // 1. Validar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Obtener el perfil (CORREGIDO: Casteo explícito para evitar el error 'never')
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()
    
  const profile = profileData as { id: string } | null
  
  if (!profile) redirect('/setup')

  // 3. Buscar la comunidad donde el usuario es ADMIN
  const { data: membershipData } = await supabase
    .from('community_members')
    .select(`
      community_id,
      role,
      communities ( id, name, invite_token )
    `)
    .eq('profile_id', profile.id) // <-- ¡Aquí ya no te dará el error!
    .eq('role', 'ADMIN')
    .limit(1)
    .single()

  // Casteos para evitar errores de TypeScript en la membresía
  type CommunityInfo = { id: string, name: string, invite_token: string }
  const membership = membershipData as { community_id: string, role: string, communities: CommunityInfo } | null

  // Si no es admin de ninguna comunidad, lo devolvemos al inicio
  if (!membership || !membership.communities) {
    redirect('/')
  }

  const community = membership.communities

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      
      {/* Cabecera de la página */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-900 p-8 text-white flex items-center gap-5">
          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
            <Settings size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Administración</h1>
            <p className="text-gray-400 font-medium mt-1 flex items-center gap-2">
              <Shield size={16} className="text-indigo-400" />
              Gestionando: <span className="text-white font-bold">{community.name}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tarjeta del Sistema de Invitaciones */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <LinkIcon size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Sistema de Invitaciones</h2>
            <p className="text-sm text-gray-500">Añade nuevos jugadores a la comunidad</p>
          </div>
        </div>
        
        {/* Inyectamos el componente interactivo con el token de la BD */}
        {community.invite_token ? (
          <InviteLinkBox token={community.invite_token} />
        ) : (
          <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl text-sm font-medium">
            ⚠️ Tu comunidad aún no tiene un token de invitación generado. Por favor, contacta con soporte o ejecuta el script de actualización en la base de datos.
          </div>
        )}
      </div>

    </div>
  )
}