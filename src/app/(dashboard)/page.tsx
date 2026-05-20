import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, Calendar, Clock, Megaphone } from 'lucide-react'
import { createAnnouncement } from '@/actions/posts'
import { getActiveCommunityId } from '@/lib/community'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 🛡️ ESCUDO ANTI-INVITADOS
  const { data: profileData } = await supabase.from('profiles').select('is_guest').eq('id', user.id).single()
  const profile = profileData as { is_guest: boolean } | null
  
  if (profile?.is_guest) {
    const { data: matchInfoData } = await supabase.from('match_players').select('match_id').eq('member_id', user.id).limit(1).single()
    const matchInfo = matchInfoData as { match_id: string } | null
    if (matchInfo) redirect(`/matches/${matchInfo.match_id}`)
    else redirect('/login')
  }

  // 🔄 LÓGICA MULTICOMUNIDAD
  const { data: membershipsData } = await supabase
    .from('community_members')
    .select('community_id, role')
    .eq('profile_id', user.id) 

  const memberships = (membershipsData as { community_id: string, role: string }[]) || []
  if (memberships.length === 0) redirect('/setup')

  const activeCommunityId = await getActiveCommunityId(memberships)
  const activeMembership = memberships.find(m => m.community_id === activeCommunityId)
  const isAdmin = activeMembership?.role === 'ADMIN'

  // OBTENEMOS SOLO LOS ANUNCIOS (AÑADIMOS avatar_url)
  const { data: postsData } = await supabase
    .from('posts')
    .select(`
      id, content, created_at,
      author:profiles!posts_author_id_fkey ( alias, avatar_url )
    `)
    .eq('community_id', activeCommunityId)
    .eq('post_type', 'ANUNCIO')
    .order('created_at', { ascending: false })

  const posts = (postsData as any[]) || []

  return (
    <div className="space-y-8 max-w-5xl mx-auto pt-4 px-2 md:px-4">
      {/* Cabecera del Tablón */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Tablón de Anuncios</h1>
          <p className="text-gray-500 font-medium mt-1">Mantente al día de lo que ocurre en tu comunidad.</p>
        </div>
        
        {isAdmin && (
          <Link 
            href="/matches/new" 
            className="inline-flex items-center justify-center gap-2 text-white px-6 py-3 rounded-2xl font-bold shadow-lg transition-all hover:scale-105"
            style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 4px 14px color-mix(in srgb, var(--color-primary) 40%, transparent)' }}
          >
            <Calendar size={18} />
            Organizar Partido
          </Link>
        )}
      </div>

      {/* Formulario ANUNCIOS */}
      {isAdmin && (
        <form action={async (formData) => {
          "use server"
          await createAnnouncement(formData)
        }} className="bg-white rounded-3xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4">
          <input type="hidden" name="community_id" value={activeCommunityId} />
          <textarea 
            name="content" required placeholder="¿Tienes algún comunicado para la comunidad?"
            className="w-full resize-none border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 text-gray-900 font-medium placeholder:text-gray-400 focus:ring-0 focus:border-[var(--color-primary)] transition-colors min-h-[120px]"
          ></textarea>
          <div className="flex justify-end">
            <button type="submit" className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 shadow-md">
              <Megaphone size={18} /> Publicar Anuncio
            </button>
          </div>
        </form>
      )}

      {/* Feed de Posts */}
      <div className="grid gap-6">
        {posts.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 text-gray-400 rounded-full mb-4">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No hay anuncios todavía</h3>
            <p className="text-gray-500 text-sm mt-1">El administrador aún no ha publicado ningún comunicado.</p>
          </div>
        ) : (
          posts.map((post) => {
            const date = new Date(post.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

            return (
              <div key={post.id} className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 md:p-8 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {/* MODIFICACIÓN: Mostrar Imagen si existe, si no Inicial */}
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white shadow-sm overflow-hidden"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      {post.author?.avatar_url ? (
                        <img 
                          src={post.author.avatar_url} 
                          alt={`Avatar de ${post.author?.alias}`} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        post.author?.alias?.charAt(0).toUpperCase() || 'J'
                      )}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 text-lg leading-tight">{post.author?.alias || 'Administración'}</p>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 mt-0.5">
                        <Clock size={12} /><span>{date}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 uppercase tracking-widest border border-gray-200">
                    Comunicado
                  </span>
                </div>
                <div className="text-gray-700 font-medium leading-relaxed whitespace-pre-wrap pl-1">{post.content}</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}