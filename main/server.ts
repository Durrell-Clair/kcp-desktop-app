import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as path from 'path';
import { setupRoutes } from './routes';

let app: Express | null = null;
let server: any = null;

/**
 * Démarre le serveur HTTP local pour l'API
 */
export async function startLocalServer(port: number = 3000): Promise<number> {
  if (app) {
    console.log(`Serveur déjà démarré sur le port ${port}`);
    return port;
  }

  app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Configurer toutes les routes
  setupRoutes(app);

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', port });
  });

  // Gestion des erreurs
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({ error: 'Erreur serveur interne', message: err.message });
  });

  return new Promise((resolve, reject) => {
    server = app!.listen(port, () => {
      console.log(`Serveur HTTP local démarré sur le port ${port}`);
      resolve(port);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        // Port occupé, essayer le port suivant
        const nextPort = port + 1;
        console.log(`Port ${port} occupé, tentative sur le port ${nextPort}...`);
        server.close();
        startLocalServer(nextPort).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Arrête le serveur HTTP local
 */
export function stopLocalServer(): void {
  if (server) {
    server.close();
    server = null;
    app = null;
    console.log('Serveur HTTP local arrêté');
  }
}
