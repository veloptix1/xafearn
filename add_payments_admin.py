file_path = "src/app/dashboard/admin/page.tsx"

with open(file_path, "r") as f:
    content = f.read()

if 'href="/dashboard/admin/paiements"' in content:
    print("✅ Le bouton Paiements est déjà présent.")
else:
    # Chercher la carte "Paramètres"
    target = """          <Link href="/dashboard/admin/parametres" className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">"""

    payments_card = """          <Link href="/dashboard/admin/paiements" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Paiements</h3>
            <p className="text-[10px] text-slate-500">LeekPay / SoleasPay</p>
          </Link>

"""

    if target in content:
        content = content.replace(target, payments_card + target)
        with open(file_path, "w") as f:
            f.write(content)
        print("✅ Bouton Paiements inséré dans l'Admin !")
    else:
        print("❌ Cible 'parametres' introuvable.")
