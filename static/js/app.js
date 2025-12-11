// Animation et chargement
function showLoadingScreen() {
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    loadingScreen.style.display = 'flex';
  }
}

function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    setTimeout(() => {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }, 1000);
  }
}

// Gestion des notifications
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.classList.add('show'), 100);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

async function loadStations() {
  showLoadingScreen();
  
  try {
    const res = await fetch('/stations');
    if (!res.ok) throw new Error('Erreur de chargement des stations');
    
    const data = await res.json();
    window.__stations = data;
    
    const startSel = document.getElementById('start');
    const endSel = document.getElementById('end');
    
    // Vider les sélecteurs
    startSel.innerHTML = '<option value="">Choisissez votre station de départ...</option>';
    endSel.innerHTML = '<option value="">Choisissez votre station d\'arrivée...</option>';
    
    // Trier les stations par nom
    const sortedStations = data.sort((a, b) => a.name.localeCompare(b.name));
    
    sortedStations.forEach(st => {
      const lineInfo = (st.lines_at_name && st.lines_at_name.length > 0) 
        ? `${st.lines_at_name.join(', ')}` 
        : `${st.line}`;
      
      const opt1 = document.createElement('option');
      opt1.value = st.id;
      opt1.textContent = `${st.name} (ligne ${lineInfo})`;
      startSel.appendChild(opt1);
      
      const opt2 = document.createElement('option');
      opt2.value = st.id;
      opt2.textContent = `${st.name} (ligne ${lineInfo})`;
      endSel.appendChild(opt2);
    });
    
    await syncCanvasToImage();
    drawMap();
    
    // Connexité avec animation
    try {
      const c = await fetch('/connected').then(res => res.json());
      const el = document.getElementById('connexite');
      el.innerHTML = `
        <i class="fas ${c.connected ? 'fa-check-circle' : 'fa-times-circle'}"></i>
        Réseau ${c.connected ? 'connexe' : 'non connexe'}
      `;
      el.className = `connexity-status ${c.connected ? 'connected' : 'disconnected'}`;
    } catch (error) {
      console.warn('Erreur lors de la vérification de connexité:', error);
    }
    
    showNotification('Stations chargées avec succès !', 'success');
  } catch (error) {
    console.error('Erreur lors du chargement:', error);
    showNotification('Erreur lors du chargement des stations', 'error');
  } finally {
    hideLoadingScreen();
  }
}

async function computePath() {
  // Sync selections from internal selected IDs if present
  const start = (window.__selectedStartId && !document.getElementById('start').value) ? window.__selectedStartId : document.getElementById('start').value;
  const end = (window.__selectedEndId && !document.getElementById('end').value) ? window.__selectedEndId : document.getElementById('end').value;
  const computeBtn = document.getElementById('compute');
  
  if (!start || !end) {
    showNotification('Veuillez sélectionner une station de départ et d\'arrivée', 'error');
    return;
  }
  
  if (start === end) {
    showNotification('Les stations de départ et d\'arrivée doivent être différentes', 'error');
    return;
  }
  
  // Animation de chargement
  computeBtn.classList.add('loading');
  computeBtn.disabled = true;
  
  try {
    const res = await fetch(`/path?start=${start}&end=${end}`);
    const data = await res.json();
    
    if (data.error) {
      showNotification('Erreur: ' + data.error, 'error');
      return;
    }
    
    displayResult(data);
    highlightPath(data.path);
    showNotification('Itinéraire calculé avec succès !', 'success');
    
  } catch (error) {
    console.error('Erreur lors du calcul:', error);
    showNotification('Erreur lors du calcul de l\'itinéraire', 'error');
  } finally {
    computeBtn.classList.remove('loading');
    computeBtn.disabled = false;
  }
}

function displayResult(data) {
  const resultSection = document.getElementById('result');
  const resultContent = document.getElementById('resultContent');
  
  const fmt = formatDuration(data.total_time_seconds);
  const distance = data.stations.length - 1; // Nombre de segments
  
  // Narrative text (if provided by backend)
  const narrative = data.narrative ? `<div class="narrative"><pre>${escapeHtml(data.narrative)}</pre></div>` : '';

  resultContent.innerHTML = `
    <div class="journey-summary">
      <div class="summary-item">
        <span class="value">${fmt}</span>
        <span class="label">Durée totale</span>
      </div>
      <div class="summary-item">
        <span class="value">${distance}</span>
        <span class="label">Stations</span>
      </div>
      <div class="summary-item">
        <span class="value">${data.stations.length}</span>
        <span class="label">Arrêts</span>
      </div>
    </div>
    
    ${narrative}
    
    <h4><i class="fas fa-list-ol"></i> Itinéraire détaillé</h4>
    <ol class="stations-list">
      ${data.stations.map((station, index) => `
        <li>
          <div class="station-number">${index + 1}</div>
          <div class="station-info">
            <div class="station-name">${station.name}</div>
            <div class="station-lines">Ligne${station.lines_at_name.length > 1 ? 's' : ''}: ${station.lines_at_name.join(', ')}</div>
          </div>
        </li>
      `).join('')}
    </ol>
  `;
  
  resultSection.style.display = 'block';
  setTimeout(() => resultSection.scrollIntoView({ behavior: 'smooth' }), 100);
}

// Simple HTML escape for narrative pre block
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function hideResult() {
  const resultSection = document.getElementById('result');
  resultSection.style.display = 'none';
  drawMap(); // Réinitialiser la carte
}

function formatDuration(seconds) {
  if (typeof seconds !== 'number') seconds = Number(seconds) || 0;
  const pad = (n) => String(n).padStart(2, '0');
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function drawMap() {
  const canvas = document.getElementById('map');
  const ctx = canvas.getContext('2d');
  
  // Effacer le canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const stations = window.__stations || [];
  const { scaleX, scaleY } = getImageScale();
  
  // Dessiner les stations avec un style amélioré
  stations.forEach(st => {
    if (st.x != null && st.y != null) {
      const dx = st.x * scaleX;
      const dy = st.y * scaleY;
      
      // Ombre portée
      ctx.beginPath();
      ctx.arc(dx + 1, dy + 1, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fill();
      
      // Station principale
      ctx.beginPath();
      ctx.arc(dx, dy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#2d3748';
      ctx.fill();
      
      // Bordure blanche
      ctx.beginPath();
      ctx.arc(dx, dy, 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Point central coloré
      ctx.beginPath();
      ctx.arc(dx, dy, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#667eea';
      ctx.fill();
    }
  });

  // Après avoir dessiné les stations de base, dessiner les marqueurs de sélection si présent
  drawMarkers();
}

// Dessine les marqueurs de départ/arrivée sélectionnés (après drawMap)
function drawMarkers() {
  const canvas = document.getElementById('map');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const { scaleX, scaleY } = getImageScale();

  const startId = window.__selectedStartId || null;
  const endId = window.__selectedEndId || null;

  [startId, endId].forEach(id => {
    if (!id) return;
    const st = window.__stations.find(s => s.id === Number(id));
    if (!st || st.x == null) return;
    const dx = st.x * scaleX;
    const dy = st.y * scaleY;
    ctx.beginPath();
    if (id === startId && id === endId) {
      // same station: draw a special marker
      ctx.arc(dx, dy, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#f6ad55';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (id === startId) {
      ctx.arc(dx, dy, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#48bb78'; // green
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (id === endId) {
      ctx.arc(dx, dy, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#f56565'; // red
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  });
}

// Trouve la station la plus proche d'un clic (en coordonnées d'affichage)
function findNearestStation(clickX, clickY, maxDistance) {
  const stations = window.__stations || [];
  const { scaleX, scaleY } = getImageScale();
  // Rayon par défaut: augmenter pour faciliter le clic
  if (typeof maxDistance !== 'number' || !isFinite(maxDistance)) {
    // Adapter légèrement au zoom: base 20px, ajustée par le ratio moyen de l'image
    const avgScale = (scaleX + scaleY) / 2 || 1;
    maxDistance = Math.max(16, Math.round(20 * avgScale));
  }
  let best = null;
  let bestDist = Infinity;
  stations.forEach(st => {
    if (st.x == null || st.y == null) return;
    const dx = st.x * scaleX;
    const dy = st.y * scaleY;
    const d = Math.hypot(dx - clickX, dy - clickY);
    if (d < bestDist) {
      bestDist = d;
      best = st;
    }
  });
  if (bestDist <= maxDistance) return best;
  return null;
}

// Définit la station sélectionnée et synchronise les selects
function setSelectedStation(id, type) {
  // type: 'start' or 'end'
  if (!id) return;
  const select = document.getElementById(type === 'start' ? 'start' : 'end');
  if (select) select.value = id;
  if (type === 'start') window.__selectedStartId = Number(id);
  else window.__selectedEndId = Number(id);
  drawMap();
  const name = (window.__stations || []).find(s => s.id === Number(id))?.name || id;
  showNotification(`${type === 'start' ? 'Départ' : 'Arrivée'} défini(e): ${name}`, 'info');
  // Si les deux sont définis, lancer le calcul automatiquement
  if (window.__selectedStartId && window.__selectedEndId) {
    // synchroniser selects sont déjà mis à jour
    // attendre un petit temps pour laisser l'UI se stabiliser
    setTimeout(() => computePath(), 200);
  }
}

// Gestion du clic sur la carte pour sélectionner station
function onMapClick(e) {
  const canvas = document.getElementById('map');
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  const station = findNearestStation(clickX, clickY, 24);
  if (!station) {
    showNotification('Aucune station proche du clic', 'error');
    return;
  }
  // Si aucun départ, définir départ ; sinon si départ défini mais pas arrivée, définir arrivée ; sinon remplacer départ
  if (!window.__selectedStartId) {
    setSelectedStation(station.id, 'start');
  } else if (!window.__selectedEndId) {
    // éviter de choisir la même station pour arrivée
    if (Number(window.__selectedStartId) === Number(station.id)) {
      showNotification('La station sélectionnée est déjà le départ', 'error');
      return;
    }
    setSelectedStation(station.id, 'end');
  } else {
    // les deux sont définis : réinitialiser le départ au clic et effacer arrivée
    window.__selectedEndId = null;
    setSelectedStation(station.id, 'start');
    const endSelect = document.getElementById('end'); if (endSelect) endSelect.value = '';
  }
}

function highlightPath(pathIds) {
  drawMap();
  
  if (!pathIds || pathIds.length === 0) return;
  
  const canvas = document.getElementById('map');
  const ctx = canvas.getContext('2d');
  const { scaleX, scaleY } = getImageScale();
  
  // Animation du tracé du chemin
  let currentIndex = 0;
  
  function drawPathSegment() {
    if (currentIndex >= pathIds.length - 1) {
      drawPathStations(pathIds);
      return;
    }
    
    const currentId = pathIds[currentIndex];
    const nextId = pathIds[currentIndex + 1];
    
    const currentSt = window.__stations.find(s => s.id === currentId);
    const nextSt = window.__stations.find(s => s.id === nextId);
    
    if (!currentSt || !nextSt || currentSt.x == null || nextSt.x == null) {
      currentIndex++;
      requestAnimationFrame(drawPathSegment);
      return;
    }
    
    const dx1 = currentSt.x * scaleX;
    const dy1 = currentSt.y * scaleY;
    const dx2 = nextSt.x * scaleX;
    const dy2 = nextSt.y * scaleY;
    
    // Tracé avec gradient
    const gradient = ctx.createLinearGradient(dx1, dy1, dx2, dy2);
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(1, '#0048ff');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Ombre portée du chemin
    ctx.beginPath();
    ctx.moveTo(dx1 + 2, dy1 + 2);
    ctx.lineTo(dx2 + 2, dy2 + 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 6;
    ctx.stroke();
    
    // Chemin principal
    ctx.beginPath();
    ctx.moveTo(dx1, dy1);
    ctx.lineTo(dx2, dy2);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.stroke();
    
    currentIndex++;
    setTimeout(() => requestAnimationFrame(drawPathSegment), 100);
  }
  
  function drawPathStations(pathIds) {
    pathIds.forEach((id, index) => {
      const st = window.__stations.find(s => s.id === id);
      if (!st || st.x == null) return;
      
      const dx = st.x * scaleX;
      const dy = st.y * scaleY;
      
      // Station de départ (verte)
      if (index === 0) {
        ctx.beginPath();
        ctx.arc(dx, dy, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#48bb78';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Icône de départ
        ctx.fillStyle = '#fff';
        ctx.font = '12px FontAwesome';
        ctx.textAlign = 'center';
        ctx.fillText('▶', dx, dy + 4);
      }
      // Station d'arrivée (rouge)
      else if (index === pathIds.length - 1) {
        ctx.beginPath();
        ctx.arc(dx, dy, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#f56565';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Icône d'arrivée
        ctx.fillStyle = '#fff';
        ctx.font = '12px FontAwesome';
        ctx.textAlign = 'center';
        ctx.fillText('🏁', dx, dy + 4);
      }
      // Stations intermédiaires (bleues)
      else {
        ctx.beginPath();
        ctx.arc(dx, dy, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#667eea';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }
  
  // Démarrer l'animation
  drawPathSegment();
}

async function drawMST() {
  const canvas = document.getElementById('map');
  const ctx = canvas.getContext('2d');
  const mstBtn = document.getElementById('draw-mst');
  
  // Animation de chargement
  mstBtn.classList.add('loading');
  mstBtn.disabled = true;
  
  try {
    drawMap();
    
    const res = await fetch('/mst');
    if (!res.ok) throw new Error('Erreur lors du calcul de l\'arbre couvrant');
    
  const data = await res.json();
    const { scaleX, scaleY } = getImageScale();
    
    // Afficher le poids total de l'ACPM
    if (typeof data.total_weight === 'number') {
      showNotification(`Poids total de l'ACPM: ${data.total_weight}`, 'info');
      const header = document.querySelector('.map-card .card-header h2');
      if (header) {
        const existing = header.querySelector('.mst-weight');
        const span = existing || document.createElement('span');
        span.className = 'mst-weight';
        span.style.marginLeft = '0.75rem';
        span.style.fontSize = '0.9rem';
        span.style.color = '#4a5568';
        span.textContent = `(Poids ACM: ${data.total_weight})`;
        if (!existing) header.appendChild(span);
      }
    }

    // Animation progressive du MST
    let edgeIndex = 0;
    
    function drawMSTEdge() {
      if (edgeIndex >= data.edges.length) {
        showNotification('Arbre couvrant minimal généré !', 'success');
        return;
      }
      
      const edge = data.edges[edgeIndex];
      const a = window.__stations.find(s => s.id === edge.from);
      const b = window.__stations.find(s => s.id === edge.to);
      
      if (!a || !b || a.x == null || b.x == null) {
        edgeIndex++;
        requestAnimationFrame(drawMSTEdge);
        return;
      }
      
      const dx1 = a.x * scaleX;
      const dy1 = a.y * scaleY;
      const dx2 = b.x * scaleX;
      const dy2 = b.y * scaleY;
      
      // Gradient pour l'arbre couvrant
      const gradient = ctx.createLinearGradient(dx1, dy1, dx2, dy2);
      gradient.addColorStop(0, '#48bb78');
      gradient.addColorStop(1, '#38a169');
      
      // Ombre portée
      ctx.beginPath();
      ctx.moveTo(dx1 + 1, dy1 + 1);
      ctx.lineTo(dx2 + 1, dy2 + 1);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Ligne principale
      ctx.beginPath();
      ctx.moveTo(dx1, dy1);
      ctx.lineTo(dx2, dy2);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      edgeIndex++;
      setTimeout(() => requestAnimationFrame(drawMSTEdge), 50);
    }
    
    drawMSTEdge();
    
  } catch (error) {
    console.error('Erreur MST:', error);
    showNotification('Erreur lors du calcul de l\'arbre couvrant', 'error');
  } finally {
    mstBtn.classList.remove('loading');
    mstBtn.disabled = false;
  }
}

function getImageScale() {
  const img = document.getElementById('metro-bg');
  if (!img || !img.naturalWidth) return {scaleX: 1, scaleY: 1};
  const clientW = img.clientWidth;
  const clientH = img.clientHeight;
  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  const scaleX = clientW / naturalW;
  const scaleY = clientH / naturalH;
  return {scaleX, scaleY};
}

async function syncCanvasToImage() {
  const img = document.getElementById('metro-bg');
  const canvas = document.getElementById('map');
  if (!img || !canvas) return;
  // wait for image to load if needed
  if (!img.complete) {
    await new Promise((res) => { img.onload = res; img.onerror = res; });
  }
  const clientW = img.clientWidth;
  const clientH = img.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  // set CSS size
  canvas.style.width = clientW + 'px';
  canvas.style.height = clientH + 'px';
  // set internal resolution for sharpness
  canvas.width = Math.max(1, Math.floor(clientW * dpr));
  canvas.height = Math.max(1, Math.floor(clientH * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// Fonction d'inversion des stations
function swapStations() {
  const startSelect = document.getElementById('start');
  const endSelect = document.getElementById('end');
  const swapBtn = document.getElementById('swapStations');
  
  // Animation du bouton
  swapBtn.style.transform = 'scale(0.9) rotate(180deg)';
  setTimeout(() => {
    swapBtn.style.transform = 'scale(1) rotate(0deg)';
  }, 150);
  
  // Échanger les valeurs
  const startValue = startSelect.value;
  const endValue = endSelect.value;
  
  startSelect.value = endValue;
  endSelect.value = startValue;
  
  // Animation des sélecteurs
  startSelect.style.transform = 'translateX(10px)';
  endSelect.style.transform = 'translateX(-10px)';
  
  setTimeout(() => {
    startSelect.style.transform = '';
    endSelect.style.transform = '';
  }, 200);
  
  // Notification si les deux champs étaient remplis
  if (startValue && endValue) {
    showNotification('Stations inversées !', 'success');
  }
  // Mettre à jour les sélections internes
  window.__selectedStartId = Number(document.getElementById('start').value) || null;
  window.__selectedEndId = Number(document.getElementById('end').value) || null;
  drawMap();
}

// Fonction de plein écran
function toggleFullscreen() {
  const mapCard = document.querySelector('.map-card');
  const fullscreenBtn = document.getElementById('fullscreen');
  const fullscreenIcon = fullscreenBtn.querySelector('i');
  
  if (!document.fullscreenElement) {
    // Entrer en plein écran
    mapCard.requestFullscreen().then(() => {
      mapCard.classList.add('fullscreen-active');
      fullscreenIcon.className = 'fas fa-compress';
      fullscreenBtn.title = 'Quitter le plein écran';
      showNotification('Mode plein écran activé', 'success');
    }).catch(err => {
      console.error('Erreur plein écran:', err);
      showNotification('Impossible d\'activer le plein écran', 'error');
    });
  } else {
    // Sortir du plein écran
    document.exitFullscreen().then(() => {
      mapCard.classList.remove('fullscreen-active');
      fullscreenIcon.className = 'fas fa-expand';
      fullscreenBtn.title = 'Plein écran';
      showNotification('Plein écran désactivé', 'success');
    }).catch(err => {
      console.error('Erreur sortie plein écran:', err);
    });
  }
}

// Fonction de réinitialisation de la vue
function resetMapView() {
  drawMap();
  hideResult();
  showNotification('Vue de la carte réinitialisée', 'success');
}

// Event listeners
document.getElementById('draw-mst').addEventListener('click', drawMST);
document.getElementById('compute').addEventListener('click', computePath);
document.getElementById('swapStations').addEventListener('click', swapStations);
document.getElementById('fullscreen').addEventListener('click', toggleFullscreen);
document.getElementById('resetView').addEventListener('click', resetMapView);
// Clic sur la carte pour sélectionner les stations
const canvasEl = document.getElementById('map');
if (canvasEl) {
  canvasEl.addEventListener('click', onMapClick);
}
// small debounce helper
function debounce(fn, wait){
  let t = null;
  return (...args) => { clearTimeout(t); t = setTimeout(()=> fn(...args), wait); };
}

// ensure canvas syncs when the window resizes
window.addEventListener('resize', debounce(async () => {
  await syncCanvasToImage();
  drawMap();
}, 120));

// ensure canvas syncs when the background image finishes (or reloads)
const metroImg = document.getElementById('metro-bg');
if (metroImg) {
  metroImg.addEventListener('load', async () => { await syncCanvasToImage(); drawMap(); });
}

// Gestionnaire pour les changements de plein écran
document.addEventListener('fullscreenchange', () => {
  const mapCard = document.querySelector('.map-card');
  const fullscreenBtn = document.getElementById('fullscreen');
  const fullscreenIcon = fullscreenBtn.querySelector('i');
  
  if (!document.fullscreenElement) {
    mapCard.classList.remove('fullscreen-active');
    fullscreenIcon.className = 'fas fa-expand';
    fullscreenBtn.title = 'Plein écran';
    
    // Redimensionner le canvas après la sortie du plein écran
    setTimeout(async () => {
      await syncCanvasToImage();
      drawMap();
    }, 100);
  }
});

// Raccourcis clavier
document.addEventListener('keydown', (e) => {
  // Échap pour quitter le plein écran
  if (e.key === 'Escape' && document.fullscreenElement) {
    document.exitFullscreen();
  }
  
  // Ctrl+Shift+S pour inverser les stations
  if (e.ctrlKey && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    swapStations();
  }
  
  // Ctrl+Enter pour calculer l'itinéraire
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    computePath();
  }
  
  // F11 pour le plein écran (si supporté)
  if (e.key === 'F11') {
    e.preventDefault();
    toggleFullscreen();
  }
});

// Améliorer l'accessibilité avec les touches
document.getElementById('start').addEventListener('keydown', (e) => {
  if (e.key === 'Tab' && e.shiftKey === false) {
    // Permettre la navigation naturelle
  }
});

document.getElementById('end').addEventListener('keydown', (e) => {
  if (e.key === 'Tab' && e.shiftKey === false) {
    // Focus sur le bouton de calcul après avoir sélectionné la station d'arrivée
    e.preventDefault();
    document.getElementById('compute').focus();
  }
});

// Initialisation
loadStations();
