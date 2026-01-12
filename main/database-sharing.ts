import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import Database from 'better-sqlite3';
import { getDatabase, getDatabasePath } from './database';

/**
 * Configuration du partage de base de données
 */
export interface DatabaseSharingConfig {
  /** Mode de partage : 'local' (mono-utilisateur) ou 'network' (multi-utilisateurs) */
  mode: 'local' | 'network';
  /** Chemin réseau vers la base de données (si mode = 'network') */
  networkPath?: string;
  /** Nom du fichier de base de données */
  dbFileName?: string;
}

let sharingConfig: DatabaseSharingConfig | null = null;

/**
 * Initialise la configuration de partage de base de données
 */
export function initDatabaseSharing(config: DatabaseSharingConfig): void {
  sharingConfig = config;
  console.log('Configuration de partage de base de données:', config);
}

/**
 * Obtient le chemin de la base de données selon la configuration
 */
export function getSharedDatabasePath(): string {
  if (!sharingConfig) {
    // Par défaut, mode local
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    return path.join(dbDir, 'kamerkash.db');
  }

  if (sharingConfig.mode === 'local') {
    // Mode local : base de données sur machine locale
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    return path.join(dbDir, sharingConfig.dbFileName || 'kamerkash.db');
  } else {
    // Mode réseau : base de données partagée
    if (!sharingConfig.networkPath) {
      throw new Error('Chemin réseau requis pour le mode partagé');
    }

    const dbFileName = sharingConfig.dbFileName || 'kamerkash.db';
    const networkDbPath = path.join(sharingConfig.networkPath, dbFileName);

    // Vérifier que le chemin réseau est accessible
    if (!fs.existsSync(sharingConfig.networkPath)) {
      throw new Error(
        `Le chemin réseau n'est pas accessible: ${sharingConfig.networkPath}`
      );
    }

    // Vérifier les permissions d'écriture
    try {
      const testFile = path.join(sharingConfig.networkPath, '.kamerkash_test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (error) {
      throw new Error(
        `Pas de permission d'écriture sur le chemin réseau: ${sharingConfig.networkPath}`
      );
    }

    return networkDbPath;
  }
}

/**
 * Configure la base de données pour le partage réseau
 * Active le mode WAL et configure les paramètres de concurrence
 */
export function configureDatabaseForSharing(db: Database.Database): void {
  if (!db) {
    throw new Error('Base de données non initialisée');
  }

  // Activer le mode WAL (Write-Ahead Logging) pour accès concurrent
  db.pragma('journal_mode = WAL');

  // Configurer les timeouts pour les verrous
  // 5000ms = 5 secondes d'attente avant timeout
  db.pragma('busy_timeout = 5000');

  // Activer les clés étrangères
  db.pragma('foreign_keys = ON');

  // Optimiser pour accès réseau (si applicable)
  if (sharingConfig?.mode === 'network') {
    // Augmenter la taille du cache pour améliorer les performances
    db.pragma('cache_size = -64000'); // 64MB

    // Activer le mode synchronous NORMAL (plus rapide que FULL, mais toujours sûr avec WAL)
    db.pragma('synchronous = NORMAL');

    console.log('Base de données configurée pour le partage réseau');
  } else {
    // Mode local : optimisations différentes
    db.pragma('cache_size = -32000'); // 32MB
    db.pragma('synchronous = NORMAL');

    console.log('Base de données configurée pour usage local');
  }
}

/**
 * Vérifie si la base de données est accessible en mode partagé
 */
export function checkDatabaseAccessibility(): {
  accessible: boolean;
  error?: string;
} {
  try {
    const dbPath = getSharedDatabasePath();

    // Vérifier que le fichier existe ou peut être créé
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      return {
        accessible: false,
        error: `Le répertoire n'existe pas: ${dbDir}`,
      };
    }

    // Vérifier les permissions
    try {
      const testFile = path.join(dbDir, '.kamerkash_access_test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (error: any) {
      return {
        accessible: false,
        error: `Pas de permission d'écriture: ${error.message}`,
      };
    }

    // Si le fichier existe, essayer de l'ouvrir en lecture seule
    if (fs.existsSync(dbPath)) {
      try {
        const testDb = new Database(dbPath, { readonly: true });
        testDb.close();
      } catch (error: any) {
        return {
          accessible: false,
          error: `Impossible d'ouvrir la base de données: ${error.message}`,
        };
      }
    }

    return { accessible: true };
  } catch (error: any) {
    return {
      accessible: false,
      error: error.message,
    };
  }
}

/**
 * Obtient la configuration actuelle
 */
export function getSharingConfig(): DatabaseSharingConfig | null {
  return sharingConfig;
}

/**
 * Vérifie si on est en mode partagé
 */
export function isSharedMode(): boolean {
  return sharingConfig?.mode === 'network';
}
