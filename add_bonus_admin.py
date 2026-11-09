file_path = "src/app/dashboard/admin/page.tsx"

with open(file_path, "r") as f:
    content = f.read()

if 'href="/dashboard/admin/bonus"' in content:
    print("✅ Le bouton Bonus Admin est déjà présent.")
else:
    # Chercher la carte "Paramètres" (souvent en dernier)
    target = """          <Link href="/dashboard/admin/parametres" className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">"""

    bonus_admin_card = """          <Link href="/dashboard/admin/bonus" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Bonus</h3>
            <p className="text-[10px] text-slate-500">Parrainage gratuit</p>
          </Link>

"""

    if target in content:
        content = content.replace(target, bonus_admin_card + target)
        with open(file_path, "w") as f:
            f.write(content)
        print("✅ Bouton Bonus inséré dans l'Admin !")
    else:
        print("❌ Cible 'parametres' introuvable. Cherche la carte Paramètres manuellement.")
