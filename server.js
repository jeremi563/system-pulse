//this website is build by dev Jeremia Obed
//it belongs to the owner to the owner alone and no one  is allowed to temper with the code writtien ine this site



const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');

// ✅ FIX: Use Render's dynamic PORT environment variable, fallback to 3000 locally
const PORT = process.env.PORT || 3000;

// Helper: format bytes to readable
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

// Helper: format uptime
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

// Gather all system info
function getSystemInfo() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const networkInterfaces = os.networkInterfaces();

  // CPU usage estimate (load average)
  const loadAvg = os.loadavg();

  // Network interfaces (filter nulls)
  const networks = {};
  for (const [name, addrs] of Object.entries(networkInterfaces)) {
    networks[name] = addrs.map(a => ({
      address: a.address,
      family: a.family,
      internal: a.internal,
      mac: a.mac
    }));
  }

  return {
    timestamp: new Date().toISOString(),
    os: {
      platform: os.platform(),
      type: os.type(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: formatUptime(os.uptime()),
      uptimeSeconds: os.uptime(),
      homedir: os.homedir(),
      tmpdir: os.tmpdir(),
      endianness: os.endianness()
    },
    cpu: {
      model: cpus[0]?.model || 'Unknown',
      speed: cpus[0]?.speed ? `${cpus[0].speed} MHz` : 'Unknown',
      cores: cpus.length,
      loadAvg: {
        '1min': loadAvg[0].toFixed(2),
        '5min': loadAvg[1].toFixed(2),
        '15min': loadAvg[2].toFixed(2)
      },
      details: cpus.map((cpu, i) => ({
        core: i,
        model: cpu.model,
        speed: `${cpu.speed} MHz`,
        times: cpu.times
      }))
    },
    memory: {
      total: formatBytes(totalMem),
      used: formatBytes(usedMem),
      free: formatBytes(freeMem),
      usedPercent: ((usedMem / totalMem) * 100).toFixed(1),
      freePercent: ((freeMem / totalMem) * 100).toFixed(1),
      totalBytes: totalMem,
      usedBytes: usedMem,
      freeBytes: freeMem
    },
    network: networks,
    user: os.userInfo ? (() => {
      try { return os.userInfo(); } catch(e) { return { username: 'N/A' }; }
    })() : { username: 'N/A' },
    node: {
      version: process.version,
      pid: process.pid,
      execPath: process.execPath,
      memoryUsage: process.memoryUsage()
    }
  };
}

// MIME type map for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
};

// Route handler
function handleRequest(req, res) {
  // CORS headers so frontend can fetch
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // API endpoint
  if (url === '/api/system') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getSystemInfo(), null, 2));
    return;
  }

  // Serve index.html at root
  if (url === '/' || url === '/index.html') {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('index.html not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // Serve static files: styles.css and script.js
  const ext = path.extname(url);
  if (ext === '.css' || ext === '.js') {
    const filePath = path.join(__dirname, url);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `File not found: ${url}` }));
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] });
      res.end(data);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`\n🚀 System Monitor running at: http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/system`);
  console.log(`\nPress Ctrl+C to stop.\n`);
});
