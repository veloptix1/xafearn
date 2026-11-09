file_path = "src/app/dashboard/page.tsx"

with open(file_path, "r") as f:
    content = f.read()

if 'href="/dashboard/bonus"' in content:
    print("✅ Le bouton Bonus est déjà présent.")
else:
    target = """              <Link href="/dashboard/mon-lien" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">"""

    bonus_card = """              <Link href="/dashboard/bonus" className="block bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-md relative overflow-hidden active:scale-95 transition text-white">
                <div className="absolute top-0 right-0 bg-white/20 text-white text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">NEW</div>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="font-bold text-sm">Bonus</h3>
                <p className="text-[10px] text-emerald-100">Parrainage gratuit</p>
              </Link>

"""

    if target in content:
        content = content.replace(target, bonus_card + target)
        with open(file_path, "w") as f:
            f.write(content)
        print("✅ Bouton Bonus inséré dans le Dashboard !")
    else:
        print("❌ Cible 'Mon Lien' introuvable.")
