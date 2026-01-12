import { autoUpdater } from 'electron-updater';
import { app, net, BrowserWindow } from 'electron';

let mainWindow: BrowserWindow | null = null;

/**
 * Définit la fenêtre principale pour les notifications
 */
export function setUpdaterWindow(window: BrowserWindow | null): void {
  mainWindow = window;
}

/**
 * Initialise le système de mise à jour automatique
 */
export function initUpdater(): void {
  // Configuration de base
  autoUpdater.autoDownload = false; // Ne pas télécharger automatiquement
  autoUpdater.autoInstallOnAppQuit = true; // Installer au redémarrage

  // Configuration du serveur de mise à jour
  // À configurer selon votre infrastructure (S3, GitHub Releases, etc.)
  // autoUpdater.setFeedURL({
  //   provider: 'github',
  //   owner: 'kamerkash',
  //   repo: 'kamer-kash-pme',
  // });

  // Événements de mise à jour
  autoUpdater.on('checking-for-update', () => {
    console.log('Vérification des mises à jour...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Mise à jour disponible:', info.version);
    // Notifier l'utilisateur via IPC
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('Aucune mise à jour disponible');
  });

  autoUpdater.on('error', (err) => {
    console.error('Erreur lors de la vérification des mises à jour:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    console.log('Progression du téléchargement:', progressObj.percent);
    // Notifier l'utilisateur via IPC
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Mise à jour téléchargée:', info.version);
    // Notifier l'utilisateur via IPC
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    }
  });

  // Vérifier les mises à jour toutes les 24h si internet disponible
  setInterval(() => {
    if (isOnline()) {
      autoUpdater.checkForUpdates();
    }
  }, 24 * 60 * 60 * 1000); // 24 heures

  // Vérifier au démarrage (avec délai pour ne pas ralentir le démarrage)
  setTimeout(() => {
    if (isOnline()) {
      autoUpdater.checkForUpdates();
    }
  }, 5000); // 5 secondes après le démarrage
}

/**
 * Vérifie si l'application est en ligne
 */
function isOnline(): boolean {
  // Utiliser l'API net d'Electron pour vérifier la connexion
  return net.isOnline();
}

/**
 * Télécharge la mise à jour disponible
 */
export function downloadUpdate(): void {
  autoUpdater.downloadUpdate();
}

/**
 * Installe la mise à jour téléchargée
 */
export function installUpdate(): void {
  autoUpdater.quitAndInstall();
}
