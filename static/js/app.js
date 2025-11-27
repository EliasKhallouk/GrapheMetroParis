async function loadStations() {
  const res = await fetch('/stations');
  const data = await res.json();
  window.__stations = data;
  const startSel = document.getElementById('start');
  const endSel = document.getElementById('end');
  data.forEach(st => {
    const opt1 = document.createElement('option');
    opt1.value = st.id; opt1.textContent = `${st.id} - ${st.name} (L${st.line})`;
    startSel.appendChild(opt1);
    const opt2 = document.createElement('option');
    opt2.value = st.id; opt2.textContent = `${st.id} - ${st.name} (L${st.line})`;
    endSel.appendChild(opt2);
  });
  drawMap();
  // connexité
  try {
    const c = await (await fetch('/connected')).json();
    const el = document.getElementById('connexite');
    el.textContent = c.connected ? 'Connexe: Oui' : 'Connexe: Non';
  } catch {}
}

async function computePath() {
  const start = document.getElementById('start').value;
  const end = document.getElementById('end').value;
  if (!start || !end) return;
  const res = await fetch(`/path?start=${start}&end=${end}`);
  const data = await res.json();
  const result = document.getElementById('result');
  if (data.error) {
    result.textContent = 'Erreur: ' + data.error;
    return;
  }
  result.innerHTML = `<h3>Chemin (${data.total_time_seconds}s)</h3><ol>` +
    data.stations.map(n => `<li>${n}</li>`).join('') + '</ol>';
  highlightPath(data.path);
}

function drawMap() {
  const canvas = document.getElementById('map');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#000';
  const stations = window.__stations || [];
  stations.forEach(st => {
    if (st.x != null && st.y != null) {
      ctx.beginPath();
      ctx.arc(st.x, st.y, 4, 0, Math.PI*2);
      ctx.fill();
    }
  });
}

function highlightPath(pathIds) {
  drawMap();
  const canvas = document.getElementById('map');
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 3;
  ctx.beginPath();
  let started = false;
  pathIds.forEach(id => {
    const st = window.__stations.find(s => s.id === id);
    if (!st || st.x == null) return;
    if (!started) { ctx.moveTo(st.x, st.y); started = true; }
    else { ctx.lineTo(st.x, st.y); }
  });
  ctx.stroke();
  // draw nodes again on top
  pathIds.forEach(id => {
    const st = window.__stations.find(s => s.id === id);
    if (!st || st.x == null) return;
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.arc(st.x, st.y, 5, 0, Math.PI*2);
    ctx.fill();
  });
}

async function drawMST() {
  const canvas = document.getElementById('map');
  const ctx = canvas.getContext('2d');
  // base map
  drawMap();
  try {
    const data = await (await fetch('/mst')).json();
    ctx.strokeStyle = '#2a9d8f';
    ctx.lineWidth = 2;
    data.edges.forEach(edge => {
      const a = window.__stations.find(s => s.id === edge.from);
      const b = window.__stations.find(s => s.id === edge.to);
      if (!a || !b || a.x == null || b.x == null) return;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
  } catch (e) {
    console.error('MST error', e);
  }
}

document.getElementById('draw-mst').addEventListener('click', drawMST);

document.getElementById('compute').addEventListener('click', computePath);
loadStations();
