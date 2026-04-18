CREATE EXTENSION postgis;

CREATE TABLE lugares (
  id SERIAL PRIMARY KEY,
  nombre TEXT,
  tipo TEXT,
  ubicacion GEOMETRY(Point, 4326)
);

INSERT INTO lugares (nombre, tipo, ubicacion)
VALUES 
('Restaurante A', 'restaurante', ST_SetSRID(ST_MakePoint(-6.97, 38.88), 4326)),
('Restaurante B', 'restaurante', ST_SetSRID(ST_MakePoint(-6.96, 38.89), 4326)),
('Hospital 1', 'hospital', ST_SetSRID(ST_MakePoint(-6.95, 38.87), 4326));