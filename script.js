// ─────────────────────────────────────────────
// HOW FRONTEND CONNECTS TO BACKEND:
//
// The frontend uses the Fetch API to call the
// Node.js REST endpoint:  GET /api/system
//
// The backend (server.js) runs on localhost:3000,
// handles CORS, reads OS data via Node's `os` module,
// and returns it as JSON.
//
// The frontend then parses the JSON and updates
// the DOM elements with the received data.
// ─────────────────────────────────────────────

const API_URL = 'http://localhost:3000/api/system';

function fmt(bytes) {
  const u = ['B','KB','MB','GB'];
  let i = 0;
  while (bytes >= 1024 && i < u.length - 1) { bytes /= 1024; i++; }
  return `${bytes.toFixed(1)} ${u[i]}`;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = Math.min(100, pct) + '%';
}

function setBarColor(id, pct) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('warn', 'danger');
  if (pct > 85) el.classList.add('danger');
  else if (pct > 60) el.classList.add('warn');
}

async function fetchData() {
  const btn = document.getElementById('refresh-btn');
  btn.disabled = true;
  btn.textContent = '⟳ LOADING';

  try {
    // ← THIS IS THE KEY CONNECTION POINT
    // fetch() sends an HTTP GET request to the Node backend
    const response = await fetch(API_URL);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // Parse the JSON response from the server
    const data = await response.json();

    // Update the UI with received data
    renderDashboard(data);

    document.getElementById('loading').style.display = 'none';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';

    const dot = document.getElementById('status-dot');
    dot.className = 'dot online';
    document.getElementById('status-text').textContent = 'ONLINE';
    document.getElementById('last-update').textContent =
      'UPDATED ' + new Date().toLocaleTimeString().toUpperCase();

  } catch (err) {
    console.error('Failed to fetch system data:', err);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error-state').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';

    const dot = document.getElementById('status-dot');
    dot.className = 'dot error';
    document.getElementById('status-text').textContent = 'OFFLINE';
  }

  btn.disabled = false;
  btn.textContent = '⟳ REFRESH';
}

function renderDashboard(d) {
  // --- Top stats ---
  setText('s-hostname', d.os.hostname);
  setText('s-platform', d.os.type + ' / ' + d.os.platform);
  setText('s-cores', d.cpu.cores);
  setText('s-arch', d.os.arch);
  setText('s-memused', d.memory.usedPercent + '%');
  setText('s-memtotal', 'of ' + d.memory.total);
  setText('s-uptime', d.os.uptime);
  setText('s-nodever', 'Node ' + d.node.version);

  // --- Memory ---
  const memPct = parseFloat(d.memory.usedPercent);
  setText('mem-used-pct', d.memory.usedPercent + '%');
  setWidth('mem-bar', memPct);
  setBarColor('mem-bar', memPct);
  setText('m-total', d.memory.total);
  setText('m-used', d.memory.used);
  setText('m-free', d.memory.free);
  setText('m-freepct', d.memory.freePercent + '%');

  // --- CPU ---
  const cores = d.cpu.cores;
  const l1 = parseFloat(d.cpu.loadAvg['1min']);
  const l5 = parseFloat(d.cpu.loadAvg['5min']);
  const l15 = parseFloat(d.cpu.loadAvg['15min']);
  const toWidth = v => Math.min(100, (v / cores) * 100);
  setWidth('load-1', toWidth(l1));
  setWidth('load-5', toWidth(l5));
  setWidth('load-15', toWidth(l15));
  setText('load-1-val', l1);
  setText('load-5-val', l5);
  setText('load-15-val', l15);
  setText('cpu-model', d.cpu.model.split('@')[0].trim());
  setText('cpu-speed', d.cpu.speed);

  // --- OS ---
  setText('os-type', d.os.type);
  setText('os-platform', d.os.platform);
  setText('os-release', d.os.release);
  setText('os-arch', d.os.arch);
  setText('os-endian', d.os.endianness);
  setText('os-tmp', d.os.tmpdir);

  // --- Network ---
  const netList = document.getElementById('network-list');
  netList.innerHTML = '';
  for (const [name, addrs] of Object.entries(d.network)) {
    const div = document.createElement('div');
    div.className = 'net-interface';
    div.innerHTML = `<div class="net-name">${name}</div>`;
    addrs.forEach(a => {
      const badges = `
        <span class="badge ${a.family === 'IPv4' ? 'v4' : 'v6'}">${a.family}</span>
        ${a.internal ? '<span class="badge internal">internal</span>' : ''}
      `;
      div.innerHTML += `<div class="net-addr"><span>IP</span>${a.address}${badges}</div>`;
      if (a.mac && a.mac !== '00:00:00:00:00:00') {
        div.innerHTML += `<div class="net-addr"><span>MAC</span>${a.mac}</div>`;
      }
    });
    netList.appendChild(div);
  }

  // --- Node process ---
  const mu = d.node.memoryUsage;
  setText('node-ver', d.node.version);
  setText('node-pid', d.node.pid);
  setText('node-heap', fmt(mu.heapUsed));
  setText('node-heaptotal', fmt(mu.heapTotal));
  setText('node-ext', fmt(mu.external));
  setText('node-rss', fmt(mu.rss));

  // --- Timestamp ---
  setText('ts-bar', '⬡ DATA SNAPSHOT: ' + d.timestamp + ' ⬡');
}

// Auto-refresh every 5 seconds
fetchData();
setInterval(fetchData, 5000);
