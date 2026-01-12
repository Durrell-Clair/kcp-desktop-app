# Script PowerShell pour vérifier et fermer les processus KAMER KASH PME avant le build
# Usage: .\scripts\check-processes.ps1

Write-Host "🔍 Vérification des processus KAMER KASH PME..." -ForegroundColor Cyan
Write-Host ""

# Chercher les processus
$processes = Get-Process -Name "KAMER KASH PME" -ErrorAction SilentlyContinue

if ($processes) {
    Write-Host "⚠️  Processus trouvés:" -ForegroundColor Yellow
    foreach ($proc in $processes) {
        Write-Host "   - PID: $($proc.Id) | Nom: $($proc.ProcessName) | Chemin: $($proc.Path)" -ForegroundColor White
    }
    Write-Host ""
    
    $response = Read-Host "Voulez-vous fermer ces processus? (O/N)"
    if ($response -eq 'O' -or $response -eq 'o' -or $response -eq 'Y' -or $response -eq 'y') {
        foreach ($proc in $processes) {
            try {
                Write-Host "   Fermeture du processus PID $($proc.Id)..." -ForegroundColor Yellow
                Stop-Process -Id $proc.Id -Force
                Write-Host "   ✅ Processus fermé" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ Erreur lors de la fermeture: $_" -ForegroundColor Red
            }
        }
        Write-Host ""
        Write-Host "✅ Tous les processus ont été fermés" -ForegroundColor Green
        Write-Host "   Vous pouvez maintenant lancer le build" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Annulé. Fermez manuellement les processus avant de builder." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Aucun processus KAMER KASH PME en cours d'exécution" -ForegroundColor Green
    Write-Host "   Vous pouvez lancer le build en toute sécurité" -ForegroundColor Cyan
}

Write-Host ""
