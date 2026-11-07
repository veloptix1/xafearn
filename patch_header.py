file_path = "src/app/dashboard/messages/[id]/page.tsx"

with open(file_path, "r") as f:
    content = f.read()

old_header = """            {isGroup && otherUser?.group_avatar_url ? (
              <img src={otherUser.group_avatar_url} alt="Groupe" className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-sm ${isGroup ? 'bg-emerald-500' : 'bg-gradient-to-br from-sky-400 to-blue-500'}`}>
                {otherUser?.full_name?.charAt(0) || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm truncate">{otherUser?.full_name}</p>
              <div className="flex items-center h-4">
                {isGroup ? (
                  <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Icons.Users /> Groupe</p>
                ) : isOtherTyping ? (
                  <TypingDots />
                ) : (
                  <p className={`text-[10px] font-bold ${isOtherOnline ? 'text-emerald-500' : 'text-slate-400'}`}>{isOtherOnline ? 'En ligne' : 'Hors ligne'}</p>
                )}
              </div>
            </div>"""

new_header = """            {/* 🔥 Zone cliquable : Avatar + Nom */}
            <button 
              onClick={() => isGroup && router.push(`/dashboard/messages/${conversationId}/settings`)} 
              className={`flex items-center gap-3 flex-1 min-w-0 text-left ${isGroup ? 'cursor-pointer active:opacity-70' : 'cursor-default'}`}
            >
              {isGroup && otherUser?.group_avatar_url ? (
                <img src={otherUser.group_avatar_url} alt="Groupe" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-sm ${isGroup ? 'bg-emerald-500' : 'bg-gradient-to-br from-sky-400 to-blue-500'}`}>
                  {otherUser?.full_name?.charAt(0) || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm truncate">{otherUser?.full_name}</p>
                <div className="flex items-center h-4">
                  {isGroup ? (
                    <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Icons.Users /> Groupe</p>
                  ) : isOtherTyping ? (
                    <TypingDots />
                  ) : (
                    <p className={`text-[10px] font-bold ${isOtherOnline ? 'text-emerald-500' : 'text-slate-400'}`}>{isOtherOnline ? 'En ligne' : 'Hors ligne'}</p>
                  )}
                </div>
              </div>
            </button>"""

if old_header in content:
    content = content.replace(old_header, new_header)
    with open(file_path, "w") as f:
        f.write(content)
    print("✅ Header modifié avec succès !")
else:
    print("❌ Impossible de trouver le bloc exact. Vérifie le fichier.")
