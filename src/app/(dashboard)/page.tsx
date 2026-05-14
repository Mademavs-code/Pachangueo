import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, Calendar, ArrowRight, User, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Obtener el usuario
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Obtener la comunidad del usuario (necesaria para filtrar los posts)
  const { data: membershipData } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('profile_id', user.id) // Usamos user.id porque en profiles el id es el Auth ID
    .single()

  if (!membershipData) redirect('/setup')
  const membership = membershipData as unknown as { community_id: string }

  // 3. Obtener los posts de la comunidad con el alias del autor
  // Hacemos un JOIN con profiles para mostrar quién escribió el post
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      post_type,
      match_id,
      created_at,
      author:profiles!posts_author_id_fkey (
        alias
      )
    `)
    .eq('community_id', membership.community_id)
    .order('created_at', { ascending: false })

  const posts = (postsData as unknown as any[]) || []

  return (
    <div className="space-y-8">
      {/* Cabecera del Tablón */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tablón de Anuncios</h1>
          <p className="text-gray-500">Mantente al día de lo que ocurre en tu comunidad.</p>
        </div>
        
        {/* Botón rápido para admins (opcional) */}
        <Link 
          href="/matches/new" 
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm"
        >
          <Calendar size={18} />
          Organizar Partido
        </Link>
      </div>

      {/* Feed de Posts */}
      <div className="grid gap-6">
        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 text-gray-400 rounded-full mb-4">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No hay anuncios todavía</h3>
            <p className="text-gray-500 max-w-xs mx-auto mt-1">
              Cuando alguien publique un anuncio o se cree un partido, aparecerá aquí.
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const date = new Date(post.created_at).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })

            return (
              <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:border-blue-200 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                      {post.author?.alias?.charAt(0).toUpperCase() || 'J'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{post.author?.alias || 'Jugador'}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock size={12} />
                        <span>{date}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Etiqueta de tipo de post */}
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    post.post_type === 'PARTIDO' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                  }`}>
                    {post.post_type}
                  </span>
                </div>

                <div className="text-gray-800 leading-relaxed mb-6">
                  {post.content}
                </div>

                {/* Si el post es un partido, mostramos el botón de acción directa */}
                {post.post_type === 'PARTIDO' && post.match_id && (
                  <Link 
                    href={`/matches/${post.match_id}`}
                    className="flex items-center justify-between w-full bg-blue-50 hover:bg-blue-100 text-blue-700 px-5 py-3 rounded-xl font-bold transition-colors group"
                  >
                    <span className="flex items-center gap-2">
                      <Calendar size={18} />
                      Ver detalles del partido e inscribirse
                    </span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
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