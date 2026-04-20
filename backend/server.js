import express, { json } from 'express';
import cors from 'cors';
import pool from './db.js';
import https from 'https';

const app = express();
app.use(cors());
app.use(json());

// Obtener todos los lugares
app.get('/lugares', async (req, res) => {
  const result = await pool.query(`
    SELECT id, nombre, tipo,
    ST_Y(ubicacion) as lat,
    ST_X(ubicacion) as lng
    FROM lugares;
  `);
  res.json(result.rows);
});

// Añadir lugares al mapa
app.post('/lugares', async (req, res) => {
  const { nombre, tipo, lat, lng } = req.body;

  const result = await pool.query(`
    INSERT INTO lugares (nombre, tipo, ubicacion)
    VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
    RETURNING *;
  `, [nombre, tipo, lng, lat]);

  res.json(result.rows[0]);
});

// Buscar lugares cercanos
app.get('/cercanos', async (req, res) => {
  const { lat, lng, radio } = req.query;

  const result = await pool.query(`
    SELECT nombre,
    ST_Distance(
      ubicacion::geography,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
    ) as distancia
    FROM lugares
    WHERE ST_DWithin(
      ubicacion::geography,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
      $3
    );
  `, [lng, lat, radio]);

  res.json(result.rows);
});

// Proxy simple para tiles (evita bloqueos por CORS/Referer)
app.get('/tiles/:z/:x/:y.:ext', (req, res) => {
  const { z, x, y, ext } = req.params;
  const tileUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.${ext}`;

  const urlObj = new URL(tileUrl);
  const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname,
    headers: {
      'User-Agent': 'Proyecto-CBD-Geoespacial/1.0 (uso académico)',
      'Referer': 'http://localhost:8000'
    }
  };

  const proxyReq = https.get(options, (proxyRes) => {
    if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
      res.status(proxyRes.statusCode).end();
      return;
    }

    const contentType = proxyRes.headers['content-type'] || 'application/octet-stream';
    res.set('Content-Type', contentType);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Error proxy tiles:', err);
    res.status(502).json({ error: 'Tile proxy error' });
  });
});

app.listen(3000, () => console.log('Servidor en puerto 3000'));