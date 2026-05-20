import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Settings, Shield, Link as LinkIcon, Palette } from 'lucide-react'
import InviteLinkBox from './InviteLinkBox'
import { updateCommunitySettings } from '@/actions/communities'
import { getActiveCommunityId } from '@/lib/community'

export default async function SettingsPage() {
  const supabase = await createClient()

  // 1. Validar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Obtener el perfil
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()
    
  const profile = profileData as { id: string } | null
  
  if (!profile) redirect('/setup')

  // 3. NUEVA LÓGICA MULTICOMUNIDAD (Igual que en el Tablón)
  const { data: membershipsData } = await supabase
    .from('community_members')
    .select(`
      community_id,
      role,
      communities ( id, name, invite_token, primary_color, secondary_color )
    `)
    .eq('profile_id', profile.id)

  type CommunityInfo = { 
    id: string, 
    name: string, 
    invite_token: string, 
    primary_color: string, 
    secondary_color: string 
  }

  const memberships = (membershipsData as { community_id: string, role: string, communities: CommunityInfo }[]) || []
  
  if (memberships.length === 0) redirect('/setup')

  // 4. Buscar la comunidad activa usando la cookie
  const activeCommunityId = await getActiveCommunityId(memberships)
  const activeMembership = memberships.find(m => m.community_id === activeCommunityId)

  // Si no es admin de la comunidad activa, no puede ver configuración
  if (!activeMembership || activeMembership.role !== 'ADMIN' || !activeMembership.communities) {
    redirect('/')
  }

  // Desempaquetar si devuelve un array de un solo elemento o directamente el objeto
  const community = Array.isArray(activeMembership.communities) 
    ? activeMembership.communities[0] 
    : activeMembership.communities;

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
        
        {community.invite_token ? (
          <InviteLinkBox token={community.invite_token} />
        ) : (
          <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl text-sm font-medium">
            ⚠️ Tu comunidad aún no tiene un token de invitación generado.
          </div>
        )}
      </div>

      {/* Tarjeta de Personalización de Apariencia */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center">
            <Palette size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Apariencia de la Comunidad</h2>
            <p className="text-sm text-gray-500">Personaliza el nombre y las equipaciones</p>
          </div>
        </div>
        
        <form action={async (formData) => {
          "use server"
          await updateCommunitySettings(formData)
        }} className="space-y-6">
          <input type="hidden" name="community_id" value={community.id} />

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Nombre de la Comunidad</label>
            <input 
              type="text" 
              name="name" 
              defaultValue={community.name} 
              className="block w-full rounded-xl border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Color Principal</label>
              <div className="flex items-center gap-3">
                <input type="color" name="primaryColor" defaultValue={community.primary_color || '#2563eb'} className="h-12 w-20 rounded-lg cursor-pointer border-0 p-1 bg-gray-50 ring-1 ring-inset ring-gray-300" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Color Secundario</label>
              <div className="flex items-center gap-3">
                <input type="color" name="secondaryColor" defaultValue={community.secondary_color || '#ffffff'} className="h-12 w-20 rounded-lg cursor-pointer border-0 p-1 bg-gray-50 ring-1 ring-inset ring-gray-300" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button type="submit" className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-sm">
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>

    </div>
  )
}