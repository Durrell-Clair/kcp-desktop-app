# Script PowerShell pour builder l'application Windows localement
# Usage: .\scripts\build-windows.ps1

Write-Host "🔨 Build Windows - KAMER KASH PME" -ForegroundColor Cyan
Write-Host ""

# Vérifier que nous sommes dans le bon répertoire
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erreur: Ce script doit être exécuté depuis le dossier electron/" -ForegroundColor Red
    exit 1
}

# Vérifier si l'application est en cours d'exécution
$processes = Get-Process -Name "KAMER KASH PME" -ErrorAction SilentlyContinue
if ($processes) {
    Write-Host "⚠️  Attention: L'application KAMER KASH PME est en cours d'exécution" -ForegroundColor Yellow
    Write-Host "   Cela peut causer des erreurs lors du build (fichier verrouillé)" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Voulez-vous fermer l'application maintenant? (O/N)"
    if ($response -eq 'O' -or $response -eq 'o' -or $response -eq 'Y' -or $response -eq 'y') {
        foreach ($proc in $processes) {
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            } catch {
                # Ignorer les erreurs
            }
        }
        Start-Sleep -Seconds 2
        Write-Host "✅ Application fermée" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "⚠️  Continuer avec l'application en cours d'exécution (peut causer des erreurs)" -ForegroundColor Yellow
        Write-Host ""
    }
}

# Vérifier Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: Node.js n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    exit 1
}

# Vérifier npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm détecté: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: npm n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Étape 1: Compilation TypeScript..." -ForegroundColor Cyan
npm run compile

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la compilation TypeScript" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Compilation TypeScript terminée" -ForegroundColor Green
Write-Host ""

Write-Host "🔨 Étape 2: Build de l'application Windows..." -ForegroundColor Cyan
Write-Host "   Cela peut prendre plusieurs minutes..." -ForegroundColor Yellow
Write-Host ""

# Vérifier si le Mode Développeur est activé (optionnel)
$devMode = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" -Name "AllowDevelopmentWithoutDevLicense" -ErrorAction SilentlyContinue
if (-not $devMode -or $devMode.AllowDevelopmentWithoutDevLicense -ne 1) {
    Write-Host "⚠️  Attention: Le Mode Développeur Windows n'est peut-être pas activé" -ForegroundColor Yellow
    Write-Host "   Si vous rencontrez des erreurs de liens symboliques, activez le Mode Développeur" -ForegroundColor Yellow
    Write-Host "   ou utilisez: npm run build:win:unsigned" -ForegroundColor Yellow
    Write-Host ""
}

# Build Windows sans publication (avec signature si possible)
npm run build -- --win --publish never

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du build Windows" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Build terminé avec succès!" -ForegroundColor Green
Write-Host ""

# Chercher le fichier .exe généré
$exeFiles = Get-ChildItem -Path "dist" -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending

if ($exeFiles.Count -eq 0) {
    Write-Host "⚠️  Aucun fichier .exe trouvé dans dist/" -ForegroundColor Yellow
    Write-Host "   Vérifiez les logs ci-dessus pour identifier le problème" -ForegroundColor Yellow
    exit 1
}

$latestExe = $exeFiles[0]
$exePath = $latestExe.FullName
$exeSize = [math]::Round($latestExe.Length / 1MB, 2)

Write-Host "📦 Fichier généré:" -ForegroundColor Cyan
Write-Host "   Nom: $($latestExe.Name)" -ForegroundColor White
Write-Host "   Taille: $exeSize MB" -ForegroundColor White
Write-Host "   Emplacement: $exePath" -ForegroundColor White
Write-Host ""

# Demander si l'utilisateur veut ouvrir le dossier
$openFolder = Read-Host "Voulez-vous ouvrir le dossier contenant le fichier? (O/N)"
if ($openFolder -eq 'O' -or $openFolder -eq 'o' -or $openFolder -eq 'Y' -or $openFolder -eq 'y') {
    Start-Process explorer.exe -ArgumentList "/select,`"$exePath`""
}

Write-Host ""
Write-Host "🎉 Build terminé! Vous pouvez maintenant créer une release manuelle sur GitHub." -ForegroundColor Green
Write-Host ""
Write-Host "💡 Pour créer une release:" -ForegroundColor Cyan
Write-Host "   1. Allez sur: https://github.com/Durrell-Clair/kcp-desktop-app/releases" -ForegroundColor White
Write-Host "   2. Cliquez sur 'Create a new release'" -ForegroundColor White
Write-Host "   3. Uploadez le fichier: $($latestExe.Name)" -ForegroundColor White
Write-Host ""
Write-Host "   Ou utilisez: .\scripts\create-release-manual.ps1" -ForegroundColor Yellow
Write-Host ""
