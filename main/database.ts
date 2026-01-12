import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import {
  getSharedDatabasePath,
  configureDatabaseForSharing,
  checkDatabaseAccessibility,
} from './database-sharing';

let db: Database.Database | null = null;
let dbPath: string = '';

/**
 * Initialise la base de données SQLite
 */
export async function initDatabase(): Promise<void> {
  // Vérifier l'accessibilité de la base de données
  const accessibility = checkDatabaseAccessibility();
  if (!accessibility.accessible) {
    throw new Error(
      `Base de données non accessible: ${accessibility.error}`
    );
  }

  // Obtenir le chemin de la base de données (local ou réseau)
  dbPath = getSharedDatabasePath();
  
  console.log(`Initialisation de la base de données: ${dbPath}`);

  // Ouvrir la connexion SQLite
  db = new Database(dbPath);

  // Configurer la base de données pour le partage (WAL, timeouts, etc.)
  configureDatabaseForSharing(db);

  // Créer les tables si elles n'existent pas
  await runMigrations();

  console.log('Base de données initialisée avec succès');
}

/**
 * Exécute les migrations de base de données
 */
async function runMigrations(): Promise<void> {
  if (!db) {
    throw new Error('Base de données non initialisée');
  }

  // Créer la table de suivi des migrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Obtenir les migrations déjà exécutées
  const executedMigrations = db
    .prepare('SELECT name FROM migrations')
    .all() as Array<{ name: string }>;
  
  const executedNames = new Set(executedMigrations.map(m => m.name));

  // Liste des migrations à exécuter dans l'ordre
  const migrations = [
    { name: '001_initial_schema', file: '001_initial_schema.sql' },
    // Ajouter d'autres migrations ici au fur et à mesure
  ];

  // Exécuter les migrations non exécutées
  for (const migration of migrations) {
    if (executedNames.has(migration.name)) {
      console.log(`Migration ${migration.name} déjà exécutée, ignorée`);
      continue;
    }

    try {
      console.log(`Exécution de la migration ${migration.name}...`);
      
      // Lire le fichier SQL
      // Chercher dans plusieurs emplacements possibles (dev et prod)
      let migrationPath = path.join(__dirname, 'migrations', migration.file);
      
      // Si le fichier n'existe pas dans dist, chercher dans le dossier source
      if (!fs.existsSync(migrationPath)) {
        // En développement, __dirname pointe vers dist/main, donc on remonte vers main/migrations
        const sourcePath = path.join(__dirname, '..', 'main', 'migrations', migration.file);
        if (fs.existsSync(sourcePath)) {
          migrationPath = sourcePath;
        } else {
          // Essayer aussi depuis le dossier racine du projet
          const rootPath = path.join(__dirname, '..', '..', 'main', 'migrations', migration.file);
          if (fs.existsSync(rootPath)) {
            migrationPath = rootPath;
          }
        }
      }
      
      if (!fs.existsSync(migrationPath)) {
        throw new Error(`Fichier de migration non trouvé: ${migration.file}`);
      }
      
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      // Exécuter la migration dans une transaction
      db.transaction(() => {
        db!.exec(sql);
        
        // Enregistrer la migration comme exécutée
        db!.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name);
      })();

      console.log(`Migration ${migration.name} exécutée avec succès`);
    } catch (error) {
      console.error(`Erreur lors de l'exécution de la migration ${migration.name}:`, error);
      throw error;
    }
  }

  console.log('Toutes les migrations ont été exécutées');
}

/**
 * Obtient l'instance de la base de données
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Base de données non initialisée. Appelez initDatabase() d\'abord.');
  }
  return db;
}

/**
 * Ferme la connexion à la base de données
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('Base de données fermée');
  }
}

/**
 * Obtient le chemin de la base de données
 */
export function getDatabasePath(): string {
  return dbPath;
}
