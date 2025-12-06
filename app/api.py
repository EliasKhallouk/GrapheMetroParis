from flask import Flask, jsonify, request, send_from_directory
from .graph import get_graph
import os

app = Flask(__name__, static_folder='../static', static_url_path='')

graph = get_graph()

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/stations')
def stations():
    # Calculer les lignes par nom de station
    name_to_lines = {}
    for st in graph.stations.values():
        name_to_lines.setdefault(st.name, set()).add(str(st.line))
    data = [
        {
            'id': st.id,
            'name': st.name,
            'line': st.line,
            'lines_at_name': sorted(list(name_to_lines.get(st.name, []))),
            'terminus': st.terminus,
            'branch': st.branch,
            'x': st.x,
            'y': st.y
        } for st in graph.stations.values()
    ]
    return jsonify(data)

@app.route('/station/<int:station_id>')
def station_detail(station_id: int):
    st = graph.stations.get(station_id)
    if not st:
        return jsonify({'error': 'not found'}), 404
    # Rassembler les lignes portant le même nom de station
    lines = sorted({str(s.line) for s in graph.stations.values() if s.name == st.name})
    return jsonify({
        'id': st.id,
        'name': st.name,
        'line': st.line,
        'lines_at_name': lines,
        'terminus': st.terminus,
        'branch': st.branch,
        'x': st.x,
        'y': st.y,
        'neighbors': [ {'id': nb, 'time': t} for nb, t in graph.adj.get(station_id, []) ]
    })

@app.route('/graph')
def graph_dump():
    return jsonify(graph.to_dict())

@app.route('/connected')
def connected():
    return jsonify({'connected': graph.is_connected()})

@app.route('/mst')
def mst():
    edges = graph.prim_mst()
    total_weight = sum(w for _, _, w in edges)
    return jsonify({
        'edges': [{'from': u, 'to': v, 'time': w} for u, v, w in edges],
        'count': len(edges),
        'total_weight': total_weight
    })

@app.route('/path')
def path():
    try:
        start = int(request.args.get('start'))
        end = int(request.args.get('end'))
    except (TypeError, ValueError):
        return jsonify({'error': 'start and end required as integer ids'}), 400
    try:
        total, path_ids = graph.shortest_path(start, end)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    # Inclure les informations de ligne pour chaque station du chemin
    stations_path = []
    for i in path_ids:
        s = graph.stations.get(i)
        if not s:
            stations_path.append({'id': i, 'name': None, 'line': None, 'lines_at_name': []})
            continue
    # Rassembler les lignes ayant le même nom
        lines = sorted({str(ss.line) for ss in graph.stations.values() if ss.name == s.name})
        stations_path.append({'id': s.id, 'name': s.name, 'line': s.line, 'lines_at_name': lines})
    # Construire un texte narratif formaté en français
    def _terminus_for_line(line_code: str, avoid_name: str = None) -> str:
    # Choisir un nom de station terminus pour une ligne donnée
        term_names = [st.name for st in graph.stations.values() if str(st.line) == str(line_code) and st.terminus]
    # Préférer un terminus différent de la station à éviter
        for nm in term_names:
            if avoid_name is None or nm != avoid_name:
                return nm
        return term_names[0] if term_names else ''

    narrative_lines = []
    if stations_path:
        start_station = stations_path[0]
        end_station = stations_path[-1]
    # Introduction
        narrative_lines.append(f"Vous êtes à {start_station['name']}.")
    # Étapes : prendre d'abord la ligne, puis indiquer les correspondances lorsqu'on change de ligne
    # Déterminer la direction initiale
        initial_line = start_station.get('line')
        initial_direction = _terminus_for_line(initial_line, avoid_name=start_station['name'])
        if initial_line:
            narrative_lines.append(f"- Prenez la ligne {initial_line} direction {initial_direction}.")
    # Parcourir le chemin pour détecter les changements de ligne
        prev_line = initial_line
        for idx in range(1, len(stations_path)):
            st = stations_path[idx]
            cur_line = st.get('line')
            # Lorsque la ligne change à cette station, indiquer la correspondance et la nouvelle ligne
            if cur_line and prev_line and str(cur_line) != str(prev_line):
                direction = _terminus_for_line(cur_line, avoid_name=st['name'])
                narrative_lines.append(f"- A {st['name']}, changez et prenez la ligne {cur_line} direction {direction}.")
            prev_line = cur_line or prev_line
    # Estimation d'arrivée
        minutes = max(1, round(total / 60))
        narrative_lines.append(f"- Vous devriez arriver à {end_station['name']} dans environ {minutes} minutes")
    narrative = "\n".join(narrative_lines)

    return jsonify({'total_time_seconds': total, 'path': path_ids, 'stations': stations_path, 'narrative': narrative})

# Point de santé simple
@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'stations': len(graph.stations)})

# Servir les ressources depuis le dossier Data (ex: metrof_r.png)
@app.route('/data/<path:filename>')
def data_assets(filename: str):
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Data'))
    return send_from_directory(data_dir, filename)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', '5000'))
    app.run(host='0.0.0.0', port=port, debug=True)
