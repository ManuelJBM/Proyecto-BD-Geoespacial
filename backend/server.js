import express, { json } from 'express';
import cors from 'cors';
import pool from './db.js';
import https from 'https';

const app = express();
app.use(cors());
app.use(json());

// OBTENER todos los lugares
app.get('/lugares', async (req, res) => {
  const result = await pool.query(`
    SELECT id, nombre, tipo,
    ST_Y(ubicacion) as lat,
    ST_X(ubicacion) as lng
    FROM lugares;
  `);
  res.json(result.rows);
});

// AÑADIR lugares al mapa
app.post('/lugares', async (req, res) => {
  const { nombre, tipo, lat, lng } = req.body;

  try {
    const result = await pool.query(`
    INSERT INTO lugares (nombre, tipo, ubicacion)
    VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
    RETURNING *;
    `, [nombre, tipo, lng, lat]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send("Error");
  }
});

// ELIMINAR lugares del mapa
app.delete('/lugares/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM lugares WHERE id = $1', [id]);

    res.json({ message: 'Eliminado correctamente' });
  } catch (err) {
    res.status(500).send("Error");
  }
});

// EDITAR lugares del mapa
app.put('/lugares/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo } = req.body;

  try {
    const result = await pool.query(`
    UPDATE lugares
    SET nombre = $1, tipo = $2
    WHERE id = $3
    RETURNING *;
    `, [nombre, tipo, id]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send("Error");
  }
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

// OBTENER todas las zonas
app.get('/zonas', async (req, res) => {
  const result = await pool.query(`
    SELECT id, nombre, tipo, trafico,
    ST_AsGeoJSON(geometria) as geojson
    FROM zonas
  `);

  res.json(result.rows);
});

// AÑADIR zonas al mapa
app.post('/zonas', async (req, res) => {
  const { nombre, tipo, trafico, wkt } = req.body;

  try {
    await pool.query(`
      INSERT INTO zonas (nombre, tipo, trafico, geometria)
      VALUES ($1, $2, $3, ST_GeomFromText($4, 4326))
    `, [nombre, tipo, trafico, wkt]);

    res.send("Zona guardada");
  } catch (err) {
    res.status(500).send("Error");
  }
});

// EDITAR zona
app.put('/zonas/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo, trafico, wkt } = req.body;

  try {
    let result;
    if (wkt) {
      result = await pool.query(`
        UPDATE zonas
        SET nombre = $1, tipo = $2, trafico = $3, geometria = ST_GeomFromText($4, 4326)
        WHERE id = $5
        RETURNING *;
      `, [nombre, tipo, trafico, wkt, id]);
    } else {
      result = await pool.query(`
        UPDATE zonas
        SET nombre = $1, tipo = $2, trafico = $3
        WHERE id = $4
        RETURNING *;
      `, [nombre, tipo, trafico, id]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send("Error");
  }
});

// ELIMINAR zona
app.delete('/zonas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM zonas WHERE id = $1', [id]);
    res.json({ message: 'Eliminada correctamente' });
  } catch (err) {
    res.status(500).send('Error');
  }
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