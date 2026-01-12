# Guide de création de releases

## Création automatique (recommandé)

### Mode automatique : Push vers main

**Le workflow se déclenche automatiquement à chaque push vers la branche `main`** :

1. **Faire un commit et pousser vers main** :
   ```bash
   git add .
   git commit -m "Vos modifications"
   git push origin main
   ```

2. **Le workflow GitHub Actions va automatiquement** :
   - Générer un numéro de version basé sur la date/heure (format: `vYYYY.MM.DD.HHmm`)
   - Créer un tag Git avec cette version
   - Builder l'application pour Windows et Linux (en parallèle)
   - Créer une release GitHub avec cette version
   - Uploader les fichiers buildés (.exe, .AppImage, .deb, etc.)

**Exemple de version générée** : `v2026.01.12.1430` (12 janvier 2026 à 14h30)

### Mode manuel : Push de tag

Si vous voulez créer une release avec une version spécifique :

1. **Créer un tag de version** :
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

2. **Le workflow GitHub Actions va automatiquement** :
   - Builder l'application pour Windows et Linux (en parallèle)
   - Créer une release GitHub avec la version du tag
   - Uploader les fichiers buildés (.exe, .AppImage, .deb, etc.)

3. **Vérifier le statut du workflow** :
   
   **Étape 1 : Vérifier que le workflow s'est déclenché**
   - Allez sur https://github.com/Durrell-Clair/kcp-desktop-app/actions
   - Vous devriez voir un nouveau workflow "Build and Release" en cours d'exécution
   - **Mode automatique** : Le workflow se déclenche automatiquement quelques secondes après le push vers `main`
   - **Mode manuel** : Le workflow se déclenche automatiquement quelques secondes après le push du tag
   
   **Étape 2 : Surveiller l'exécution**
   - Cliquez sur le workflow en cours pour voir les détails
   - **Mode automatique** : Vous verrez trois jobs : `generate-version` (génère la version), `build` (Windows et Linux), et `release`
   - **Mode manuel** : Vous verrez deux jobs : `build` (Windows et Linux) et `release`
   - Les builds s'exécutent en parallèle pour gagner du temps
   
   **Étape 3 : Vérifier le résultat**
   - ✅ **Succès** : Tous les jobs sont verts, la release est créée automatiquement
   - ⚠️ **Partiel** : Un build a échoué mais la release est créée avec les fichiers disponibles
   - ❌ **Échec** : Le workflow a échoué, consultez les logs pour identifier le problème
   
   **Étape 4 : Vérifier la release créée**
   - Allez sur https://github.com/Durrell-Clair/kcp-desktop-app/releases
   - La release devrait apparaître avec le tag que vous avez créé
   - Vérifiez que les fichiers sont présents dans la section "Assets"
   
   **Étape 5 : Vérifier sur le site officiel**
   - Allez sur https://www.kamer-cash-pme.com/admin/downloads
   - La release devrait apparaître dans la liste (peut prendre quelques minutes)

## Création manuelle (sans workflow)

Si le workflow GitHub Actions ne fonctionne pas ou si vous voulez créer une release sans build :

### Option 1 : Via l'interface GitHub

1. Allez sur https://github.com/Durrell-Clair/kcp-desktop-app/releases
2. Cliquez sur "Draft a new release"
3. Sélectionnez le tag `v1.0.0` (ou créez-en un nouveau)
4. Remplissez les informations :
   - **Release title** : `Release v1.0.0`
   - **Description** : Notes de version
5. Cliquez sur "Publish release"

### Option 2 : Via la ligne de commande (avec fichiers)

Si vous avez déjà buildé l'application localement :

```bash
# 1. Build l'application
npm run build:win

# 2. Créer une release avec GitHub CLI
gh release create v1.0.0 \
  --title "Release v1.0.0" \
  --notes "Première release de KAMER KASH PME Desktop" \
  dist/*.exe \
  dist/*.AppImage \
  dist/*.deb
```

### Option 3 : Release vide (pour tester)

Pour tester la connexion avec le site officiel sans fichiers :

```bash
gh release create v1.0.0 \
  --title "Release v1.0.0" \
  --notes "Première release de KAMER KASH PME Desktop - Version de test" \
  --draft
```

Puis publiez-la depuis l'interface GitHub.

## Vérification

Après avoir créé une release :

1. Vérifiez qu'elle apparaît sur : https://github.com/Durrell-Clair/kcp-desktop-app/releases
2. Vérifiez qu'elle n'est pas en "Draft" (sauf si c'est intentionnel)
3. Allez sur le site officiel : https://www.kamer-cash-pme.com/admin/downloads
4. La release devrait apparaître dans la liste

## Système de versionnement automatique

Lors d'un push vers `main`, le workflow génère automatiquement un numéro de version basé sur la date et l'heure :

- **Format** : `vYYYY.MM.DD.HHmm`
- **Exemple** : `v2026.01.12.1430` (12 janvier 2026 à 14h30)

**Avantages** :
- ✅ Version unique garantie (basée sur la date/heure)
- ✅ Ordre chronologique naturel
- ✅ Facile à lire et comprendre
- ✅ Pas de conflit possible

**Note** : Si un tag avec la même version existe déjà (très rare), le workflow incrémente automatiquement avec un suffixe (ex: `v2026.01.12.1430.1`).

## Dépannage

### Le workflow ne se déclenche pas

**Symptômes** : Aucun workflow n'apparaît dans l'onglet "Actions" après avoir poussé vers `main` ou un tag.

**Solutions** :
1. **Vérifier que GitHub Actions est activé** :
   - Allez sur Settings → Actions → General
   - Vérifiez que "Allow all actions and reusable workflows" est sélectionné
   
2. **Pour le mode automatique (push vers main)** :
   - Vérifiez que vous avez bien poussé vers la branche `main` (pas `master` ou une autre branche)
   - Vérifiez que le workflow est présent dans le repository
   
3. **Pour le mode manuel (push de tag)** :
   - Vérifiez que le tag a bien été poussé :
     ```bash
     git ls-remote --tags origin
     ```
   - Vérifiez le format du tag :
     - Le workflow se déclenche uniquement pour les tags au format `v*.*.*`
     - Exemples valides : `v1.0.0`, `v1.2.3`, `v2.0.0-beta.1`
     - Exemples invalides : `1.0.0`, `release-1.0.0`
   
4. **Vérifier que le workflow est dans le repository** :
   - Le fichier `.github/workflows/build-and-release.yml` doit être présent
   - Il doit être commité et poussé sur la branche principale

### Le build échoue

**Symptômes** : Le workflow s'est déclenché mais un ou plusieurs builds ont échoué.

**Solutions** :
1. **Consulter les logs détaillés** :
   - Cliquez sur le workflow dans GitHub Actions
   - Cliquez sur le job qui a échoué (build)
   - Lisez les logs pour identifier l'erreur exacte
   
2. **Tester le build localement** :
   ```bash
   npm run build:win    # Pour Windows
   npm run build -- --linux  # Pour Linux
   ```
   
3. **Vérifier les dépendances** :
   ```bash
   npm ci  # Réinstaller les dépendances
   ```
   
4. **Vérifier la configuration electron-builder** :
   - Vérifiez que `package.json` contient la section `build`
   - Vérifiez que les dépendances nécessaires sont installées

**Note** : Le workflow continue même si un build échoue. La release sera créée avec les fichiers disponibles.

### La release est créée mais sans fichiers

**Symptômes** : La release existe mais la section "Assets" est vide.

**Solutions** :
1. **Vérifier les logs du job "release"** :
   - Consultez l'étape "Find release files" pour voir si des fichiers ont été trouvés
   - Vérifiez l'étape "Create Release" pour voir les erreurs éventuelles
   
2. **Vérifier les chemins des artifacts** :
   - Les fichiers doivent être dans `dist/` après le build
   - Le workflow cherche : `*.exe`, `*.AppImage`, `*.deb`, etc.
   
3. **Vérifier que les builds ont réussi** :
   - Si tous les builds échouent, aucun fichier ne sera disponible
   - La release sera créée mais vide

### La release n'apparaît pas sur le site officiel

**Symptômes** : La release existe sur GitHub mais n'apparaît pas sur le site.

**Solutions** :
1. **Vérifier les variables d'environnement sur Vercel** :
   - `VITE_GITHUB_OWNER=Durrell-Clair`
   - `VITE_GITHUB_REPO=kcp-desktop-app`
   - `VITE_GITHUB_TOKEN` (optionnel mais recommandé)
   
2. **Redéployer l'application** :
   - Après avoir modifié les variables, redéployez sur Vercel
   - Les variables d'environnement ne sont prises en compte qu'après un redéploiement
   
3. **Vérifier la console du navigateur** :
   - Ouvrez les outils de développement (F12)
   - Allez dans l'onglet "Console" ou "Network"
   - Cherchez les erreurs liées à l'API GitHub
   
4. **Vérifier le token GitHub** :
   - Si vous utilisez un token, vérifiez qu'il est valide
   - Le token doit avoir la permission `public_repo` (ou `repo` si le repository est privé)
   - Vérifiez que le token n'a pas expiré
   
5. **Vérifier que la release n'est pas en draft** :
   - Les releases en draft ne sont pas accessibles via l'API publique
   - Publiez la release depuis l'interface GitHub

### Le workflow prend trop de temps

**Temps d'exécution normal** :
- Génération de version (mode auto) : ~10 secondes
- Build Windows : ~10-15 minutes
- Build Linux : ~5-10 minutes
- Création de release : ~1-2 minutes
- **Total** : ~15-20 minutes

Si le workflow prend plus de temps, vérifiez :
- Les logs pour identifier les étapes lentes
- La charge des runners GitHub (peut varier selon l'heure)
- Les erreurs qui causent des retries

## Désactiver les releases automatiques

Si vous ne voulez pas créer de release automatiquement à chaque push vers `main`, vous avez plusieurs options :

### Option 1 : Modifier le workflow

Éditez `.github/workflows/build-and-release.yml` et supprimez ou commentez la section `branches: [main]` :

```yaml
on:
  push:
    # branches:
    #   - main  # Commenté pour désactiver les releases automatiques
    tags:
      - 'v*.*.*'  # Les releases manuelles avec tags continuent de fonctionner
```

### Option 2 : Utiliser un commit message spécial

Vous pouvez modifier le workflow pour qu'il ne se déclenche que si le message de commit contient `[release]` ou un autre mot-clé.

### Option 3 : Utiliser une branche différente

Ne poussez vers `main` que lorsque vous voulez créer une release. Utilisez une branche de développement pour les commits quotidiens.
