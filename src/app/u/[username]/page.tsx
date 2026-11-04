import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()
  
  // On cherche l'utilisateur par son nom (full_name)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .ilike('full_name', resolvedParams.username)
    .single()

  if (!profile) return notFound()

  // On récupère ses posts
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  // Calcul du total de jetons reçus
  const totalCoins = posts?.reduce((acc, p) => acc + (p.total_coins_received || 0), 0) || 0

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/reseau" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Profil</h1>
      </header>

      <div className="max-w-2xl mx-auto p-4 mt-4">
        {/* Carte Profil */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center mb-6">
          <div className="w-24 h-24 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-4xl font-black mx-auto mb-4 border-4 border-white shadow-md">
            {profile.full_name?.charAt(0)}
          </div>
          <h1 className="text-2xl font-black text-slate-900">{profile.full_name}</h1>
          <p className="text-sm text-slate-500 mb-4">Créateur XAFEARN</p>
          
          <div className="flex justify-center gap-6 mb-6">
            <div className="text-center">
              <p className="text-2xl font-black text-slate-900">{posts?.length || 0}</p>
              <p className="text-xs font-bold text-slate-500 uppercase">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-amber-500">🪙 {totalCoins}</p>
              <p className="text-xs font-bold text-slate-500 uppercase">Jetons reçus</p>
            </div>
          </div>
        </div>

        {/* Liste des posts */}
        <h2 className="font-bold text-slate-900 mb-4 px-1">Publications</h2>
        <div className="grid grid-cols-2 gap-2">
          {posts?.length === 0 ? (
            <p className="col-span-2 text-center text-slate-500 py-8">Aucune publication.</p>
          ) : (
            posts?.map(post => (
              <div key={post.id} className="aspect-square bg-slate-200 rounded-xl overflow-hidden relative">
                {post.content_type === 'image' || post.content_type === 'video' ? (
                  <img src={post.image_url!} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2 bg-gradient-to-br from-slate-800 to-slate-900 text-white text-xs text-center font-medium">
                    {post.text_content?.substring(0, 50)}...
                  </div>
                )}
                {post.content_type === 'video' && (
                  <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-md text-white">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
