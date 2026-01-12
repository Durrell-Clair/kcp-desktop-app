import { testServerConnection, discoverServers, getLocalIP } from './discovery';

/**
 * Configuration de connexion client
 */
export interface ClientConnectionConfig {
  /** Mode de connexion : 'auto' (découverte automatique), 'manual' (IP fixe) */
  mode: 'auto' | 'manual';
  /** IP du serveur (si mode = 'manual') */
  serverIP?: string;
  /** Port du serveur (si mode = 'manual') */
  serverPort?: number;
}

let connectionConfig: ClientConnectionConfig | null = null;
let currentServerUrl: string | null = null;

/**
 * Configure la connexion client
 */
export function setClientConnectionConfig(config: ClientConnectionConfig): void {
  connectionConfig = config;
  console.log('Configuration de connexion client:', config);
}

/**
 * Découvre et se connecte au serveur
 */
export async function connectToServer(): Promise<{
  success: boolean;
  serverUrl?: string;
  error?: string;
}> {
  if (!connectionConfig) {
    return {
      success: false,
      error: 'Configuration de connexion non définie',
    };
  }

  try {
    if (connectionConfig.mode === 'auto') {
      // Mode automatique : découverte via mDNS
      console.log('Découverte automatique du serveur...');
      
      const localIP = getLocalIP();
      const servers = await discoverServers(localIP || undefined);

      if (servers.length === 0) {
        return {
          success: false,
          error: 'Aucun serveur trouvé sur le réseau local',
        };
      }

      // Tester la connectivité à chaque serveur trouvé
      for (const server of servers) {
        const isConnected = await testServerConnection(server.host, server.port);
        if (isConnected) {
          const serverUrl = `http://${server.host}:${server.port}`;
          currentServerUrl = serverUrl;
          console.log(`Connecté au serveur: ${serverUrl}`);
          return {
            success: true,
            serverUrl,
          };
        }
      }

      return {
        success: false,
        error: 'Serveurs trouvés mais non accessibles',
      };
    } else {
      // Mode manuel : IP fixe
      if (!connectionConfig.serverIP || !connectionConfig.serverPort) {
        return {
          success: false,
          error: 'IP et port du serveur requis en mode manuel',
        };
      }

      console.log(
        `Connexion manuelle au serveur: ${connectionConfig.serverIP}:${connectionConfig.serverPort}`
      );

      const isConnected = await testServerConnection(
        connectionConfig.serverIP,
        connectionConfig.serverPort,
      );

      if (isConnected) {
        const serverUrl = `http://${connectionConfig.serverIP}:${connectionConfig.serverPort}`;
        currentServerUrl = serverUrl;
        console.log(`Connecté au serveur: ${serverUrl}`);
        return {
          success: true,
          serverUrl,
        };
      } else {
        return {
          success: false,
          error: 'Impossible de se connecter au serveur',
        };
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erreur lors de la connexion',
    };
  }
}

/**
 * Obtient l'URL du serveur actuellement connecté
 */
export function getCurrentServerUrl(): string | null {
  return currentServerUrl;
}

/**
 * Réinitialise la connexion
 */
export function resetConnection(): void {
  currentServerUrl = null;
  console.log('Connexion réinitialisée');
}
