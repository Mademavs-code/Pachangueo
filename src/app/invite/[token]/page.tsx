import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckCircle2, AlertCircle, Users } from 'lucide-react'

export default async function InvitePage(props: { 
  params: Promise<{ token: string }>,
  searchParams: Promise<{ error?: string }>
}) {
  const { token } = await props.params
  const searchParams = await props.searchParams
  const supabase = await createClient()

  // 1. Buscamos la comunidad
  const { data: communityData } = await supabase
    .from('communities')
    .select('id, name')
    .eq('invite_token', token)
    .single()

  const community = communityData as { id: string; name: string } | null

  if (!community) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold mb-2">Enlace no válido</h1>
          <p className="text-gray-500">Esta invitación ha caducado o no existe.</p>
        </div>
      </div>
    )
  }

  // 2. Verificamos logueo
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?callback=/invite/${token}`)

  // 3. Obtenemos su perfil (¡AÑADIMOS 'alias' A LA CONSULTA!)
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, alias')
    .eq('id', user.id)
    .single()
    
  const profile = profileData as { id: string, alias: string } | null
  
  if (!profile) redirect(`/setup?callback=/invite/${token}`)

  // 4. Verificamos si YA está en la comunidad
  const { data: existingMember } = await supabase
    .from('community_members')
    .select('id')
    .eq('community_id', community.id)
    .eq('profile_id', profile.id)
    .single()

  if (existingMember) redirect('/')

  // 5. Función Action blindada
  async function acceptInvite() {
    "use server"
    const supabaseServer = await createClient()
    
    // Capturamos el error e insertamos el ALIAS extraído del perfil
    const { error: insertError } = await supabaseServer.from('community_members').insert({
      community_id: community!.id,
      profile_id: profile!.id,
      role: 'MEMBER',
      alias: profile!.alias || 'Jugador Invitado' // <-- ¡AQUÍ ESTÁ LA MAGIA!
    } as any)
    
    if (insertError) {
      console.error("Error SQL al insertar miembro:", insertError.message)
      redirect(`/invite/${token}?error=true`)
    }
    
    redirect('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-lg text-center max-w-md w-full border border-gray-100">
        
        {searchParams?.error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm font-bold flex items-center gap-2 text-left">
            <AlertCircle size={20} />
            Hubo un problema al unirte a la comunidad. Revisa la consola o contacta al administrador.
          </div>
        )}

        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Users size={40} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Te han invitado</h1>
        <p className="text-gray-500 mb-8 text-lg">
          Únete a la comunidad <span className="font-bold text-indigo-600">{community.name}</span>
        </p>
        
        <form action={acceptInvite}>
          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-xl shadow-md transition-all transform hover:scale-105 flex justify-center items-center gap-2">
            <CheckCircle2 /> Aceptar Invitación
          </button>
        </form>
      </div>
    </div>
  )
}