# Créer une release maintenant (sans build)

Pour tester rapidement la connexion avec le site officiel, vous pouvez créer une release vide sur GitHub :

## Méthode rapide (Interface GitHub)

1. **Allez sur** : https://github.com/Durrell-Clair/kcp-desktop-app/releases

2. **Cliquez sur** : "Draft a new release" (ou "Create a new release")

3. **Remplissez** :
   - **Choose a tag** : Sélectionnez `v1.0.0` (ou créez un nouveau tag)
   - **Release title** : `Release v1.0.0`
   - **Describe this release** :
     ```
     ## 🎉 Première release de KAMER KASH PME Desktop
     
     Version initiale de l'application desktop.
     
     ### 📝 Notes
     - Application de gestion de caisse pour PME
     - Mode hors ligne
     - Support multi-utilisateurs sur réseau local
     ```

4. **Cochez** : "Set as the latest release" (si disponible)

5. **Cliquez sur** : "Publish release"

## Vérification

Après avoir créé la release :

1. Rafraîchissez la page : https://github.com/Durrell-Clair/kcp-desktop-app/releases
2. Vérifiez que la release `v1.0.0` apparaît
3. Allez sur : https://www.kamer-cash-pme.com/admin/downloads
4. La release devrait apparaître (même sans fichiers, pour tester la connexion)

## Note

Cette release est vide (sans fichiers .exe ou .AppImage). Pour ajouter les fichiers plus tard :
- Soit attendez que le workflow GitHub Actions se termine
- Soit uploadez les fichiers manuellement depuis l'interface GitHub
