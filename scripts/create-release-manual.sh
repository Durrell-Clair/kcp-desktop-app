#!/bin/bash
# Script bash pour faciliter la création manuelle de release GitHub
# Usage: ./scripts/create-release-manual.sh

set -e

echo "📦 Création manuelle de release GitHub"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le dossier electron/"
    exit 1
fi

# Chercher le fichier .exe le plus récent
EXE_FILE=$(find dist -name "*.exe" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)

if [ -z "$EXE_FILE" ]; then
    echo "❌ Aucun fichier .exe trouvé dans dist/"
    echo ""
    echo "💡 Vous devez d'abord builder l'application:"
    echo "   npm run build:win:local"
    echo "   ou"
    echo "   ./scripts/build-windows.sh"
    exit 1
fi

EXE_NAME=$(basename "$EXE_FILE")
EXE_SIZE=$(du -h "$EXE_FILE" | cut -f1)
EXE_DATE=$(stat -c %y "$EXE_FILE" | cut -d' ' -f1,2 | cut -d'.' -f1)

echo "📦 Fichier .exe trouvé:"
echo "   Nom: $EXE_NAME"
echo "   Taille: $EXE_SIZE"
echo "   Date: $EXE_DATE"
echo "   Chemin: $EXE_FILE"
echo ""

# Demander la version
echo "📝 Informations pour la release:"
read -p "Version de la release (ex: v1.0.0): " version
if [ -z "$version" ]; then
    echo "❌ Version requise"
    exit 1
fi

# Ajouter le préfixe 'v' si absent
if [[ ! $version =~ ^v ]]; then
    version="v$version"
fi

read -p "Titre de la release (optionnel, défaut: Release $version): " release_title
if [ -z "$release_title" ]; then
    release_title="Release $version"
fi

read -p "Notes de version (optionnel, appuyez sur Entrée pour ignorer): " release_notes

echo ""
echo "🔖 Créer un tag Git?"
read -p "Créer le tag $version? (y/N): " create_tag
tag_created=false

if [[ $create_tag =~ ^[Yy]$ ]]; then
    # Vérifier si le tag existe déjà
    if git rev-parse "$version" >/dev/null 2>&1; then
        echo "⚠️  Le tag $version existe déjà"
        read -p "Voulez-vous le supprimer et le recréer? (y/N): " overwrite
        if [[ $overwrite =~ ^[Yy]$ ]]; then
            echo "🗑️  Suppression du tag local..."
            git tag -d "$version" 2>/dev/null || true
            echo "🗑️  Suppression du tag distant..."
            git push origin ":refs/tags/$version" 2>/dev/null || true
        else
            echo "❌ Annulé"
            exit 1
        fi
    fi
    
    echo "📝 Création du tag $version..."
    tag_message="${release_notes:-Release $version}"
    git tag -a "$version" -m "$tag_message"
    
    if [ $? -eq 0 ]; then
        echo "📤 Envoi du tag vers GitHub..."
        git push origin "$version"
        if [ $? -eq 0 ]; then
            tag_created=true
            echo "✅ Tag créé et poussé avec succès"
        else
            echo "⚠️  Tag créé localement mais erreur lors du push"
        fi
    else
        echo "❌ Erreur lors de la création du tag"
    fi
    echo ""
fi

# Ouvrir GitHub Releases dans le navigateur
releases_url="https://github.com/Durrell-Clair/kcp-desktop-app/releases/new"
echo "🌐 Ouverture de GitHub Releases dans le navigateur..."

if command -v xdg-open &> /dev/null; then
    xdg-open "$releases_url"
elif command -v open &> /dev/null; then
    open "$releases_url"
else
    echo "   URL: $releases_url"
fi

echo ""
echo "📋 Instructions pour créer la release:"
echo ""
echo "1. Dans la page GitHub qui vient de s'ouvrir:"
echo "   - Choisissez le tag: $version"
if [ "$tag_created" = false ]; then
    echo "     (Si le tag n'existe pas, créez-le d'abord ou créez un nouveau tag)"
fi
echo "   - Titre: $release_title"
if [ -n "$release_notes" ]; then
    echo "   - Description: $release_notes"
fi
echo ""
echo "2. Dans la section 'Attach binaries':"
echo "   - Cliquez sur 'Choose your files' ou glissez-déposez le fichier"
echo "   - Sélectionnez: $EXE_FILE"
echo ""
echo "3. Cliquez sur 'Publish release'"
echo ""
echo "💡 Le fichier .exe est ici:"
echo "   $EXE_FILE"
echo ""

echo "✅ Prêt! Suivez les instructions ci-dessus pour créer la release."
echo ""
