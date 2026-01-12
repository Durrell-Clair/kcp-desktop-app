# Guide de signature de code pour Windows

Ce guide explique comment activer et configurer la signature de code pour les builds Windows, tout en résolvant les erreurs de privilèges liées aux liens symboliques.

## 🔍 Problème identifié

L'erreur `Cannot create symbolic link : A required privilege is not held by the client` se produit parce que :
- electron-builder télécharge et extrait `winCodeSign` (outils de signature)
- L'extraction nécessite des privilèges pour créer des liens symboliques
- Par défaut, Windows nécessite des privilèges administrateur pour créer des liens symboliques

## ✅ Solutions (par ordre de recommandation)

### Solution 1 : Activer le Mode Développeur Windows (RECOMMANDÉ)

Le Mode Développeur Windows permet de créer des liens symboliques sans privilèges administrateur.

#### Étapes :

1. **Ouvrir les Paramètres Windows**
   - Appuyez sur `Windows + I`
   - Ou allez dans Démarrer > Paramètres

2. **Accéder aux Paramètres de confidentialité**
   - Allez dans **Confidentialité et sécurité**
   - Puis **Pour les développeurs**

3. **Activer le Mode Développeur**
   - Activez le bouton **Mode développeur**
   - Windows vous demandera de redémarrer (optionnel, mais recommandé)

4. **Vérifier l'activation**
   - Le Mode Développeur devrait maintenant être activé
   - Vous pouvez maintenant créer des liens symboliques sans privilèges admin

#### Avantages :
- ✅ Pas besoin d'exécuter en tant qu'administrateur
- ✅ Solution permanente (une fois activée, reste active)
- ✅ Sécurisé (pas de privilèges admin permanents)
- ✅ Recommandé par Microsoft pour les développeurs

#### Après activation :

Vous pouvez maintenant utiliser la commande normale sans désactiver la signature :

```powershell
npm run build:win:local
```

Ou créer une nouvelle commande qui garde la signature :

```powershell
npm run build:win:signed
```

---

### Solution 2 : Exécuter PowerShell en tant qu'administrateur

Si vous ne pouvez pas activer le Mode Développeur, vous pouvez exécuter PowerShell avec des privilèges administrateur.

#### Étapes :

1. **Ouvrir PowerShell en tant qu'administrateur**
   - Cliquez droit sur le menu Démarrer
   - Sélectionnez **Windows PowerShell (Admin)** ou **Terminal (Admin)**
   - Confirmez l'élévation de privilèges

2. **Naviguer vers le dossier du projet**
   ```powershell
   cd C:\Users\User\Downloads\KAMER-KASH-PME\electron
   ```

3. **Exécuter le build**
   ```powershell
   npm run build:win:local
   ```

#### Avantages :
- ✅ Fonctionne immédiatement
- ✅ Pas de configuration supplémentaire

#### Inconvénients :
- ⚠️ Nécessite des privilèges administrateur à chaque fois
- ⚠️ Moins sécurisé (exécution avec privilèges élevés)
- ⚠️ Peut causer des problèmes de permissions avec npm/node_modules

---

### Solution 3 : Configurer une politique de groupe (Avancé)

Pour les environnements d'entreprise, vous pouvez configurer une politique de groupe pour permettre les liens symboliques.

#### Étapes :

1. **Ouvrir l'Éditeur de stratégie de groupe locale**
   - Appuyez sur `Windows + R`
   - Tapez `gpedit.msc` et appuyez sur Entrée

2. **Naviguer vers la politique**
   - Allez dans **Configuration ordinateur** > **Modèles d'administration** > **Système**
   - Trouvez **Créer des liens symboliques**

3. **Activer la politique**
   - Double-cliquez sur **Créer des liens symboliques**
   - Sélectionnez **Activé**
   - Cliquez sur **OK**

4. **Redémarrer l'ordinateur** (recommandé)

#### Note :
Cette méthode nécessite Windows Pro, Enterprise ou Education. Windows Home ne dispose pas de l'Éditeur de stratégie de groupe.

---

### Solution 4 : Utiliser un certificat de signature personnalisé

Si vous avez un certificat de signature de code (obtenu auprès d'une autorité de certification), vous pouvez le configurer.

#### Configuration :

1. **Obtenir un certificat de signature de code**
   - Achetez un certificat auprès d'une autorité de certification (ex: DigiCert, Sectigo)
   - Ou créez un certificat auto-signé pour les tests (non recommandé pour la production)

2. **Configurer electron-builder**

   Ajoutez dans `package.json` :

   ```json
   {
     "build": {
       "win": {
         "certificateFile": "path/to/certificate.pfx",
         "certificatePassword": "your-password",
         "signingHashAlgorithms": ["sha256"],
         "sign": "path/to/signtool.exe"
       }
     }
   }
   ```

   Ou utilisez des variables d'environnement :

   ```powershell
   $env:CSC_LINK = "path/to/certificate.pfx"
   $env:CSC_KEY_PASSWORD = "your-password"
   npm run build:win:local
   ```

#### Avantages :
- ✅ Signature numérique valide pour les utilisateurs finaux
- ✅ Pas d'avertissement Windows lors de l'installation
- ✅ Confiance accrue des utilisateurs

#### Inconvénients :
- ⚠️ Coût (certificats commerciaux coûtent généralement 100-500€/an)
- ⚠️ Configuration plus complexe
- ⚠️ Nécessite toujours de résoudre le problème des liens symboliques

---

## 🛠️ Configuration recommandée

### Pour le développement local

**Recommandation** : Activer le Mode Développeur Windows (Solution 1)

1. Activez le Mode Développeur
2. Utilisez la commande normale :

```powershell
npm run build:win:local
```

### Pour la production

**Recommandation** : Utiliser GitHub Actions avec un certificat de signature

1. Configurez un certificat de signature dans les secrets GitHub
2. Le workflow GitHub Actions signera automatiquement les builds
3. Les builds locaux peuvent rester non signés pour les tests

---

## 📝 Commandes npm recommandées

Après avoir activé le Mode Développeur, vous pouvez créer ces commandes :

```json
{
  "scripts": {
    "build:win:local": "npm run compile && electron-builder --win --publish never",
    "build:win:signed": "npm run compile && electron-builder --win --publish never",
    "build:win:unsigned": "cross-env CSC_IDENTITY_AUTO_DISCOVERY=false npm run compile && electron-builder --win --publish never"
  }
}
```

- `build:win:local` : Build avec signature (si Mode Développeur activé)
- `build:win:signed` : Build avec signature explicite
- `build:win:unsigned` : Build sans signature (pour contourner les problèmes)

---

## 🔍 Vérification

Pour vérifier si votre build est signé :

1. **Vérifier le fichier .exe**
   - Clic droit sur le fichier .exe généré
   - Sélectionnez **Propriétés**
   - Allez dans l'onglet **Signature numérique**
   - Si signé, vous verrez les détails du certificat

2. **Vérifier avec PowerShell**
   ```powershell
   Get-AuthenticodeSignature -FilePath "dist\KAMER KASH PME Setup X.X.X.exe"
   ```

---

## ⚠️ Notes importantes

1. **Builds locaux vs Production**
   - Les builds locaux peuvent être non signés pour les tests
   - Les builds de production devraient être signés avec un certificat valide

2. **Avertissements Windows**
   - Les fichiers non signés afficheront un avertissement "Publisher Unknown"
   - C'est normal pour les builds de développement
   - Les utilisateurs peuvent toujours installer en cliquant sur "Plus d'infos" > "Exécuter quand même"

3. **GitHub Actions**
   - Les builds sur GitHub Actions peuvent être signés automatiquement
   - Configurez les secrets GitHub avec votre certificat
   - Le workflow signera les builds avant de créer la release

---

## 🔗 Ressources supplémentaires

- [Documentation electron-builder - Code Signing](https://www.electron.build/code-signing)
- [Microsoft - Mode Développeur Windows](https://docs.microsoft.com/fr-fr/windows/apps/get-started/enable-your-device-for-development)
- [Guide des certificats de signature de code](https://docs.microsoft.com/fr-fr/windows/win32/seccrypto/cryptography-tools)
