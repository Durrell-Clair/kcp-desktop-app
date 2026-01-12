# Architecture Electron - Explication

## 🎯 Vue d'ensemble

L'application Electron intègre **à la fois le frontend et le backend** dans une seule application desktop, mais de manière modulaire.

## 📐 Architecture Actuelle

### 1. **Backend (Express) - Dans Electron**
- ✅ **Localisation** : Processus principal Electron (`electron/main/server.ts`)
- ✅ **Port** : 3000 (par défaut, peut changer si occupé)
- ✅ **Base de données** : SQLite locale (`kamerkash.db`)
- ✅ **API** : Toutes les routes API (`/api/*`) sont servies par ce serveur Express

### 2. **Frontend (Next.js) - Intégré dans Electron**
- ✅ **En développement** : 
  - Next.js tourne comme serveur séparé sur `localhost:3001`
  - Electron charge cette URL dans sa fenêtre
  - Le frontend se connecte au backend Express sur `localhost:3000`
  
- ✅ **En production** :
  - Next.js est buildé statiquement
  - Les fichiers statiques sont chargés directement par Electron
  - Le frontend se connecte toujours au backend Express sur `localhost:3000`

### 3. **Communication**
- ✅ Le frontend détecte automatiquement le port du serveur Electron via l'API `electronAPI.getLocalServerPort()`
- ✅ Toutes les requêtes API passent par HTTP vers le serveur Express local
- ✅ Pas besoin de serveur externe : tout est dans Electron !

## 🔄 Flux de Communication

```
┌─────────────────────────────────────────────────┐
│         Application Electron                     │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │  Renderer Process (Frontend Next.js)     │  │
│  │  - Interface utilisateur                 │  │
│  │  - Appels API via HTTP                   │  │
│  └──────────────┬─────────────────────────────┘  │
│                 │ HTTP (localhost:3000)          │
│                 ▼                                │
│  ┌──────────────────────────────────────────┐  │
│  │  Main Process (Backend Express)          │  │
│  │  - Serveur HTTP Express                 │  │
│  │  - Base de données SQLite                │  │
│  │  - Toutes les routes /api/*              │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## ✅ Ce qui est géré par Electron

1. **Backend Express** : ✅ Complètement intégré
   - Serveur HTTP local
   - Base de données SQLite
   - Toutes les routes API
   - Authentification JWT
   - Gestion des utilisateurs, produits, ventes, etc.

2. **Frontend Next.js** : ✅ Intégré
   - En dev : serveur Next.js séparé (pour hot-reload)
   - En prod : fichiers statiques chargés par Electron
   - Détection automatique du port backend

3. **Base de données** : ✅ SQLite locale
   - Fichier `kamerkash.db` dans le dossier de l'application
   - Mode WAL pour accès concurrent (multi-utilisateurs)

4. **Système de licence** : ✅ Intégré
   - Vérification locale
   - Activation en ligne (une fois)
   - Utilisation hors ligne

## 🚀 Comment ça fonctionne

### En développement :
```bash
cd electron
npm run dev
```

Cela lance :
1. **Next.js** sur `localhost:3001` (serveur de développement)
2. **Electron** qui :
   - Démarre le serveur Express sur `localhost:3000`
   - Ouvre une fenêtre qui charge `http://localhost:3001`
   - Le frontend détecte automatiquement le port 3000 et s'y connecte

### En production :
```bash
cd electron
npm run build
```

Cela :
1. Build Next.js en fichiers statiques
2. Compile TypeScript Electron
3. Package tout dans un exécutable Windows
4. L'utilisateur lance l'exe, tout est intégré !

## 🔧 Configuration

### Frontend détecte automatiquement le port

Le fichier `frontend/lib/api/client.ts` a été modifié pour :
- Détecter si on est dans Electron (`window.electronAPI`)
- Récupérer le port du serveur Electron via IPC
- Utiliser ce port pour toutes les requêtes API

**Résultat** : Aucune configuration manuelle nécessaire ! 🎉

## 📝 Résumé

**Oui, le frontend et le backend sont directement gérés via Electron !**

- ✅ Backend Express : Dans le processus principal Electron
- ✅ Frontend Next.js : Chargé dans la fenêtre Electron
- ✅ Base de données : SQLite locale dans Electron
- ✅ Communication : HTTP interne (localhost)
- ✅ Tout est intégré dans un seul exécutable

L'application est **100% autonome** et fonctionne **entièrement hors ligne** après l'activation de la licence !
