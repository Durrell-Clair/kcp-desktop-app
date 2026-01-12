# KAMER KASH PME - Application Desktop Electron

Application desktop multiplateforme pour la gestion de caisse et de point de vente pour les PME au Cameroun.

## 📋 Description

KAMER KASH PME est une application desktop développée avec Electron qui permet aux petites et moyennes entreprises camerounaises de gérer leurs ventes, stocks, clients et finances de manière simple et efficace. L'application fonctionne en mode hors ligne et peut être partagée sur un réseau local pour une utilisation multi-utilisateurs.

## ✨ Fonctionnalités

- 💰 **Gestion de caisse** : Enregistrement des ventes et paiements
- 📦 **Gestion de stock** : Suivi des produits et mouvements de stock
- 👥 **Gestion des clients** : Base de données clients avec historique
- 📊 **Tableaux de bord** : Statistiques et rapports de vente
- 🔐 **Authentification** : Système de sécurité avec rôles (Propriétaire, Caissier)
- 📄 **Licences** : Système de licences lié aux abonnements
- 🔄 **Mise à jour automatique** : Mises à jour via GitHub Releases
- 🌐 **Mode réseau** : Partage de base de données sur réseau local

## 🛠️ Technologies

- **Electron** : Framework pour applications desktop
- **TypeScript** : Langage de programmation
- **Express** : Serveur HTTP local
- **SQLite** : Base de données locale (better-sqlite3)
- **JWT** : Authentification par tokens
- **Bonjour/mDNS** : Découverte réseau
- **electron-builder** : Packaging et distribution

## 📦 Prérequis

- **Node.js** : Version 18.x ou supérieure
- **npm** : Version 9.x ou supérieure
- **Git** : Pour cloner le repository

### Pour le build Windows :
- Windows 10/11
- Visual Studio Build Tools (pour la compilation native)

### Pour le build Linux :
- Linux (Ubuntu/Debian recommandé)
- Build tools système

## 🚀 Installation

### 1. Cloner le repository

```bash
git clone https://github.com/Durrell-Clair/kcp-desktop-app.git
cd kcp-desktop-app
```

### 2. Installer les dépendances

```bash
npm install
```

**Note** : L'installation peut prendre quelques minutes car `better-sqlite3` doit être compilé pour votre plateforme.

### 3. Compiler TypeScript

```bash
npm run compile
```

## 💻 Développement

### Démarrer l'application en mode développement

```bash
npm run dev
```

Cette commande :
1. Compile le code TypeScript
2. Copie les migrations SQL
3. Lance Electron en mode développement

### Structure du projet

```
electron/
├── main/                    # Processus principal Electron
│   ├── main.ts              # Point d'entrée de l'application
│   ├── server.ts            # Serveur HTTP Express local
│   ├── database.ts          # Gestion de la base SQLite
│   ├── database-sharing.ts  # Partage réseau de la base
│   ├── license.ts           # Gestion des licences
│   ├── license-verification.ts # Vérification périodique
│   ├── updater.ts           # Mise à jour automatique
│   ├── discovery.ts         # Découverte réseau (mDNS)
│   ├── client-connection.ts # Connexion client réseau
│   ├── preload.ts           # Preload script sécurisé
│   ├── middleware/          # Middlewares Express
│   │   └── auth.ts          # Authentification JWT
│   ├── services/           # Services métier
│   │   ├── auth.service.ts
│   │   ├── companies.service.ts
│   │   ├── products.service.ts
│   │   ├── clients.service.ts
│   │   ├── sales.service.ts
│   │   └── ...
│   ├── routes/              # Routes API
│   │   └── index.ts
│   └── migrations/          # Migrations SQLite
│       └── 001_initial_schema.sql
├── renderer/                 # Interface utilisateur
│   ├── index.html
│   ├── css/
│   └── js/
├── shared/                  # Code partagé
│   ├── types/               # Types TypeScript
│   └── db-schema.ts         # Schéma de base de données
├── scripts/                  # Scripts utilitaires
│   └── copy-migrations.js
├── dist/                     # Fichiers compilés (généré)
├── package.json
├── tsconfig.json
└── README.md
```

## 🏗️ Build pour production

### Build pour Windows

```bash
npm run build:win
```

Cela génère un fichier `.exe` dans le dossier `dist/`.

### Build pour Linux

```bash
npm run build -- --linux
```

Cela génère des fichiers `.AppImage` et `.deb` dans le dossier `dist/`.

### Build pour toutes les plateformes

```bash
npm run build
```

## 📦 Créer une release GitHub

### Méthode rapide (avec script helper)

**Windows (PowerShell)** :
```powershell
.\scripts\create-release.ps1 -Version "1.0.1" -Message "Description de la release"
```

**Linux/Mac (Bash)** :
```bash
chmod +x scripts/create-release.sh
./scripts/create-release.sh 1.0.1 "Description de la release"
```

Le script va :
- Valider le format de version
- Créer le tag Git
- Pousser le tag vers GitHub
- Déclencher automatiquement le workflow GitHub Actions

### Méthode manuelle

1. **Mettre à jour la version** dans `package.json` (optionnel, pour référence)
2. **Créer un tag Git** :

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### Build et publication automatique

Le workflow GitHub Actions se déclenche automatiquement lors du push d'un tag au format `v*.*.*` (ex: `v1.0.0`, `v1.2.3`).

Le workflow va :
1. Builder l'application pour Windows et Linux (en parallèle)
2. Créer la release GitHub automatiquement
3. Uploader les fichiers buildés (.exe, .AppImage, .deb, etc.)

**Suivre la progression** : https://github.com/Durrell-Clair/kcp-desktop-app/actions

### 3. Publication manuelle

Pour publier manuellement sur GitHub Releases :

1. Configurer le token GitHub :

```bash
export GH_TOKEN=votre_token_github
```

2. Build avec publication :

```bash
npm run build -- --publish always
```

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet (optionnel pour le développement) :

```env
NODE_ENV=development
PORT=3000
```

### Configuration electron-builder

La configuration du build est définie dans `package.json` sous la section `build`. Pour personnaliser :

- **Windows** : Installer NSIS, icônes, etc.
- **Linux** : Formats AppImage, deb, rpm
- **macOS** : DMG, codesign (nécessite certificat Apple)

## 🧪 Tests

```bash
# Linter
npm run lint

# Formatage
npm run format
```

## 📝 Scripts disponibles

- `npm run dev` : Démarre l'application en mode développement
- `npm run build` : Build pour toutes les plateformes configurées
- `npm run build:win` : Build uniquement pour Windows
- `npm run compile` : Compile TypeScript uniquement
- `npm run start` : Lance Electron (nécessite un build préalable)
- `npm run lint` : Vérifie le code avec ESLint
- `npm run format` : Formate le code avec Prettier
- `npm run rebuild` : Recompile les modules natifs (better-sqlite3)

## 🔐 Sécurité

- Les mots de passe sont hashés avec bcrypt
- Authentification JWT avec expiration
- Preload script sécurisé pour l'IPC
- Validation des données côté serveur
- Protection CORS configurée

## 📄 Licence

Ce projet est privé et propriétaire. Tous droits réservés.

## 👥 Contribution

Ce projet est privé. Pour toute question ou suggestion, contactez l'équipe de développement.

## 🐛 Signaler un bug

Pour signaler un bug, créez une issue sur le repository GitHub avec :
- Description du problème
- Étapes pour reproduire
- Version de l'application
- Système d'exploitation

## 📞 Support

Pour obtenir de l'aide :
- Consultez la documentation dans `/docs`
- Créez une issue sur GitHub
- Contactez le support via le site officiel : https://www.kamer-cash-pme.com

## 🔄 Mise à jour

L'application vérifie automatiquement les mises à jour disponibles sur GitHub Releases. Les utilisateurs peuvent également télécharger manuellement les nouvelles versions depuis le site officiel.

## 📚 Documentation supplémentaire

- [Architecture](./ARCHITECTURE_EXPLICATION.md) : Explication de l'architecture
- [Instructions de setup](./SETUP_INSTRUCTIONS.md) : Guide de configuration détaillé
- [Implémentation](./IMPLEMENTATION_FINAL.md) : Détails d'implémentation

---

**Développé avec ❤️ pour les PME camerounaises**
