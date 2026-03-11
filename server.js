const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 8080;

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// public/ — HTML, JS, Three.js loaders
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    res.setHeader('Cache-Control', filePath.endsWith('.html') ? 'no-store' : 'max-age=3600');
  }
}));

// Ship discovery: scan ship1, ship2... until folder missing
function discoverShips() {
  const ships = [];
  let n = 1;
  while (true) {
    const dir = path.join(__dirname, `ship${n}`);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) break;
    if (!fs.existsSync(path.join(dir, 'ship.json'))) break;
    ships.push({ id: `ship${n}`, dir });
    n++;
  }
  return ships;
}

// API: return all ship metadata
app.get('/api/ships', (req, res) => {
  const payload = discoverShips().map(s => {
    try {
      return { ...JSON.parse(fs.readFileSync(path.join(s.dir, 'ship.json'), 'utf8')), _folder: s.id };
    } catch {
      return { id: s.id, _folder: s.id, error: 'invalid ship.json' };
    }
  });
  res.json(payload);
});

// Ship assets: /ship1/model.obj, /ship2/texture.jpg, etc.
// Register routes dynamically at startup
discoverShips().forEach(({ id, dir }) => {
  app.use(`/${id}`, express.static(dir, {
    setHeaders(res, filePath) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.obj' || ext === '.mtl') res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'max-age=3600');
    }
  }));
});

app.listen(PORT, () => {
  console.log(`\nOceanVast running on http://localhost:${PORT}`);
  discoverShips().forEach(s => {
    try {
      const m = JSON.parse(fs.readFileSync(path.join(s.dir, 'ship.json'), 'utf8'));
      console.log(`  ${s.id}  ${m.name}`);
    } catch { console.log(`  ${s.id}  (erro)`); }
  });
});
