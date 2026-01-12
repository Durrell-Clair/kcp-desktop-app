import bonjour from 'bonjour';
import { app } from 'electron';

let bonjourInstance: any = null;
let service: any = null;

/**
 * Démarrer le service de découverte réseau (mDNS/Bonjour)
 */
export function startDiscovery(port: number, serviceName: string = 'KAMER KASH PME'): void {
  if (bonjourInstance) {
    console.log('Service de découverte déjà démarré');
    return;
  }

  try {
    bonjourInstance = bonjour();

    // Générer un nom de service unique pour éviter les conflits
    // Ajouter un identifiant unique basé sur le PID et le timestamp
    const uniqueId = `${process.pid}-${Date.now().toString(36)}`;
    const uniqueServiceName = `${serviceName} (${uniqueId.substring(0, 8)})`;

    // Publier le service avec gestion d'erreur
    try {
      service = bonjourInstance.publish({
        name: uniqueServiceName,
        type: 'http',
        port: port,
        protocol: 'tcp',
      });

      console.log(`Service de découverte démarré: ${uniqueServiceName} sur le port ${port}`);
    } catch (publishError: any) {
      // Si le nom est déjà utilisé, essayer avec un nom encore plus unique
      if (publishError.message && publishError.message.includes('already in use')) {
        console.warn('Nom de service déjà utilisé, tentative avec un nom plus unique...');
        const fallbackName = `${serviceName} ${Math.random().toString(36).substring(2, 9)}`;
        try {
          service = bonjourInstance.publish({
            name: fallbackName,
            type: 'http',
            port: port,
            protocol: 'tcp',
          });
          console.log(`Service de découverte démarré (fallback): ${fallbackName} sur le port ${port}`);
        } catch (fallbackError) {
          console.error('Impossible de publier le service de découverte même avec un nom unique:', fallbackError);
          // Ne pas faire échouer l'application, juste logger l'erreur
        }
      } else {
        throw publishError;
      }
    }
  } catch (error: any) {
    console.error('Erreur lors du démarrage du service de découverte:', error);
    // Ne pas faire échouer l'application si la découverte réseau échoue
    // L'application peut fonctionner sans découverte réseau (mode standalone)
    console.warn('L\'application continuera sans découverte réseau. Mode standalone activé.');
  }
}

/**
 * Arrêter le service de découverte
 */
export function stopDiscovery(): void {
  if (service) {
    service.stop();
    service = null;
  }

  if (bonjourInstance) {
    bonjourInstance.destroy();
    bonjourInstance = null;
  }

  console.log('Service de découverte arrêté');
}

/**
 * Découvrir les serveurs KAMER KASH PME sur le réseau local
 * Avec fallback vers IP fixe si mDNS ne fonctionne pas
 */
export function discoverServers(
  fallbackIP?: string,
  fallbackPort: number = 3000,
): Promise<Array<{ name: string; host: string; port: number }>> {
  return new Promise((resolve) => {
    const instance = bonjour();
    const servers: Array<{ name: string; host: string; port: number }> = [];
    let discoveryCompleted = false;

    const browser = instance.find({ type: 'http' }, (service: any) => {
      if (service.name.includes('KAMER KASH PME')) {
        servers.push({
          name: service.name,
          host: service.host,
          port: service.port,
        });
      }
    });

    // Attendre 3 secondes pour la découverte mDNS
    setTimeout(() => {
      if (!discoveryCompleted) {
        discoveryCompleted = true;
        browser.stop();
        instance.destroy();

        // Si aucun serveur trouvé et qu'une IP de fallback est fournie, l'ajouter
        if (servers.length === 0 && fallbackIP) {
          console.log(`Aucun serveur trouvé via mDNS, utilisation de l'IP de fallback: ${fallbackIP}:${fallbackPort}`);
          servers.push({
            name: 'KAMER KASH PME (Fallback)',
            host: fallbackIP,
            port: fallbackPort,
          });
        }

        resolve(servers);
      }
    }, 3000);

    // Si des serveurs sont trouvés rapidement, résoudre immédiatement
    setTimeout(() => {
      if (servers.length > 0 && !discoveryCompleted) {
        discoveryCompleted = true;
        browser.stop();
        instance.destroy();
        resolve(servers);
      }
    }, 1000);
  });
}

/**
 * Teste la connectivité à un serveur
 */
export async function testServerConnection(
  host: string,
  port: number,
  timeout: number = 3000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const http = require('http');
    const url = `http://${host}:${port}/health`;

    const req = http.get(url, { timeout }, (res: any) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Vérifie si une IP est dans le même sous-réseau
 */
export function isSameSubnet(ip1: string, ip2: string): boolean {
  try {
    const parts1 = ip1.split('.').map(Number);
    const parts2 = ip2.split('.').map(Number);

    if (parts1.length !== 4 || parts2.length !== 4) {
      return false;
    }

    // Comparer les 3 premiers octets (sous-réseau /24)
    return (
      parts1[0] === parts2[0] &&
      parts1[1] === parts2[1] &&
      parts1[2] === parts2[2]
    );
  } catch {
    return false;
  }
}

/**
 * Obtient l'IP locale de la machine
 */
export function getLocalIP(): string | null {
  try {
    const os = require('os');
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        // Ignorer les adresses IPv6 et les adresses non internes
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'IP locale:', error);
  }

  return null;
}
