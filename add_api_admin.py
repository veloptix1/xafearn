file_path = "src/app/dashboard/admin/page.tsx"

with open(file_path, "r") as f:
    content = f.read()

# Vérifier si la carte API est déjà là
if 'href="/dashboard/admin/api"' in content:
    print("✅ La carte API est déjà présente dans le fichier.")
else:
    # La carte à ajouter
    api_card = """          <Link href="/dashboard/admin/api" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">API</h3>
            <p className="text-[10px] text-slate-500">Gérer les partenaires</p>
          </Link>

"""
    # Cible : la carte Support (juste avant la carte Paramètres)
    target = """          <Link href="/dashboard/admin/support" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">"""
    
    if target in content:
        # Insérer la carte API avant la carte Support
        new_content = content.replace(target, api_card + target)
        with open(file_path, "w") as f:
            f.write(new_content)
        print("✅ Carte API insérée avec succès !")
    else:
        print("❌ Cible introuvable.")
