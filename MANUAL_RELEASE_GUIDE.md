# Guide de création manuelle de release

Ce guide explique comment créer une release GitHub manuellement en utilisant le fichier .exe généré localement.

## 📋 Prérequis

- Node.js 18+ installé
- npm installé
- Git configuré avec accès au repository GitHub
- Accès en écriture au repository `Durrell-Clair/kcp-desktop-app`

## 🚀 Méthode rapide (recommandée)

### Option A: Automatique avec script Python (NOUVEAU)

Le script Python `create-release-github.py` automatise complètement le processus :

1. **Installer les dépendances Python** (une seule fois) :
   ```bash
   pip install -r scripts/requirements.txt
   ```

2. **Configurer le token GitHub** :
   ```powershell
   # Option 1: Variable d'environnement (recommandé)
   $env:GITHUB_TOKEN = "votre_token_github"
   
   # Option 2: Passer en argument
   python scripts/create-release-github.py --token "votre_token_github"
   ```

3. **Créer la release automatiquement** :
   ```powershell
   # Méthode simple (demande les infos)
   npm run release:github
   
   # Ou directement avec Python
   python scripts/create-release-github.py
   
   # Avec options
   python scripts/create-release-github.py --version v1.0.0 --title "Release v1.0.0" --notes "Description"
   ```

Le script va :
- ✅ Trouver automatiquement le fichier .exe le plus récent
- ✅ Créer un tag Git (optionnel)
- ✅ Créer la release GitHub
- ✅ Uploader le fichier .exe automatiquement

**Pour créer un token GitHub** :
1. Allez sur https://github.com/settings/tokens
2. Cliquez sur "Generate new token (classic)"
3. Donnez-lui un nom (ex: "Release Automation")
4. Cochez la permission `repo` (accès complet aux repositories)
5. Cliquez sur "Generate token"
6. Copiez le token (vous ne pourrez plus le voir après)

### Option B: Manuelle avec scripts helper

### Étape 1: Builder l'application Windows

Vous avez deux options :

#### Option A: Utiliser le script PowerShell (Windows)

```powershell
.\scripts\build-windows.ps1
```

#### Option B: Utiliser la commande npm

```bash
npm run build:win:local
```

Cette commande va :
1. Compiler le code TypeScript
2. Builder l'application pour Windows
3. Générer un fichier `.exe` dans le dossier `dist/`

**Note sur la signature de code**: 
- Par défaut, le build essaiera de signer le code si possible
- Si vous rencontrez des erreurs de privilèges (liens symboliques), activez le **Mode Développeur Windows** (voir [CODE_SIGNING_GUIDE.md](CODE_SIGNING_GUIDE.md))
- Ou utilisez `npm run build:win:unsigned` pour désactiver la signature

Le script affichera l'emplacement exact du fichier généré.

### Étape 2: Créer la release sur GitHub

#### Option A: Utiliser le script helper (recommandé)

```powershell
.\scripts\create-release-manual.ps1
```

Le script va :
1. Trouver automatiquement le fichier .exe le plus récent
2. Vous demander la version, le titre et les notes
3. Optionnellement créer un tag Git
4. Ouvrir la page GitHub Releases dans votre navigateur
5. Afficher les instructions pour uploader le fichier

#### Option B: Créer la release manuellement

1. **Aller sur GitHub Releases**
   - Ouvrez: https://github.com/Durrell-Clair/kcp-desktop-app/releases
   - Cliquez sur "Create a new release"

2. **Créer un tag (si nécessaire)**
   - Si vous n'avez pas encore créé de tag, choisissez "Choose a tag" et créez-en un nouveau
   - Format recommandé: `v1.0.0`, `v1.0.1`, etc.

3. **Remplir les informations**
   - **Tag**: Sélectionnez ou créez un tag (ex: `v1.0.0`)
   - **Title**: Titre de la release (ex: "Release v1.0.0")
   - **Description**: Notes de version (optionnel)

4. **Uploader le fichier .exe**
   - Dans la section "Attach binaries by dropping them here or selecting them"
   - Glissez-déposez le fichier `.exe` depuis le dossier `dist/`
   - Ou cliquez sur "Choose your files" et sélectionnez le fichier

5. **Publier la release**
   - Cliquez sur "Publish release"

## 📁 Emplacement des fichiers générés

Après le build, le fichier `.exe` se trouve généralement dans :

```
electron/dist/
  └── KAMER KASH PME Setup X.X.X.exe
```

Le nom exact peut varier selon la version. Le script de build affichera le chemin exact.

## 🔖 Gestion des tags Git

### Créer un tag manuellement

Si vous préférez créer le tag vous-même :

```bash
# Créer un tag annoté
git tag -a v1.0.0 -m "Release version 1.0.0"

# Pousser le tag vers GitHub
git push origin v1.0.0
```

### Supprimer un tag existant

Si vous devez recréer un tag :

```bash
# Supprimer le tag local
git tag -d v1.0.0

# Supprimer le tag distant
git push origin :refs/tags/v1.0.0

# Recréer le tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## 🛠️ Commandes npm disponibles

### Build Windows local

```bash
npm run build:win:local
```

Cette commande :
- Compile TypeScript
- Build l'application pour Windows uniquement
- Ne publie pas automatiquement (pas de connexion à GitHub nécessaire)
- Génère le fichier .exe dans `dist/`

### Autres commandes utiles

```bash
# Compiler uniquement (sans build)
npm run compile

# Build complet (toutes les plateformes)
npm run build

# Build Windows (avec publication si configuré)
npm run build:win
```

## 📝 Exemple complet

Voici un exemple de workflow complet :

```powershell
# 1. Builder l'application
.\scripts\build-windows.ps1

# 2. Créer la release (le script ouvre GitHub automatiquement)
.\scripts\create-release-manual.ps1
# Répondez aux questions:
# - Version: v1.0.0
# - Titre: Release v1.0.0
# - Notes: Première version stable
# - Créer tag: O

# 3. Sur GitHub (page ouverte automatiquement):
# - Vérifiez que le tag v1.0.0 est sélectionné
# - Glissez-déposez le fichier .exe
# - Cliquez sur "Publish release"
```

## ⚠️ Dépannage

### Erreur de signature de code (winCodeSign)

**Problème**: Erreur `Cannot create symbolic link : A required privilege is not held by the client` lors du build

**Cause**: electron-builder essaie de télécharger et d'extraire les outils de signature de code, mais l'extraction échoue à cause de privilèges insuffisants pour créer des liens symboliques.

**Solutions** (par ordre de recommandation) :

1. **Activer le Mode Développeur Windows** (RECOMMANDÉ)
   - Allez dans Paramètres > Confidentialité et sécurité > Pour les développeurs
   - Activez le "Mode développeur"
   - Redémarrez si nécessaire
   - Voir le guide complet : [CODE_SIGNING_GUIDE.md](CODE_SIGNING_GUIDE.md)

2. **Utiliser la commande sans signature**
   ```powershell
   npm run build:win:unsigned
   ```

3. **Exécuter PowerShell en tant qu'administrateur**
   - Clic droit sur PowerShell > Exécuter en tant qu'administrateur
   - Puis exécutez `npm run build:win:local`

**Note**: Les fichiers générés sans signature fonctionnent normalement, mais Windows peut afficher un avertissement lors de l'installation. C'est normal pour les builds de développement/test.

### Le fichier .exe n'est pas trouvé

**Problème**: Le script ne trouve pas le fichier .exe dans `dist/`

**Solutions**:
1. Vérifiez que le build s'est terminé avec succès
2. Cherchez manuellement dans `dist/` avec:
   ```powershell
   Get-ChildItem -Path dist -Filter "*.exe" -Recurse
   ```
3. Relancez le build si nécessaire

### Erreur lors de la création du tag

**Problème**: Le tag existe déjà ou erreur Git

**Solutions**:
1. Vérifiez les tags existants:
   ```bash
   git tag -l
   ```
2. Supprimez le tag existant si nécessaire (voir section "Gestion des tags")
3. Vérifiez que vous avez les permissions d'écriture sur le repository

### Le build échoue

**Problème**: Erreur lors de la compilation ou du build

**Solutions**:
1. Vérifiez que toutes les dépendances sont installées:
   ```bash
   npm install
   ```
2. Vérifiez que TypeScript compile sans erreur:
   ```bash
   npm run compile
   ```
3. Consultez les logs d'erreur pour identifier le problème spécifique

## 💡 Conseils

- **Versioning**: Utilisez le versioning sémantique (ex: v1.0.0, v1.0.1, v1.1.0, v2.0.0)
- **Notes de version**: Documentez les changements importants dans les notes de release
- **Test avant release**: Testez toujours le fichier .exe généré avant de le publier
- **Backup**: Gardez une copie locale des fichiers .exe importants

## 🔗 Liens utiles

- Repository GitHub: https://github.com/Durrell-Clair/kcp-desktop-app
- Releases: https://github.com/Durrell-Clair/kcp-desktop-app/releases
- Guide de release automatique: [RELEASE_GUIDE.md](RELEASE_GUIDE.md)
