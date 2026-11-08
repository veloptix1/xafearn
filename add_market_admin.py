file_path = "src/app/dashboard/admin/page.tsx"

with open(file_path, "r") as f:
    content = f.read()

if 'href="/dashboard/admin/market"' in content:
    print("✅ La carte Market Admin est déjà présente.")
else:
    market_admin_card = """          <Link href="/dashboard/admin/market" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Market</h3>
            <p className="text-[10px] text-slate-500">Gérer les produits</p>
          </Link>

"""

    # Cible : la carte API (qu'on a ajoutée précédemment)
    target = """          <Link href="/dashboard/admin/api" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">"""
    
    if target in content:
        # Insérer la carte Market juste après la carte API
        start_idx = content.find(target)
        end_idx = content.find("</Link>", start_idx) + len("</Link>\n\n")
        
        new_content = content[:end_idx] + market_admin_card + content[end_idx:]
        
        with open(file_path, "w") as f:
            f.write(new_content)
        print("✅ Carte Market insérée dans le Dashboard Admin !")
    else:
        print("❌ Cible (carte API) introuvable dans le Dashboard Admin.")
