#!/usr/bin/env bash
# Script de lancement pour Graphe Métro Paris
# - Crée/active un environnement virtuel Python si nécessaire
# - Installe les dépendances
# - Lance le serveur Flask

set -euo pipefail

# Aller à la racine du projet (ce script supposé être à la racine)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Déterminer la commande Python
PYCMD="python"
if command -v python3 &> /dev/null; then
  PYCMD="python3"
elif ! command -v python &> /dev/null; then
  echo "[ERREUR] Python introuvable dans le PATH. Installez Python 3 et réessayez."
  exit 1
fi

# Créer l'environnement virtuel si absent
if [ ! -d ".venv" ]; then
  echo "[INFO] Création de l'environnement virtuel .venv"
  "$PYCMD" -m venv .venv
fi

# Activer l'environnement
# shellcheck source=/dev/null
source .venv/bin/activate

# Installer les dépendances si nécessaire
if [ -f requirements.txt ]; then
  echo "[INFO] Installation des dépendances..."
  pip install -r requirements.txt
else
  echo "[AVERTISSEMENT] Fichier requirements.txt introuvable, passage de l'installation."
fi

# Lancer l'application
echo "[INFO] Démarrage du serveur Flask..."
python run.py || .venv/bin/python run.py || "$PYCMD" run.py
