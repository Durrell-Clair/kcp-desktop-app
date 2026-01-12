import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { startLocalServer } from './server';
import { initDatabase } from './database';
import { checkLicense, initLicense } from './license';
import { initUpdater } from './updater';
import { startDiscovery } from './discovery';
import { startLicenseVerification, checkLicenseOnStartup } from './license-verification';

// Détecter le mode développement : si l'app n'est pas packagée, on est en dev
const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let localServerPort: number = 3000;
import { setUpdaterWindow } from './updater';

/**
 * Crée la fenêtre principale de l'application
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    icon: path.join(__dirname, '../../build/icon.png'),
    show: false, // Ne pas afficher avant que le contenu soit chargé
  });

  // Charger l'interface native Electron
  // Depuis dist/main/, remonter de deux niveaux pour atteindre electron/renderer/
  const rendererPath = path.join(__dirname, '../../renderer/index.html');
  mainWindow.loadFile(rendererPath);
  
  // Ouvrir DevTools en mode développement
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    // Configurer la fenêtre pour l'updater
    if (mainWindow) {
      setUpdaterWindow(mainWindow);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    setUpdaterWindow(null);
  });
}

/**
 * Initialise l'application Electron
 */
async function initializeApp(): Promise<void> {
  // Créer la fenêtre d'abord pour voir les erreurs dans la console Electron
  createWindow();
  
  try {
    // 1. Initialiser la base de données SQLite
    console.log('Initialisation de la base de données...');
    await initDatabase();

    // 2. Initialiser le système de licence
    console.log('Initialisation du système de licence...');
    await initLicense();

    // 3. Vérifier la licence au démarrage
    console.log('Vérification de la licence...');
    const licenseValid = await checkLicenseOnStartup();
    
    if (!licenseValid) {
      console.log('Licence non valide ou absente. Redirection vers activation...');
      // Rediriger vers la page d'activation
      // Cette logique sera gérée dans le renderer
    } else {
      // Démarrer la vérification périodique
      startLicenseVerification();
    }

    // 4. Démarrer le serveur HTTP local
    console.log('Démarrage du serveur HTTP local...');
    localServerPort = await startLocalServer();

    // 5. Démarrer le service de découverte réseau (si multi-utilisateurs)
    // La détection du mode sera implémentée plus tard
    console.log('Démarrage du service de découverte réseau...');
    startDiscovery(localServerPort);

    // 6. Initialiser le système de mise à jour
    console.log('Initialisation du système de mise à jour...');
    initUpdater();
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
    // Afficher l'erreur dans la console Electron (DevTools déjà ouverts)
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript(`
        console.error('Erreur d\\'initialisation:', ${JSON.stringify(String(error))});
        alert('Erreur lors du démarrage de l\\'application. Voir la console pour plus de détails.');
      `);
    }
    // Ne pas quitter immédiatement pour permettre de voir l'erreur
    // app.quit();
  }
}

// Gestionnaires d'événements Electron

app.whenReady().then(() => {
  initializeApp();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Nettoyage avant fermeture
  console.log('Fermeture de l\'application...');
});

// IPC Handlers pour communication avec le renderer

ipcMain.handle('get-local-server-port', () => {
  return localServerPort;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('check-license', async () => {
  return await checkLicense();
});

ipcMain.handle('get-license-info', async () => {
  const { getLicense } = await import('./license');
  return getLicense();
});

// Exporter pour les tests
export { mainWindow };
