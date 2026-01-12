# Guide de débogage - Fenêtre blanche

Si l'application affiche une fenêtre blanche après l'installation, suivez ce guide pour diagnostiquer et résoudre le problème.

## 🔍 Diagnostic

### 1. Ouvrir les DevTools

L'application devrait maintenant ouvrir automatiquement les DevTools en cas d'erreur. Si ce n'est pas le cas :

1. **Via le menu** : `View` > `Toggle Developer Tools`
2. **Via le raccourci clavier** : `Ctrl+Shift+I` (Windows/Linux) ou `Cmd+Option+I` (Mac)
3. **Via le code** : Les DevTools s'ouvrent automatiquement en cas d'erreur

### 2. Vérifier la console

Dans les DevTools, allez dans l'onglet **Console** et cherchez :
- ❌ Erreurs en rouge
- ⚠️ Avertissements en jaune
- ℹ️ Messages d'information

### 3. Vérifier l'onglet Network

Dans les DevTools, allez dans l'onglet **Network** et rechargez la page (`F5`). Vérifiez :
- Les fichiers CSS/JS sont-ils chargés ?
- Y a-t-il des erreurs 404 (fichier introuvable) ?
- Les chemins des fichiers sont-ils corrects ?

## 🐛 Problèmes courants et solutions

### Problème 1 : Fichier renderer introuvable

**Symptômes** :
- Message d'erreur dans la console : "Fichier renderer introuvable"
- Page d'erreur affichée avec les chemins

**Cause** : Le dossier `renderer/` n'est pas inclus dans le build.

**Solution** :
1. Vérifiez que `package.json` contient `"renderer/**/*"` dans la section `files`
2. Rebuild l'application :
   ```powershell
   npm run build:win:local
   ```

### Problème 2 : Fichiers CSS/JS non chargés (404)

**Symptômes** :
- Erreurs 404 dans l'onglet Network
- Fichiers `css/main.css` ou `js/app.js` introuvables

**Cause** : Les chemins relatifs dans le HTML ne fonctionnent pas correctement.

**Solution** :
1. Vérifiez que les fichiers existent dans `renderer/css/` et `renderer/js/`
2. Vérifiez que le HTML utilise des chemins relatifs corrects
3. Si nécessaire, modifiez les chemins dans `renderer/index.html` pour utiliser des chemins absolus

### Problème 3 : Erreur JavaScript

**Symptômes** :
- Erreurs JavaScript dans la console
- Messages comme "Cannot read property of undefined"

**Solution** :
1. Vérifiez les erreurs dans la console
2. Vérifiez que tous les modules sont correctement importés
3. Vérifiez que le preload script fonctionne correctement

### Problème 4 : Serveur Express ne démarre pas

**Symptômes** :
- Erreurs dans la console du processus principal (main process)
- Messages comme "Port already in use" ou "Cannot start server"

**Solution** :
1. Vérifiez les logs dans la console du processus principal
2. Vérifiez qu'aucune autre application n'utilise le port 3000
3. Vérifiez que la base de données peut être initialisée

## 🔧 Vérifications à faire

### 1. Structure des fichiers dans le build

Après le build, vérifiez que les fichiers sont présents :

```
dist/win-unpacked/
├── resources/
│   └── app/
│       ├── renderer/
│       │   ├── index.html
│       │   ├── css/
│       │   └── js/
│       ├── dist/
│       │   └── main/
│       └── package.json
```

### 2. Test en mode développement

Testez d'abord en mode développement pour vérifier que tout fonctionne :

```powershell
npm run dev
```

Si ça fonctionne en dev mais pas en production, le problème vient de la configuration du build.

### 3. Vérifier les chemins

Dans `main.ts`, les chemins sont maintenant gérés automatiquement :
- En développement : `../../renderer/index.html`
- En production : `app.getAppPath()/renderer/index.html`

Si vous voyez un message d'erreur avec les chemins, vérifiez qu'ils correspondent à la structure réelle.

## 🛠️ Solutions de contournement

### Solution temporaire : Ouvrir les DevTools par défaut

Pour toujours ouvrir les DevTools (même en production), modifiez `main.ts` :

```typescript
// Toujours ouvrir DevTools (pour déboguer)
mainWindow.webContents.openDevTools();
```

**⚠️ Attention** : Retirez cette ligne avant la release finale pour des raisons de sécurité.

### Solution : Vérifier les logs

Les logs du processus principal sont affichés dans la console où vous avez lancé l'application. Si vous lancez l'exécutable directement, les logs peuvent ne pas être visibles.

Pour voir les logs :
1. Lancez l'application depuis la ligne de commande
2. Ou ajoutez un fichier de log (voir ci-dessous)

## 📝 Ajouter un système de logs

Pour mieux déboguer, vous pouvez ajouter un système de logs dans `main.ts` :

```typescript
import * as fs from 'fs';
import * as path from 'path';

const logFile = path.join(app.getPath('userData'), 'app.log');

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage);
}
```

Puis utilisez `log()` au lieu de `console.log()` pour les messages importants.

## ✅ Checklist de vérification

Avant de créer une release, vérifiez :

- [ ] L'application fonctionne en mode développement (`npm run dev`)
- [ ] Le dossier `renderer/` est inclus dans `package.json` > `build` > `files`
- [ ] Le dossier `build/` est inclus (pour les icônes)
- [ ] Les chemins dans `main.ts` utilisent `app.getAppPath()` en production
- [ ] Les fichiers CSS/JS sont chargés correctement (vérifier dans DevTools > Network)
- [ ] Aucune erreur dans la console
- [ ] Le serveur Express démarre correctement
- [ ] La base de données s'initialise correctement

## 🔗 Ressources

- [Documentation Electron - Application Distribution](https://www.electronjs.org/docs/latest/tutorial/application-distribution)
- [Documentation electron-builder - Configuration](https://www.electron.build/configuration/configuration)
