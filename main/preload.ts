import { contextBridge, ipcRenderer } from 'electron';

/**
 * Expose les APIs Electron au renderer de manière sécurisée
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Informations application
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getLocalServerPort: () => ipcRenderer.invoke('get-local-server-port'),
  
  // Licence
  checkLicense: () => ipcRenderer.invoke('check-license'),
  
  // Utilitaires
  platform: process.platform,
  isDev: process.env.NODE_ENV === 'development',
});

// Types pour TypeScript
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getLocalServerPort: () => Promise<number>;
      checkLicense: () => Promise<boolean>;
      platform: string;
      isDev: boolean;
    };
  }
}
