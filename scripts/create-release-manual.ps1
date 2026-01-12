# Script PowerShell pour faciliter la création manuelle de release GitHub
# Usage: .\scripts\create-release-manual.ps1

Write-Host "📦 Création manuelle de release GitHub" -ForegroundColor Cyan
Write-Host ""

# Vérifier que nous sommes dans le bon répertoire
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erreur: Ce script doit être exécuté depuis le dossier electron/" -ForegroundColor Red
    exit 1
}

# Chercher le fichier .exe le plus récent
$exeFiles = Get-ChildItem -Path "dist" -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending

if ($exeFiles.Count -eq 0) {
    Write-Host "❌ Aucun fichier .exe trouvé dans dist/" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Vous devez d'abord builder l'application:" -ForegroundColor Yellow
    Write-Host "   npm run build:win:local" -ForegroundColor White
    Write-Host "   ou" -ForegroundColor White
    Write-Host "   .\scripts\build-windows.ps1" -ForegroundColor White
    exit 1
}

$latestExe = $exeFiles[0]
$exePath = $latestExe.FullName
$exeName = $latestExe.Name
$exeSize = [math]::Round($latestExe.Length / 1MB, 2)
$exeDate = $latestExe.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")

Write-Host "📦 Fichier .exe trouvé:" -ForegroundColor Green
Write-Host "   Nom: $exeName" -ForegroundColor White
Write-Host "   Taille: $exeSize MB" -ForegroundColor White
Write-Host "   Date: $exeDate" -ForegroundColor White
Write-Host "   Chemin: $exePath" -ForegroundColor White
Write-Host ""

# Demander la version
Write-Host "📝 Informations pour la release:" -ForegroundColor Cyan
$version = Read-Host "Version de la release (ex: v1.0.0)"
if ([string]::IsNullOrWhiteSpace($version)) {
    Write-Host "❌ Version requise" -ForegroundColor Red
    exit 1
}

# Ajouter le préfixe 'v' si absent
if ($version -notmatch '^v') {
    $version = "v$version"
}

$releaseTitle = Read-Host "Titre de la release (optionnel, défaut: Release $version)"
if ([string]::IsNullOrWhiteSpace($releaseTitle)) {
    $releaseTitle = "Release $version"
}

$releaseNotes = Read-Host "Notes de version (optionnel, appuyez sur Entrée pour ignorer)"

Write-Host ""
Write-Host "🔖 Créer un tag Git?" -ForegroundColor Cyan
$createTag = Read-Host "Créer le tag $version? (O/N)"
$tagCreated = $false

if ($createTag -eq 'O' -or $createTag -eq 'o' -or $createTag -eq 'Y' -or $createTag -eq 'y') {
    # Vérifier si le tag existe déjà
    $existingTag = git tag -l $version
    if ($existingTag) {
        Write-Host "⚠️  Le tag $version existe déjà" -ForegroundColor Yellow
        $overwrite = Read-Host "Voulez-vous le supprimer et le recréer? (O/N)"
        if ($overwrite -eq 'O' -or $overwrite -eq 'o' -or $overwrite -eq 'Y' -or $overwrite -eq 'y') {
            Write-Host "🗑️  Suppression du tag local..." -ForegroundColor Yellow
            git tag -d $version 2>$null
            Write-Host "🗑️  Suppression du tag distant..." -ForegroundColor Yellow
            git push origin ":refs/tags/$version" 2>$null
        } else {
            Write-Host "❌ Annulé" -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host "📝 Création du tag $version..." -ForegroundColor Cyan
    $tagMessage = if ($releaseNotes) { $releaseNotes } else { "Release $version" }
    git tag -a $version -m $tagMessage
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "📤 Envoi du tag vers GitHub..." -ForegroundColor Cyan
        git push origin $version
        if ($LASTEXITCODE -eq 0) {
            $tagCreated = $true
            Write-Host "✅ Tag créé et poussé avec succès" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Tag créé localement mais erreur lors du push" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Erreur lors de la création du tag" -ForegroundColor Red
    }
    Write-Host ""
}

# Ouvrir GitHub Releases dans le navigateur
$releasesUrl = "https://github.com/Durrell-Clair/kcp-desktop-app/releases/new"
Write-Host "🌐 Ouverture de GitHub Releases dans le navigateur..." -ForegroundColor Cyan
Start-Process $releasesUrl

Write-Host ""
Write-Host "📋 Instructions pour créer la release:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Dans la page GitHub qui vient de s'ouvrir:" -ForegroundColor White
Write-Host "   - Choisissez le tag: $version" -ForegroundColor Yellow
if (-not $tagCreated) {
    Write-Host "     (Si le tag n'existe pas, créez-le d'abord ou créez un nouveau tag)" -ForegroundColor Gray
}
Write-Host "   - Titre: $releaseTitle" -ForegroundColor Yellow
if ($releaseNotes) {
    Write-Host "   - Description: $releaseNotes" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "2. Dans la section 'Attach binaries':" -ForegroundColor White
Write-Host "   - Cliquez sur 'Choose your files' ou glissez-déposez le fichier" -ForegroundColor Yellow
Write-Host "   - Sélectionnez: $exePath" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Cliquez sur 'Publish release'" -ForegroundColor White
Write-Host ""
Write-Host "💡 Le fichier .exe est ici:" -ForegroundColor Cyan
Write-Host "   $exePath" -ForegroundColor White
Write-Host ""

# Option pour copier le chemin dans le presse-papiers
$copyPath = Read-Host "Voulez-vous copier le chemin du fichier dans le presse-papiers? (O/N)"
if ($copyPath -eq 'O' -or $copyPath -eq 'o' -or $copyPath -eq 'Y' -or $copyPath -eq 'y') {
    $exePath | Set-Clipboard
    Write-Host "✅ Chemin copié dans le presse-papiers" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Prêt! Suivez les instructions ci-dessus pour créer la release." -ForegroundColor Green
Write-Host ""
