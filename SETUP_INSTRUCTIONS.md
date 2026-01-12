# Instructions de Setup - Application Electron

## Prérequis

- Node.js 18+ installé
- npm ou yarn
- Windows 10+ (pour le build Windows)

## Installation

### 1. Installer les dépendances Electron

```bash
cd electron
npm install
```

### 2. Installer les dépendances Frontend (si pas déjà fait)

```bash
cd ../frontend
npm install
```

### 3. Configuration

Créer un fichier `.env` dans le dossier `electron/` :

```env
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
LICENSE_ENCRYPTION_KEY=your-encryption-key-change-in-production
```

## Développement

### Démarrer l'application en mode développement

```bash
cd electron
npm run dev
```

Cette commande va :
1. Démarrer Next.js sur http://localhost:3001
2. Attendre que Next.js soit prêt
3. Lancer Electron avec l'application

### Compiler TypeScript uniquement

```bash
npm run compile
```

## Build Production

### Build complet

```bash
npm run build
```

Cette commande va :
1. Build Next.js pour production
2. Compiler TypeScript
3. Packager l'application Electron

### Build Windows uniquement

```bash
npm run build:win
```

L'installateur sera créé dans `electron/release/`

## Structure des Fichiers

```
electron/
├── main/                    # Processus principal Electron
│   ├── main.ts             # Point d'entrée
│   ├── server.ts           # Serveur HTTP local
│   ├── database.ts         # Gestion SQLite
│   ├── license.ts          # Système licence
│   ├── updater.ts          # Auto-update
│   ├── discovery.ts        # Découverte réseau
│   ├── preload.ts         # Preload script
│   ├── middleware/         # Middleware Express
│   ├── services/           # Services métier
│   ├── routes/             # Routes API
│   └── migrations/         # Migrations SQLite
├── shared/                 # Code partagé
│   ├── types/              # Types TypeScript
│   └── db-schema.ts       # Schéma base de données
├── package.json
├── tsconfig.json
└── README.md
```

## Dépannage

### Erreur "Cannot find module"

```bash
# Réinstaller les dépendances
cd electron
rm -rf node_modules package-lock.json
npm install
```

### Erreur de compilation TypeScript

Vérifier que `@types/node` est installé :
```bash
npm install --save-dev @types/node
```

### Port déjà utilisé

Le serveur local essaiera automatiquement le port suivant si le port 3000 est occupé.

### Base de données non initialisée

La base de données sera créée automatiquement au premier lancement dans :
- Windows: `%APPDATA%/kamer-kash-pme-electron/data/kamerkash.db`
- Linux: `~/.config/kamer-kash-pme-electron/data/kamerkash.db`
- macOS: `~/Library/Application Support/kamer-kash-pme-electron/data/kamerkash.db`

## Prochaines Étapes

1. Implémenter les services API restants (Products, Clients, Sales, etc.)
2. Créer l'interface d'activation de licence
3. Configurer le partage SQLite pour multi-utilisateurs
4. Tester l'application complète
