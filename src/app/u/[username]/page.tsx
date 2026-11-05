import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import FollowButton from './FollowButton'

async function ProfileContent({ idPromise }: { idPromise: Promise<{ username: string }> }) {
  const resolvedParams = await idPromise
  const supabase = await createClient()
  
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', resolvedParams.username).maybeSingle()
  if (!profile) return notFound()

  const { data: posts } = await supabase.from('posts').select('*').eq('user_id', profile.id).order('created_at', { ascending: false })

  const totalCoins = posts?.reduce((acc, p) => acc + (p.total_coins_received || 0), 0) || 0
  const { count: followersCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id)
  const { count: followingCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id)

  let isFollowing = false
  if (currentUser) {
    const { data: follow } = await supabase.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', profile.id).maybeSingle()
    isFollowing = !!follow
  }
  const isMyProfile = currentUser?.id === profile.id

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Bannière de couverture */}
      <div className="h-32 bg-gradient-to-r from-sky-500 to-indigo-600 w-full rounded-b-3xl relative">
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div className="w-24 h-24 bg-slate-900 border-4 border-slate-50 rounded-full flex items-center justify-center text-4xl font-black text-white shadow-lg">
            {profile.full_name?.charAt(0)}
          </div>
        </div>
      </div>

      <div className="px-4 mt-16 text-center">
        <h1 className="text-2xl font-black text-slate-900">{profile.full_name}</h1>
        <p className="text-sm text-slate-500 mb-6">Créateur XAFEARN</p>
        
        {/* Stats */}
        <div className="flex justify-center gap-6 mb-6">
          <div className="text-center">
            <p className="text-lg font-black text-slate-900">{posts?.length || 0}</p>
            <p className="text-xs font-bold text-slate-500 uppercase">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-slate-900">{followersCount || 0}</p>
            <p className="text-xs font-bold text-slate-500 uppercase">Abonnés</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-slate-900">{followingCount || 0}</p>
            <p className="text-xs font-bold text-slate-500 uppercase">Abonnements</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-amber-500">🪙 {totalCoins}</p>
            <p className="text-xs font-bold text-slate-500 uppercase">Jetons</p>
          </div>
        </div>

        {!isMyProfile && currentUser && (
          <div className="flex justify-center mb-8">
            <FollowButton currentUserId={currentUser.id} profileId={profile.id} initialIsFollowing={isFollowing} />
          </div>
        )}
      </div>

      <div className="px-4">
        <h2 className="font-bold text-slate-900 mb-3 text-left border-b border-slate-200 pb-2">Publications</h2>
        <div className="grid grid-cols-3 gap-1">
          {posts?.length === 0 ? (
            <p className="col-span-3 text-center text-slate-500 py-8">Aucune publication.</p>
          ) : (
            posts?.map(post => (
              <div key={post.id} className="aspect-square bg-slate-100 rounded-md overflow-hidden relative group">
                {post.content_type === 'image' || post.content_type === 'video' ? (
                  <img src={post.image_url!} className="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2 bg-gradient-to-br from-slate-800 to-slate-900 text-white text-[10px] text-center font-medium">
                    {post.text_content?.substring(0, 40)}...
                  </div>
                )}
                {post.content_type === 'video' && (
                  <div className="absolute top-1 right-1 bg-black/50 p-1 rounded-md text-white">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/reseau" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Profil</h1>
      </header>

      <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>}>
        <ProfileContent idPromise={params} />
      </Suspense>
    </main>
  )
}
