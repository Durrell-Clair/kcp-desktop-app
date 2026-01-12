#!/usr/bin/env python3
"""
Script Python pour créer automatiquement une release GitHub
avec upload du fichier .exe généré.

Usage:
    python scripts/create-release-github.py [--version VERSION] [--title TITLE] [--notes NOTES] [--token TOKEN]
"""

import os
import sys
import json
import argparse
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional, Tuple

try:
    import requests
except ImportError:
    print("❌ Erreur: Le module 'requests' n'est pas installé.")
    print("   Installez-le avec: pip install requests")
    sys.exit(1)

# Configuration GitHub
GITHUB_OWNER = "Durrell-Clair"
GITHUB_REPO = "kcp-desktop-app"
GITHUB_API_BASE = "https://api.github.com"


def find_latest_exe(dist_dir: Path) -> Optional[Path]:
    """Trouve le fichier .exe le plus récent dans dist/"""
    exe_files = list(dist_dir.rglob("*.exe"))
    
    # Filtrer pour ne garder que les fichiers de setup (pas les exe dans win-unpacked)
    setup_files = [f for f in exe_files if "Setup" in f.name or "setup" in f.name.lower()]
    
    if not setup_files:
        # Si aucun fichier setup, prendre tous les exe
        setup_files = exe_files
    
    if not setup_files:
        return None
    
    # Retourner le plus récent
    return max(setup_files, key=lambda f: f.stat().st_mtime)


def get_git_tag_version() -> Optional[str]:
    """Récupère la version depuis package.json"""
    package_json = Path("package.json")
    if package_json.exists():
        try:
            with open(package_json, "r", encoding="utf-8") as f:
                data = json.load(f)
                version = data.get("version", "1.0.0")
                return f"v{version}"
        except Exception:
            pass
    return None


def create_git_tag(tag_name: str, message: str) -> bool:
    """Crée un tag Git local"""
    try:
        # Vérifier si le tag existe déjà
        result = subprocess.run(
            ["git", "tag", "-l", tag_name],
            capture_output=True,
            text=True,
            check=False
        )
        if result.stdout.strip():
            print(f"⚠️  Le tag {tag_name} existe déjà localement")
            response = input("Voulez-vous le supprimer et le recréer? (o/N): ")
            if response.lower() in ['o', 'oui', 'y', 'yes']:
                subprocess.run(["git", "tag", "-d", tag_name], check=False)
                # Supprimer aussi sur le remote si présent
                subprocess.run(
                    ["git", "push", "origin", ":refs/tags/" + tag_name],
                    check=False
                )
            else:
                return False
        
        # Créer le tag
        subprocess.run(
            ["git", "tag", "-a", tag_name, "-m", message],
            check=True
        )
        print(f"✅ Tag Git créé: {tag_name}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur lors de la création du tag: {e}")
        return False
    except FileNotFoundError:
        print("❌ Git n'est pas installé ou n'est pas dans le PATH")
        return False


def push_git_tag(tag_name: str) -> bool:
    """Pousse le tag vers GitHub"""
    try:
        subprocess.run(
            ["git", "push", "origin", tag_name],
            check=True
        )
        print(f"✅ Tag poussé vers GitHub: {tag_name}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"⚠️  Erreur lors du push du tag: {e}")
        print("   Le tag a été créé localement mais n'a pas été poussé")
        return False


def create_github_release(
    token: str,
    tag_name: str,
    title: str,
    notes: str,
    draft: bool = False,
    prerelease: bool = False
) -> Optional[dict]:
    """Crée une release GitHub via l'API"""
    url = f"{GITHUB_API_BASE}/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases"
    
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    data = {
        "tag_name": tag_name,
        "name": title,
        "body": notes,
        "draft": draft,
        "prerelease": prerelease
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur lors de la création de la release: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                print(f"   Détails: {error_data.get('message', 'Erreur inconnue')}")
            except:
                print(f"   Status: {e.response.status_code}")
        return None


def upload_release_asset(
    token: str,
    release_id: int,
    file_path: Path,
    label: Optional[str] = None
) -> bool:
    """Upload un fichier comme asset d'une release GitHub"""
    url = f"{GITHUB_API_BASE}/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases/{release_id}/assets"
    
    # Construire l'URL avec le nom du fichier
    file_name = file_path.name
    url = f"{url}?name={file_name}"
    
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    try:
        with open(file_path, "rb") as f:
            files = {"file": (file_name, f, "application/octet-stream")}
            response = requests.post(url, headers=headers, files=files)
            response.raise_for_status()
            print(f"✅ Fichier uploadé: {file_name}")
            return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur lors de l'upload du fichier: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                print(f"   Détails: {error_data.get('message', 'Erreur inconnue')}")
            except:
                print(f"   Status: {e.response.status_code}")
        return False


def format_file_size(size_bytes: int) -> str:
    """Formate la taille d'un fichier en format lisible"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"


def main():
    parser = argparse.ArgumentParser(
        description="Créer automatiquement une release GitHub avec upload du fichier .exe"
    )
    parser.add_argument(
        "--version",
        help="Version de la release (ex: v1.0.0). Si non spécifié, sera demandé ou généré depuis package.json"
    )
    parser.add_argument(
        "--title",
        help="Titre de la release. Si non spécifié, sera 'Release {version}'"
    )
    parser.add_argument(
        "--notes",
        help="Notes de version (description). Si non spécifié, sera demandé ou vide"
    )
    parser.add_argument(
        "--token",
        help="Token GitHub (GITHUB_TOKEN). Si non spécifié, sera lu depuis la variable d'environnement GITHUB_TOKEN"
    )
    parser.add_argument(
        "--no-tag",
        action="store_true",
        help="Ne pas créer de tag Git (utiliser un tag existant)"
    )
    parser.add_argument(
        "--draft",
        action="store_true",
        help="Créer la release en mode brouillon"
    )
    parser.add_argument(
        "--prerelease",
        action="store_true",
        help="Marquer la release comme pré-release"
    )
    
    args = parser.parse_args()
    
    print("🚀 Création automatique de release GitHub")
    print("=" * 50)
    print()
    
    # 1. Trouver le fichier .exe
    dist_dir = Path("dist")
    if not dist_dir.exists():
        print("❌ Erreur: Le dossier 'dist' n'existe pas")
        print("   Exécutez d'abord: npm run build:win:local")
        sys.exit(1)
    
    exe_file = find_latest_exe(dist_dir)
    if not exe_file:
        print("❌ Erreur: Aucun fichier .exe trouvé dans dist/")
        print("   Exécutez d'abord: npm run build:win:local")
        sys.exit(1)
    
    file_size = exe_file.stat().st_size
    print(f"📦 Fichier trouvé: {exe_file.name}")
    print(f"   Taille: {format_file_size(file_size)}")
    print(f"   Chemin: {exe_file}")
    print()
    
    # 2. Obtenir ou demander la version
    version = args.version
    if not version:
        default_version = get_git_tag_version()
        if default_version:
            version = input(f"Version de la release [{default_version}]: ").strip() or default_version
        else:
            version = input("Version de la release (ex: v1.0.0): ").strip()
    
    if not version:
        print("❌ Version requise")
        sys.exit(1)
    
    # Ajouter le préfixe 'v' si absent
    if not version.startswith("v"):
        version = f"v{version}"
    
    # 3. Obtenir ou demander le titre
    title = args.title or f"Release {version}"
    
    # 4. Obtenir ou demander les notes
    notes = args.notes
    if not notes:
        notes = input("Notes de version (optionnel, appuyez sur Entrée pour ignorer): ").strip()
    
    # 5. Obtenir le token GitHub
    token = args.token or os.getenv("GITHUB_TOKEN")
    if not token:
        print("❌ Erreur: Token GitHub requis")
        print("   Fournissez-le via:")
        print("   - L'argument --token")
        print("   - La variable d'environnement GITHUB_TOKEN")
        print()
        print("   Pour créer un token:")
        print("   1. Allez sur https://github.com/settings/tokens")
        print("   2. Créez un token avec les permissions 'repo'")
        sys.exit(1)
    
    print()
    print("📋 Informations de la release:")
    print(f"   Version: {version}")
    print(f"   Titre: {title}")
    print(f"   Notes: {notes or '(aucune)'}")
    print(f"   Fichier: {exe_file.name}")
    print()
    
    # 6. Créer le tag Git (si demandé)
    if not args.no_tag:
        create_tag = input("Créer un tag Git? (O/n): ").strip().lower()
        if create_tag in ['', 'o', 'oui', 'y', 'yes']:
            tag_message = notes or f"Release {version}"
            if create_git_tag(version, tag_message):
                push_tag = input("Pousser le tag vers GitHub? (O/n): ").strip().lower()
                if push_tag in ['', 'o', 'oui', 'y', 'yes']:
                    push_git_tag(version)
            print()
    else:
        print("ℹ️  Création de tag Git désactivée (--no-tag)")
        print()
    
    # 7. Créer la release GitHub
    print("🌐 Création de la release GitHub...")
    release = create_github_release(
        token=token,
        tag_name=version,
        title=title,
        notes=notes or f"Release {version}",
        draft=args.draft,
        prerelease=args.prerelease
    )
    
    if not release:
        print("❌ Échec de la création de la release")
        sys.exit(1)
    
    release_id = release["id"]
    release_url = release["html_url"]
    print(f"✅ Release créée: {release_url}")
    print()
    
    # 8. Uploader le fichier
    print(f"📤 Upload du fichier {exe_file.name}...")
    print("   Cela peut prendre plusieurs minutes selon la taille du fichier...")
    
    if upload_release_asset(token, release_id, exe_file):
        print()
        print("🎉 Release créée avec succès!")
        print()
        print(f"📦 Release: {release_url}")
        print(f"📁 Fichier: {exe_file.name} ({format_file_size(file_size)})")
        print()
    else:
        print()
        print("⚠️  La release a été créée mais l'upload du fichier a échoué")
        print(f"   Vous pouvez uploader manuellement: {release_url}")
        sys.exit(1)


if __name__ == "__main__":
    main()
