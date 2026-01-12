#!/bin/bash
# Script bash pour créer une release GitHub
# Usage: ./scripts/create-release.sh 1.0.1 "Description de la release"

set -e

# Vérifier les arguments
if [ $# -lt 1 ]; then
    echo "❌ Usage: $0 <version> [message]"
    echo "   Exemple: $0 1.0.1 \"Release version 1.0.1\""
    exit 1
fi

VERSION=$1
MESSAGE=${2:-"Release version $VERSION"}

# Validation du format de version
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-.*)?$ ]]; then
    echo "❌ Format de version invalide. Utilisez le format: X.Y.Z ou X.Y.Z-suffix"
    echo "   Exemples: 1.0.0, 1.2.3, 2.0.0-beta.1"
    exit 1
fi

# Ajouter le préfixe 'v' si absent
if [[ ! $VERSION =~ ^v ]]; then
    TAG_NAME="v$VERSION"
else
    TAG_NAME=$VERSION
    VERSION=${VERSION#v}  # Retirer le 'v' pour le message
fi

echo "🚀 Création de la release $TAG_NAME"
echo ""

# Vérifier que nous sommes dans un repository Git
if [ ! -d .git ]; then
    echo "❌ Erreur: Ce n'est pas un repository Git"
    exit 1
fi

# Vérifier que le repository est propre (pas de modifications non commitées)
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Attention: Il y a des modifications non commitées:"
    git status --short
    read -p "Voulez-vous continuer quand même? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Annulé"
        exit 1
    fi
fi

# Vérifier que le tag n'existe pas déjà
if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
    echo "❌ Le tag $TAG_NAME existe déjà"
    read -p "Voulez-vous le supprimer et le recréer? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Suppression du tag local..."
        git tag -d "$TAG_NAME" || true
        echo "Suppression du tag distant..."
        git push origin ":refs/tags/$TAG_NAME" || true
    else
        echo "❌ Annulé"
        exit 1
    fi
fi

# Créer le tag
echo "📝 Création du tag $TAG_NAME..."
git tag -a "$TAG_NAME" -m "$MESSAGE"

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la création du tag"
    exit 1
fi

echo "✅ Tag créé localement"

# Pousser le tag
echo "📤 Envoi du tag vers GitHub..."
git push origin "$TAG_NAME"

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'envoi du tag"
    echo "💡 Le tag a été créé localement. Vous pouvez le pousser manuellement avec:"
    echo "   git push origin $TAG_NAME"
    exit 1
fi

echo "✅ Tag poussé vers GitHub"
echo ""
echo "🎉 Release en cours de création!"
echo ""
echo "Le workflow GitHub Actions va maintenant:"
echo "  1. Builder l'application pour Windows et Linux"
echo "  2. Créer la release GitHub automatiquement"
echo "  3. Uploader les fichiers buildés"
echo ""
echo "📊 Suivez la progression ici:"
echo "   https://github.com/Durrell-Clair/kcp-desktop-app/actions"
echo ""
echo "📦 La release sera disponible ici:"
echo "   https://github.com/Durrell-Clair/kcp-desktop-app/releases/tag/$TAG_NAME"
echo ""
