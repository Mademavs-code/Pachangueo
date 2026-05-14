import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar' // <-- Importamos el componente

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Obtenemos el usuario de Auth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Buscamos el ID real de su perfil
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profileData) {
    redirect('/setup')
  }

  // Casteo seguro para evitar el error 'never'
  const profile = profileData as unknown as { id: string }

  // 3. Buscamos si este PERFIL pertenece a alguna comunidad
  const { data: membershipData } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('profile_id', profile.id)
    .limit(1)
    .single()

  if (!membershipData) {
    redirect('/setup')
  }

  // Casteo seguro para el futuro uso de community_id
  const membership = membershipData as unknown as { community_id: string }

  // 4. Si pasa todos los controles, renderizamos el Dashboard con el Sidebar
  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      {/* Añadimos el Menú Lateral */}
      <Sidebar />

      {/* Contenedor principal: añadimos ml-64 para dejarle espacio al Sidebar */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto ml-64">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

    </div>
  )
}