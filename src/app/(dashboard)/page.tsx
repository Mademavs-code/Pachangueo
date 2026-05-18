import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, Calendar, ArrowRight, Clock, Megaphone } from 'lucide-react'
import { createAnnouncement } from '@/actions/posts'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 🛡️ ESCUDO ANTI-INVITADOS: Si es invitado, lo devolvemos a su partido
  const { data: profileData } = await supabase.from('profiles').select('is_guest').eq('id', user.id).single()
  
  // SOLUCIÓN 1: Casteo para evitar el error never en is_guest
  const profile = profileData as { is_guest: boolean } | null
  
  if (profile?.is_guest) {
    const { data: matchInfoData } = await supabase.from('match_players').select('match_id').eq('member_id', user.id).limit(1).single()
    
    // SOLUCIÓN 2: Casteo para evitar el error never en match_id
    const matchInfo = matchInfoData as { match_id: string } | null
    
    if (matchInfo) {
      redirect(`/matches/${matchInfo.match_id}`)
    } else {
      redirect('/login') // Si por algún error no tiene partido, lo echamos
    }
  }

  const { data: membershipData } = await supabase
    .from('community_members')
    .select('community_id, role')
    .eq('profile_id', user.id) 
    .single()

  if (!membershipData) redirect('/setup')
  const membership = membershipData as { community_id: string, role: string }
  const isAdmin = membership.role === 'ADMIN'

  const { data: postsData } = await supabase
    .from('posts')
    .select(`
      id, content, post_type, match_id, created_at,
      author:profiles!posts_author_id_fkey ( alias )
    `)
    .eq('community_id', membership.community_id)
    .order('created_at', { ascending: false })

  const posts = (postsData as any[]) || []

  return (
    <div className="space-y-8">
      {/* Cabecera del Tablón */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tablón de Anuncios</h1>
          <p className="text-gray-500">Mantente al día de lo que ocurre en tu comunidad.</p>
        </div>
        
        {isAdmin && (
          <Link 
            href="/matches/new" 
            className="inline-flex items-center justify-center gap-2 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all hover:opacity-90 bg-[var(--color-primary)]"
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
        }} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col gap-3">
          <input type="hidden" name="community_id" value={membership.community_id} />
          <textarea 
            name="content" required placeholder="¿Tienes algún comunicado para la comunidad?"
            className="w-full resize-none border-0 bg-gray-50 rounded-xl p-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[var(--color-primary)] min-h-[100px]"
          ></textarea>
          <div className="flex justify-end">
            <button type="submit" className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
              <Megaphone size={16} /> Publicar Anuncio
            </button>
          </div>
        </form>
      )}

      {/* Feed de Posts */}
      <div className="grid gap-6">
        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 text-gray-400 rounded-full mb-4">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No hay anuncios todavía</h3>
          </div>
        ) : (
          posts.map((post) => {
            const date = new Date(post.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            const isMatch = post.post_type === 'PARTIDO'

            return (
              <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:border-[var(--color-primary)] transition-colors group/card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold bg-gray-100 text-[var(--color-primary)] border border-gray-200">
                      {post.author?.alias?.charAt(0).toUpperCase() || 'J'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{post.author?.alias || 'Administración'}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500"><Clock size={12} /><span>{date}</span></div>
                    </div>
                  </div>
                  
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${isMatch ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    {isMatch ? 'NUEVO PARTIDO' : 'COMUNICADO'}
                  </span>
                </div>

                <div className="text-gray-800 leading-relaxed mb-6 whitespace-pre-wrap">{post.content}</div>

                {isMatch && post.match_id && (
                  <Link 
                    href={`/matches/${post.match_id}`}
                    className="flex items-center justify-between w-full bg-gray-50 border border-gray-100 group-hover/card:border-[var(--color-primary)] text-[var(--color-primary)] px-5 py-3 rounded-xl font-bold transition-all group/btn"
                  >
                    <span className="flex items-center gap-2"><Calendar size={18} /> Ver detalles e inscribirse</span>
                    <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}