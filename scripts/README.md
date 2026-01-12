# Scripts d'automatisation

Ce dossier contient des scripts pour automatiser les tâches de build et de release.

## Scripts disponibles

### `build-windows.ps1` / `build-windows.sh`

Build l'application Windows localement.

**Usage** :
```powershell
.\scripts\build-windows.ps1
```

### `create-release-manual.ps1` / `create-release-manual.sh`

Script helper pour faciliter la création manuelle de release sur GitHub.

**Usage** :
```powershell
.\scripts\create-release-manual.ps1
```

### `create-release-github.py` (NOUVEAU)

Script Python pour créer automatiquement une release GitHub avec upload du fichier .exe.

**Prérequis** :
```bash
pip install -r scripts/requirements.txt
```

**Configuration** :
```powershell
# Définir le token GitHub
$env:GITHUB_TOKEN = "votre_token_github"
```

**Usage** :
```powershell
# Simple (demande les infos)
python scripts/create-release-github.py

# Avec options
python scripts/create-release-github.py --version v1.0.0 --title "Release v1.0.0" --notes "Description"

# Via npm
npm run release:github
```

**Options disponibles** :
- `--version VERSION` : Version de la release (ex: v1.0.0)
- `--title TITLE` : Titre de la release
- `--notes NOTES` : Notes de version
- `--token TOKEN` : Token GitHub (sinon utilise GITHUB_TOKEN)
- `--no-tag` : Ne pas créer de tag Git
- `--draft` : Créer en mode brouillon
- `--prerelease` : Marquer comme pré-release

**Exemple complet** :
```powershell
# 1. Builder l'application
npm run build:win:local

# 2. Créer la release automatiquement
python scripts/create-release-github.py --version v1.0.0 --title "Release v1.0.0" --notes "Première version stable"
```

## Workflow recommandé

### Développement local

1. **Builder** :
   ```powershell
   npm run build:win:local
   ```

2. **Créer la release** :
   ```powershell
   npm run release:github
   ```

### Automatisation complète

Vous pouvez combiner les deux étapes dans un seul script PowerShell :

```powershell
# build-and-release.ps1
npm run build:win:local
if ($LASTEXITCODE -eq 0) {
    python scripts/create-release-github.py --version v1.0.0
}
```

## Tokens GitHub

Pour créer un token GitHub :

1. Allez sur https://github.com/settings/tokens
2. Cliquez sur "Generate new token (classic)"
3. Donnez-lui un nom (ex: "Release Automation")
4. Cochez la permission `repo` (accès complet aux repositories)
5. Cliquez sur "Generate token"
6. Copiez le token et stockez-le de manière sécurisée

**Sécurité** :
- Ne commitez JAMAIS le token dans le code
- Utilisez des variables d'environnement
- Limitez les permissions du token au strict nécessaire
