import { LicenseService } from './services/license.service';
import { app, dialog } from 'electron';

const licenseService = new LicenseService();
let verificationInterval: NodeJS.Timeout | null = null;

/**
 * Démarre la vérification périodique de la licence
 */
export function startLicenseVerification(): void {
  // Vérifier immédiatement
  checkLicensePeriodically();

  // Vérifier toutes les 24 heures
  verificationInterval = setInterval(() => {
    checkLicensePeriodically();
  }, 24 * 60 * 60 * 1000); // 24 heures

  console.log('Vérification périodique de la licence démarrée');
}

/**
 * Arrête la vérification périodique de la licence
 */
export function stopLicenseVerification(): void {
  if (verificationInterval) {
    clearInterval(verificationInterval);
    verificationInterval = null;
    console.log('Vérification périodique de la licence arrêtée');
  }
}

/**
 * Vérifie la licence périodiquement
 */
async function checkLicensePeriodically(): Promise<void> {
  try {
    // Vérifier localement d'abord
    const isValid = await licenseService.verifyLicense();

    if (!isValid) {
      console.warn('Licence invalide détectée');
      showLicenseWarning('Votre licence est invalide ou expirée.');
      return;
    }

    // Vérifier si la licence nécessite un renouvellement
    if (licenseService.needsRenewal()) {
      const license = licenseService.getLicense();
      if (license) {
        const now = new Date();
        const expiresAt = new Date(license.expiresAt);
        const daysUntilExpiry = Math.floor(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        showLicenseWarning(
          `Votre licence expire dans ${daysUntilExpiry} jour(s). Veuillez renouveler votre abonnement.`,
        );
      }
    }

    // Vérifier avec l'API cloud si internet est disponible
    try {
      const cloudVerification = await licenseService.verifyLicenseWithCloud();

      if (!cloudVerification.valid) {
        console.warn('Licence invalidée par le serveur cloud');
        showLicenseWarning(
          'Votre licence a été invalidée par le serveur. Veuillez contacter le support.',
        );
      } else if (cloudVerification.needsUpdate) {
        console.log('Licence mise à jour depuis le serveur cloud');
        // La licence a été automatiquement mise à jour
      }
    } catch (error) {
      // Erreur réseau : continuer en mode offline
      console.log('Vérification cloud impossible, mode offline activé');
    }
  } catch (error: any) {
    console.error('Erreur lors de la vérification de la licence:', error);
  }
}

/**
 * Affiche un avertissement de licence
 */
function showLicenseWarning(message: string): void {
  // Ne pas afficher de dialog si l'application n'est pas prête
  if (!app.isReady()) {
    return;
  }

  // Afficher une notification (non bloquante)
  // Dans une vraie implémentation, on pourrait utiliser une notification système
  console.warn(`Avertissement licence: ${message}`);

  // Optionnel : afficher une dialog (peut être gênant si répété)
  // dialog.showMessageBox(mainWindow, {
  //   type: 'warning',
  //   title: 'Avertissement de Licence',
  //   message: message,
  //   buttons: ['OK'],
  // });
}

/**
 * Vérifie la licence au démarrage
 */
export async function checkLicenseOnStartup(): Promise<boolean> {
  try {
    const isValid = await licenseService.verifyLicense();

    if (!isValid) {
      console.log('Licence invalide au démarrage');
      return false;
    }

    // Vérifier si la licence est expirée (hors grace period)
    if (licenseService.isExpired()) {
      console.log('Licence expirée (hors période de grâce)');
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('Erreur lors de la vérification de la licence au démarrage:', error);
    return false;
  }
}
