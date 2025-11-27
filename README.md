# Graphe Métro Paris

Projet simple en Python + Flask + interface web minimale pour explorer le graphe du métro parisien (données 1998-2002) fourni dans `Data/metro.txt` et les positions dans `Data/pospoints.txt`.

## Objectifs
- Charger les stations et les temps de parcours entre elles.
- Visualiser les stations sur un canevas (positions approximatives fournies).
- Obtenir le plus court chemin (en secondes) entre deux stations via Bellman Ford.
- Fournir des endpoints API simples.

## Arborescence
```
Data/
  metro.txt
  pospoints.txt
app/
  graph.py        # parsing + structure + Bellman Ford
  api.py          # endpoints Flask
static/
  index.html      # interface web
  css/style.css
  js/app.js
run.py             # point d'entrée serveur
requirements.txt   # dépendances (Flask)
README.md
```

## Installation
Pré-requis : Python 3.10+ conseillé (tout 3.x devrait fonctionner).

1. Créez un environnement virtuel (optionnel mais recommandé) :
```bash
python -m venv .venv
source .venv/bin/activate
```
2. Installez les dépendances :
```bash
pip install -r requirements.txt
```

## Lancer l'API (serveur Flask)
```bash
python run.py
```
Par défaut le serveur écoute sur `http://127.0.0.1:5000`.

## Interface Web
Une fois le serveur lancé, ouvrez simplement :
```
http://127.0.0.1:5000/
```
Interface disponible :
- Sélection de station de départ / arrivée (menu déroulant trié par ID).
- Bouton pour calculer le plus court chemin.
- Affichage de la liste des stations sur le chemin et du temps total.
- Visualisation: canevas avec les stations (points) et le chemin surligné en rouge / bleu.

## Endpoints API
- `GET /health` : statut rapide.
- `GET /stations` : liste des stations.
- `GET /station/<id>` : détails d'une station (voisins inclus).
- `GET /graph` : dump JSON du graphe (stations + arrêtes).
- `GET /path?start=<id>&end=<id>` : plus court chemin (temps + séquence).

## Exemple d'appel
```bash
curl 'http://127.0.0.1:5000/path?start=0&end=10'
```
Réponse type :
```json
{
  "total_time_seconds": 200,
  "path": [0, 238, ... , 10],
  "stations": ["Abbesses", "Pigalle", "...", "Aubervilliers-Pantin, Quatre Chemins"]
}
```

## Détails d'implémentation
- Parsing :
  - Lignes commençant par `V` définissent des stations.
  - Lignes `E` définissent des arrêtes bidirectionnelles avec temps en secondes.
  - Les noms dans `pospoints.txt` utilisent `@` comme séparateur d'espaces, normalisés lors du chargement.
- Algorithme : Bellman Ford classique (heapq) pour minimiser la somme des temps.
- Les coordonnées ne sont pas disponibles pour toutes les stations; seules celles trouvées sont tracées.

## Hypothèses / Simplifications
- Le PDF original précise le format; l'interpréteur actuel suppose que le 4ème bloc après le nom (`True`/`False`) est le flag terminus et le dernier entier le numéro de branche.
- Les correspondances (temps de transfert) sont traitées comme des arrêtes normales.
- Pas de différenciation de lignes dans le calcul de coût (juste le temps).
- Aucun test automatisé ni optimisation avancée (conforme à la consigne de simplicité).

## Limitations / Améliorations possibles (non implémentées volontairement)
- Gestion des différences de temps selon la direction.
- Filtrage par ligne / pénalité de correspondance.
- Recherche multi-critères (temps + nombre de changements).
- Mise en cache des chemins fréquents.

## Utilisation rapide
1. Lancer `python run.py`.
2. Ouvrir le navigateur sur `http://127.0.0.1:5000`.
3. Choisir départ / arrivée.
4. Cliquer sur "Calculer plus court chemin".

## Licence
Usage académique / projet étudiant. Données de démonstration.
