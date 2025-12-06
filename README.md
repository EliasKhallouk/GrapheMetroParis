# Graphe Métro Paris

Projet simple en Python + Flask + interface web minimale pour explorer le graphe du métro parisien (données 1998-2002) fourni dans `Data/metro.txt` et les positions dans `Data/pospoints.txt`.

## Objectifs
- Charger les stations et les temps de parcours entre elles.
- Visualiser les stations sur un canevas (positions approximatives fournies).
- Obtenir le plus court chemin (en secondes) entre deux stations via Bellman-Ford.
- Fournir des endpoints API simples et un narratif d'itinéraire en français.
- Calculer et afficher l'ACPM (arbre couvrant de poids minimal) et son poids total.

## Arborescence
```
Data/
  metro.txt
  pospoints.txt
app/
  graph.py        # analyse + structure + Bellman-Ford
  api.py          # points de terminaison Flask
static/
  index.html      # interface web
  css/style.css
  js/app.js       # logique front
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

## Lancer l'application
Deux options:

1) Script de lancement (recommandé):
```bash
chmod +x run.sh
./run.sh
```

2) Manuellement:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run.py
```
Par défaut le serveur écoute sur `http://127.0.0.1:5000`.

## Interface Web
Une fois le serveur lancé, ouvrez simplement :
```
http://127.0.0.1:5000/
```
Interface disponible :
- Sélection de station de départ / arrivée (menu déroulant trié par nom).
- Bouton pour calculer le plus court chemin.
- Affichage de la liste des stations sur le chemin, du temps total, et d'un texte narratif (prise de ligne, correspondances, temps estimé).
- Visualisation : canevas avec les stations (points), le tracé du chemin et l'ACPM.
- Affichage du poids total de l'ACPM (notification et dans l'entête de la carte).

## Endpoints API
- `GET /health` : statut rapide.
- `GET /stations` : liste des stations.
- `GET /station/<id>` : détails d'une station (voisins inclus).
- `GET /graph` : export JSON du graphe (stations + arêtes).
- `GET /path?start=<id>&end=<id>` : plus court chemin (temps + séquence + narratif).
- `GET /mst` : arêtes de l'ACPM + poids total (`total_weight`).

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
- Analyse :
  - Les lignes commençant par `V` définissent des stations.
  - Les lignes `E` définissent des arêtes bidirectionnelles avec temps en secondes.
  - Les noms dans `pospoints.txt` utilisent `@` comme séparateur d'espaces, normalisés lors du chargement.
- Algorithmes :
  - Bellman-Ford classique pour minimiser la somme des temps.
  - Prim pour l'ACPM (retour des arêtes et du poids total).
- Les coordonnées ne sont pas disponibles pour toutes les stations ; seules celles trouvées sont tracées.

## Hypothèses / Simplifications
- Le PDF original précise le format ; l'interpréteur actuel suppose que le 4ème bloc après le nom (`True`/`False`) est le drapeau de terminus et le dernier entier le numéro de branche.
- Les correspondances (temps de transfert) sont traitées comme des arrêtes normales.
- Pas de différenciation de lignes dans le calcul de coût (juste le temps).
- Aucun test automatisé ni optimisation avancée (conforme à la consigne de simplicité).

## Limitations / Améliorations possibles (non implémentées volontairement)
- Gestion des différences de temps selon la direction.
- Filtrage par ligne / pénalité de correspondance.
- Recherche multi-critères (temps + nombre de changements).
- Mise en cache des chemins fréquents.

## Utilisation rapide
1. Lancer `./run.sh`.
2. Ouvrir le navigateur sur `http://127.0.0.1:5000`.
3. Choisir départ / arrivée.
4. Cliquer sur "Calculer l'itinéraire" et éventuellement "Arbre couvrant minimal" pour visualiser l'ACPM.

## Licence
Usage académique / projet étudiant. Données de démonstration.
