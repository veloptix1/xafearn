file_path = "src/app/dashboard/messages/[id]/page.tsx"

with open(file_path, "r") as f:
    lines = f.readlines()

# La ligne 635 dans l'erreur correspond à l'index 634 en Python (qui commence à 0)
# On vérifie que c'est bien un </a> avant de le remplacer
if len(lines) > 634:
    print(f"Ligne avant : {lines[634].strip()}")
    if "</a>" in lines[634]:
        lines[634] = lines[634].replace("</a>", "</button>")
        print(f"Ligne après : {lines[634].strip()}")
        with open(file_path, "w") as f:
            f.writelines(lines)
        print("✅ Correction effectuée à la ligne 635 !")
    else:
        print("❌ La ligne 635 ne contient pas </a>. On cherche ailleurs...")
else:
    print("❌ Le fichier est trop court.")
