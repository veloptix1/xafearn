file_path = "src/app/dashboard/page.tsx"

with open(file_path, "r") as f:
    content = f.read()

if 'href="/dashboard/market"' in content:
    print("✅ La carte Market est déjà présente.")
else:
    market_card = """              <Link href="/dashboard/market" className="block bg-slate-900 p-4 rounded-2xl shadow-md relative overflow-hidden active:scale-95 transition text-white">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <h3 className="font-bold text-sm">Market</h3>
                <p className="text-[10px] text-slate-400">Sites & Applications</p>
              </Link>

"""

    # Cible : la carte Jetons
    target = """              <Link href="/dashboard/jetons/acheter" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">"""
    
    if target in content:
        # Trouver la fin de la balise </Link> de la carte Jetons
        start_idx = content.find(target)
        end_idx = content.find("</Link>", start_idx) + len("</Link>\n\n")
        
        new_content = content[:end_idx] + market_card + content[end_idx:]
        
        with open(file_path, "w") as f:
            f.write(new_content)
        print("✅ Carte Market insérée dans le Dashboard utilisateur !")
    else:
        print("❌ Cible introuvable dans le Dashboard utilisateur.")
