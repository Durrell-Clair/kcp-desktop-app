# Script PowerShell pour créer une release GitHub
# Usage: .\scripts\create-release.ps1 -Version "1.0.1" -Message "Description de la release"

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [string]$Message = "Release version $Version"
)

# Validation du format de version
if ($Version -notmatch '^\d+\.\d+\.\d+(-.*)?$') {
    Write-Host "❌ Format de version invalide. Utilisez le format: X.Y.Z ou X.Y.Z-suffix" -ForegroundColor Red
    Write-Host "Exemples: 1.0.0, 1.2.3, 2.0.0-beta.1" -ForegroundColor Yellow
    exit 1
}

# Ajouter le préfixe 'v' si absent
if ($Version -notmatch '^v') {
    $TagName = "v$Version"
} else {
    $TagName = $Version
    $Version = $Version.Substring(1)  # Retirer le 'v' pour le message
}

Write-Host "🚀 Création de la release $TagName" -ForegroundColor Cyan
Write-Host ""

# Vérifier que nous sommes dans un repository Git
if (-not (Test-Path .git)) {
    Write-Host "❌ Erreur: Ce n'est pas un repository Git" -ForegroundColor Red
    exit 1
}

# Vérifier que le repository est propre (pas de modifications non commitées)
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  Attention: Il y a des modifications non commitées:" -ForegroundColor Yellow
    Write-Host $status
    $response = Read-Host "Voulez-vous continuer quand même? (y/N)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "❌ Annulé" -ForegroundColor Red
        exit 1
    }
}

# Vérifier que le tag n'existe pas déjà (localement)
$existingTagLocal = git tag -l $TagName
$existingTagRemote = $null

# Vérifier si le tag existe sur le remote
$remoteTags = git ls-remote --tags origin 2>$null
if ($remoteTags -match "refs/tags/$TagName") {
    $existingTagRemote = $true
}

if ($existingTagLocal -or $existingTagRemote) {
    Write-Host "⚠️  Le tag $TagName existe déjà" -ForegroundColor Yellow
    if ($existingTagLocal) {
        Write-Host "   - Tag local détecté" -ForegroundColor Gray
    }
    if ($existingTagRemote) {
        Write-Host "   - Tag distant détecté" -ForegroundColor Gray
    }
    $response = Read-Host "Voulez-vous le supprimer et le recréer? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        # Supprimer le tag local s'il existe
        if ($existingTagLocal) {
            Write-Host "🗑️  Suppression du tag local..." -ForegroundColor Yellow
            git tag -d $TagName 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ Tag local supprimé" -ForegroundColor Green
            }
        }
        
        # Supprimer le tag distant s'il existe
        if ($existingTagRemote) {
            Write-Host "🗑️  Suppression du tag distant..." -ForegroundColor Yellow
            git push origin :refs/tags/$TagName 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ Tag distant supprimé" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  Le tag distant n'a peut-être pas été supprimé (peut être normal si la release existe)" -ForegroundColor Yellow
            }
        }
        
        Write-Host ""
        Write-Host "💡 Note: Si une release GitHub existe pour ce tag, vous devrez la supprimer manuellement depuis:" -ForegroundColor Cyan
        Write-Host "   https://github.com/Durrell-Clair/kcp-desktop-app/releases" -ForegroundColor Blue
        Write-Host ""
    } else {
        Write-Host "❌ Annulé" -ForegroundColor Red
        exit 1
    }
}

# Vérifier qu'on est sur un commit valide
$currentCommit = git rev-parse HEAD 2>$null
if (-not $currentCommit) {
    Write-Host "❌ Erreur: Impossible de déterminer le commit actuel" -ForegroundColor Red
    exit 1
}

# Créer le tag
Write-Host "📝 Création du tag $TagName sur le commit $($currentCommit.Substring(0,7))..." -ForegroundColor Cyan
git tag -a $TagName -m $Message

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la création du tag" -ForegroundColor Red
    Write-Host "💡 Vérifiez que vous êtes sur une branche valide avec des commits" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Tag créé localement" -ForegroundColor Green

# Pousser le tag
Write-Host "📤 Envoi du tag vers GitHub..." -ForegroundColor Cyan
git push origin $TagName

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'envoi du tag" -ForegroundColor Red
    Write-Host "💡 Le tag a été créé localement. Vous pouvez le pousser manuellement avec:" -ForegroundColor Yellow
    Write-Host "   git push origin $TagName" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Tag poussé vers GitHub" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Release en cours de création!" -ForegroundColor Green
Write-Host ""
Write-Host "Le workflow GitHub Actions va maintenant:" -ForegroundColor Cyan
Write-Host "  1. Builder l'application pour Windows et Linux" -ForegroundColor White
Write-Host "  2. Créer la release GitHub automatiquement" -ForegroundColor White
Write-Host "  3. Uploader les fichiers buildés" -ForegroundColor White
Write-Host ""
Write-Host "📊 Suivez la progression ici:" -ForegroundColor Cyan
Write-Host "   https://github.com/Durrell-Clair/kcp-desktop-app/actions" -ForegroundColor Blue
Write-Host ""
Write-Host "📦 La release sera disponible ici:" -ForegroundColor Cyan
$releaseUrl = "https://github.com/Durrell-Clair/kcp-desktop-app/releases/tag/" + $TagName
Write-Host ('   ' + $releaseUrl) -ForegroundColor Blue
Write-Host ""
