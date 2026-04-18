import express, { json } from 'express';
import cors from 'cors';
import pool from './db.js';

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

// Buscar lugares cercanos
app.get('/cercanos', async (req, res) => {
  const { lat, lng } = req.query;

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
      1000
    );
  `, [lng, lat]);

  res.json(result.rows);
});

app.listen(3000, () => console.log('Servidor en puerto 3000'));