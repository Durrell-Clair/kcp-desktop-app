#!/bin/bash
# Script bash pour builder l'application Windows localement
# Usage: ./scripts/build-windows.sh

set -e

echo "🔨 Build Windows - KAMER KASH PME"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le dossier electron/"
    exit 1
fi

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Erreur: Node.js n'est pas installé ou n'est pas dans le PATH"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js détecté: $NODE_VERSION"

# Vérifier npm
if ! command -v npm &> /dev/null; then
    echo "❌ Erreur: npm n'est pas installé ou n'est pas dans le PATH"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "✅ npm détecté: v$NPM_VERSION"
echo ""

echo "📦 Étape 1: Compilation TypeScript..."
npm run compile

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la compilation TypeScript"
    exit 1
fi

echo "✅ Compilation TypeScript terminée"
echo ""

echo "🔨 Étape 2: Build de l'application Windows..."
echo "   Cela peut prendre plusieurs minutes..."
echo ""

# Build Windows sans publication (avec signature si possible)
npm run build -- --win --publish never

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build Windows"
    exit 1
fi

echo ""
echo "✅ Build terminé avec succès!"
echo ""

# Chercher le fichier .exe généré
EXE_FILE=$(find dist -name "*.exe" -type f | head -n 1)

if [ -z "$EXE_FILE" ]; then
    echo "⚠️  Aucun fichier .exe trouvé dans dist/"
    echo "   Vérifiez les logs ci-dessus pour identifier le problème"
    exit 1
fi

EXE_NAME=$(basename "$EXE_FILE")
EXE_SIZE=$(du -h "$EXE_FILE" | cut -f1)

echo "📦 Fichier généré:"
echo "   Nom: $EXE_NAME"
echo "   Taille: $EXE_SIZE"
echo "   Emplacement: $EXE_FILE"
echo ""

echo "🎉 Build terminé! Vous pouvez maintenant créer une release manuelle sur GitHub."
echo ""
echo "💡 Pour créer une release:"
echo "   1. Allez sur: https://github.com/Durrell-Clair/kcp-desktop-app/releases"
echo "   2. Cliquez sur 'Create a new release'"
echo "   3. Uploadez le fichier: $EXE_NAME"
echo ""
echo "   Ou utilisez: ./scripts/create-release-manual.sh"
echo ""
