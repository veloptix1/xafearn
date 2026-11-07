import re

file_path = "src/app/dashboard/page.tsx"

with open(file_path, "r") as f:
    content = f.read()

# La carte à insérer
api_card = """              <Link href="/dashboard/partenaire" className="block bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl shadow-md relative overflow-hidden active:scale-95 transition text-white">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                </div>
                <h3 className="font-bold text-sm">API</h3>
                <p className="text-[10px] text-indigo-100">Portail développeur</p>
              </Link>

"""

# La cible : la carte des jetons (la dernière du bloc)
target = """              <Link href="/dashboard/jetons/acheter" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">"""

# Vérifier si la carte API est déjà présente
if 'href="/dashboard/partenaire"' in content:
    print("✅ La carte API est déjà présente dans le fichier.")
else:
    if target in content:
        # Insérer la carte API juste après la carte des jetons
        # On va chercher la fin de la balise </Link> de la carte jetons
        jetons_start = content.find(target)
        jetons_end = content.find("</Link>", jetons_start) + len("</Link>\n\n")
        
        new_content = content[:jetons_end] + api_card + content[jetons_end:]
        
        with open(file_path, "w") as f:
            f.write(new_content)
        print("✅ Carte API insérée avec succès !")
    else:
        print("❌ Impossible de trouver la cible (carte jetons).")
