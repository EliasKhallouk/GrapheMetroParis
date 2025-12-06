import os
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
import heapq

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'Data')
METRO_FILE = os.path.join(DATA_DIR, 'metro.txt')
POS_FILE = os.path.join(DATA_DIR, 'pospoints.txt')

@dataclass
class Station:
    id: int
    name: str
    line: str
    terminus: bool
    branch: int
    x: Optional[int] = None
    y: Optional[int] = None

class MetroGraph:
    def __init__(self):
        self.stations: Dict[int, Station] = {}
        self.adj: Dict[int, List[Tuple[int, int]]] = {}

    def load(self, metro_path: str = METRO_FILE, pos_path: str = POS_FILE) -> None:
        self._parse_metro(metro_path)
        self._parse_positions(pos_path)

    def _parse_metro(self, path: str) -> None:
        with open(path, 'r', encoding='utf-8') as f:
            for raw_line in f:
                line = raw_line.strip()
                if not line or line.startswith('#') or line.startswith('-'):
                    continue
                if line.startswith('V'):
                    # Les lignes de données attendues commencent par : V <id à 4 chiffres> <nom> ;<ligne> ;<True|False> <branche int>
                    # Certaines lignes descriptives commencent aussi par V mais le second jeton n'est pas numérique.
                    try:
                        after_v = line[1:].strip()  # retirer le 'V' initial
                        first_space = after_v.find(' ')
                        if first_space == -1:
                            continue
                        id_token = after_v[:first_space]
                        if not id_token.isdigit():  # ignorer les en-têtes/descriptions
                            continue
                        num = int(id_token)
                        rest = after_v[first_space+1:]
                        # Diviser par ';' pour isoler nom / ligne / indicateur de terminus
                        segs = [s.strip() for s in rest.split(';')]
                        if len(segs) < 3:
                            continue
                        name = segs[0].replace('@', ' ')
                        line_code = segs[1]
                        terminus_flag = segs[2].lower().startswith('true')
                        # La branche (entier) peut apparaître après l'indicateur de terminus ou comme dernier jeton de la ligne
                        branch = 0
                        # Essayer d'extraire un entier en fin de ligne
                        tail_tokens = segs[-1].split()
                        for tok in reversed(tail_tokens):
                            if tok.isdigit():
                                branch = int(tok)
                                break
                        st = Station(id=num, name=name, line=line_code, terminus=terminus_flag, branch=branch)
                        self.stations[num] = st
                        self.adj.setdefault(num, [])
                    except Exception:
                        continue
                elif line.startswith('E'):
                    # Format : E a b temps
                    try:
                        _, a_str, b_str, t_str = line.split()
                        a = int(a_str)
                        b = int(b_str)
                        t = int(float(t_str))
                        self.adj.setdefault(a, []).append((b, t))
                        self.adj.setdefault(b, []).append((a, t))
                    except Exception:
                        continue

    def _parse_positions(self, path: str) -> None:
        if not os.path.exists(path):
            return
        name_to_coords: Dict[str, Tuple[int, int]] = {}
        with open(path, 'r', encoding='utf-8') as f:
            for raw_line in f:
                raw_line = raw_line.strip()
                if not raw_line:
                    continue
                try:
                    x_str, y_str, name_raw = raw_line.split(';')
                    x = int(float(x_str))
                    y = int(float(y_str))
                    name = name_raw.replace('@', ' ')
                    name_to_coords.setdefault(name, (x, y))
                except ValueError:
                    continue
    # Assigner les coordonnées en faisant correspondre le nom de station
        for st in self.stations.values():
            if st.name in name_to_coords:
                st.x, st.y = name_to_coords[st.name]

    def shortest_path(self, start: int, end: int) -> Tuple[int, List[int]]:
        """Bellman-Ford retournant (temps total, liste des id des stations du chemin)."""
        if start not in self.stations or end not in self.stations:
            raise ValueError('Invalid station id')
    # Initialiser les distances
        INF = 10**18
        dist: Dict[int, int] = {node: INF for node in self.stations.keys()}
        prev: Dict[int, int] = {}
        dist[start] = 0
    # Collecter les arêtes (non orienté => itérer les paires uniques)
        edges: List[Tuple[int, int, int]] = []
        seen_pairs = set()
        for u, lst in self.adj.items():
            for v, w in lst:
                key = (min(u, v), max(u, v))
                if key in seen_pairs:
                    continue
                seen_pairs.add(key)
                # Pour Bellman-Ford sur un graphe non orienté, relâcher dans les deux sens
                edges.append((u, v, w))
                edges.append((v, u, w))
    # Relâcher |V|-1 fois
        n = len(self.stations)
        for _ in range(n - 1):
            updated = False
            for u, v, w in edges:
                if dist[u] != INF and dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w
                    prev[v] = u
                    updated = True
            if not updated:
                break
        if dist[end] == INF:
            raise ValueError('No path found')
    # Reconstruire le chemin
        path: List[int] = []
        cur = end
        while cur != start:
            path.append(cur)
            cur = prev.get(cur)
            if cur is None:
                raise ValueError('No path found')
        path.append(start)
        path.reverse()
        return dist[end], path

    def to_dict(self) -> Dict:
        return {
            'stations': [
                {
                    'id': st.id,
                    'name': st.name,
                    'line': st.line,
                    'terminus': st.terminus,
                    'branch': st.branch,
                    'x': st.x,
                    'y': st.y
                } for st in self.stations.values()
            ],
            'edges': [
                {'from': a, 'to': b, 'time': t}
                for a, lst in self.adj.items() for b, t in lst if a < b  # éviter les doublons
            ]
        }

    def is_connected(self) -> bool:
        if not self.stations:
            return True
    # Parcours en largeur/profondeur depuis n'importe quel nœud
        start = next(iter(self.stations.keys()))
        seen = set([start])
        stack = [start]
        while stack:
            u = stack.pop()
            for v, _ in self.adj.get(u, []):
                if v not in seen:
                    seen.add(v)
                    stack.append(v)
        return len(seen) == len(self.stations)

    def prim_mst(self) -> List[Tuple[int, int, int]]:
        """Retourner les arêtes de l'ACM sous forme de (u, v, poids) avec l'algorithme de Prim.
        Suppose que le graphe est connexe ; sinon, construit un ACM par composant et retourne l'union (une forêt).
        """
        remaining = set(self.stations.keys())
        mst_edges: List[Tuple[int, int, int]] = []
        while remaining:
            # Démarrer un nouveau composant
            start = next(iter(remaining))
            remaining.remove(start)
            in_tree = {start}
            # Tas min d'arêtes traversant la coupe : (w, u, v)
            heap: List[Tuple[int, int, int]] = []
            for v, w in self.adj.get(start, []):
                heapq.heappush(heap, (w, start, v))
            while heap and (in_tree | remaining):
                w, u, v = heapq.heappop(heap)
                if v in in_tree:
                    continue
                mst_edges.append((u, v, w))
                if v in remaining:
                    remaining.remove(v)
                in_tree.add(v)
                for nv, nw in self.adj.get(v, []):
                    if nv not in in_tree:
                        heapq.heappush(heap, (nw, v, nv))
        return mst_edges

# Singleton loader
_graph_instance: Optional[MetroGraph] = None

def get_graph() -> MetroGraph:
    global _graph_instance
    if _graph_instance is None:
        mg = MetroGraph()
        mg.load()
        _graph_instance = mg
    return _graph_instance
