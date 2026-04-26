# Proyecto-BD-Geoespacial

## Manual de usuario

**Resumen**: este proyecto es una aplicación geoespacial simple que combina una base de datos PostGIS, una API en Node.js (Express) y una interfaz web con Leaflet para visualizar y gestionar lugares y zonas.

**Estructura principal**:
- `backend/`: servidor Express y conexión a PostgreSQL/PostGIS.
- `database/`: script de inicialización `init.sql`.
- `frontend/`: interfaz web (HTML/JS estático) y recursos estáticos.

**Requisitos previos**:
- Node.js 16+ instalado.
- PostgreSQL con extensión PostGIS instalada.
- Permisos para ejecutar `psql` y crear bases de datos.

**Preparar la base de datos**
1. Crea la base de datos (ejemplo usando el superusuario `postgres`):

```
psql -U postgres -c "CREATE DATABASE postgis_db;"
```

2. Ejecuta el script de inicialización para crear las tablas y datos de ejemplo:

```
psql -U postgres -d postgis_db -f database/init.sql
```

3. Si tus credenciales son distintas edita `backend/db.js` para ajustar `user`, `password`, `host` o `port`.

**Instalar y arrancar el backend**
1. En la carpeta `backend` instala dependencias:

```
cd backend
npm install
```

2. Para ejecución en desarrollo con recarga automática:

```
npm run dev
```

3. O ejecutar directamente el servidor:

```
npm start
```

El servidor escucha por defecto en el puerto `3000`.

**Instalar y arrancar el frontend**
El frontend es estático. Dos opciones:

- Abrir `frontend/index.html` directamente en el navegador.
- O servir la carpeta con un servidor estático (recomendado para evitar restricciones CORS):

```
cd frontend
npx http-server . -c-1 -p 8000
```

La interfaz quedará disponible en `http://localhost:8000`.

**Pasos completos de inicialización (resumen rápido)**
1. Instalar PostgreSQL + PostGIS.
2. Crear la base `postgis_db` y ejecutar `database/init.sql`.
3. Ajustar credenciales en `backend/db.js` si es necesario.
4. `cd backend && npm install && npm run dev`.
5. `cd frontend && npx http-server . -p 8000` (o abrir `index.html`).

**Cómo usar las funcionalidades (interfaz y API)**

- Visualizar lugares y zonas: al abrir la web se cargan automáticamente los puntos (`/lugares`) y polígonos (`/zonas`).
- Filtrar por tipo: usa el selector "Tipo" en la interfaz para mostrar solo lugares de un tipo concreto.
- Añadir un lugar: haz click en el mapa para seleccionar un punto y luego pulsa el botón "Añadir lugar" (se solicitan nombre y tipo). Esto envía una petición `POST /lugares`.
- Editar / Eliminar un lugar: en el popup de un marcador encontrarás botones para editar o eliminar. `PUT /lugares/:id` y `DELETE /lugares/:id`.
- Añadir una zona: usa la herramienta de dibujo (polígono) para dibujar en el mapa, luego pulsa "Guardar zona"; la app convierte la geometría a WKT y hace `POST /zonas`.
- Editar / Eliminar zona: desde el popup del polígono tienes opciones para editar o eliminar. `PUT /zonas/:id` y `DELETE /zonas/:id`.
- Buscar lugares cercanos: haz click en el mapa para seleccionar un punto, indica el radio (en metros) y pulsa "Buscar cercanos". La interfaz consulta `GET /cercanos?lat=...&lng=...&radio=...` y muestra los resultados.
- Tiles: el servidor actúa como proxy de tiles (`/tiles/{z}/{x}/{y}.png`) para evitar problemas de CORS/Referer con OpenStreetMap.

**API (endpoints principales)**
- `GET /lugares` — devuelve todos los lugares con sus coordenadas.
- `POST /lugares` — añadir un lugar. Body JSON: `{ nombre, tipo, lat, lng }`.
- `PUT /lugares/:id` — editar nombre/tipo. Body JSON: `{ nombre, tipo }`.
- `DELETE /lugares/:id` — eliminar lugar.
- `GET /zonas` — devuelve todas las zonas con geometría en GeoJSON.
- `POST /zonas` — añadir zona. Body JSON: `{ nombre, tipo, trafico, wkt }` (WKT polygon).
- `PUT /zonas/:id` — editar zona (opcional `wkt` para cambiar geometría).
- `DELETE /zonas/:id` — eliminar zona.
- `GET /cercanos?lat=..&lng=..&radio=..` — buscar lugares dentro de `radio` (metros) alrededor del punto.
- `GET /tiles/:z/:x/:y.:ext` — proxy de tiles (servidor backend reenvía tiles desde OpenStreetMap).

**Archivos clave**
- [backend/server.js](backend/server.js) — lógica del API y proxy de tiles.
- [backend/db.js](backend/db.js) — configuración de conexión a PostgreSQL.
- [backend/package.json](backend/package.json) — scripts y dependencias del backend.
- [frontend/app.js](frontend/app.js) — lógica del cliente (Leaflet, llamadas a la API).
- [database/init.sql](database/init.sql) — script para crear tablas y datos iniciales.

**Resolución de problemas comunes**
- Error al conectar con la base: revisa las credenciales en `backend/db.js` y que PostgreSQL está ejecutándose.
- Extensión PostGIS no encontrada: asegúrate de que instalaste PostGIS y ejecuta `CREATE EXTENSION postgis;` en la base.
- Tiles no se cargan: comprueba que el backend está en `http://localhost:3000` y que el proxy `/tiles/...` responde.
- Si `npm run dev` falla: ejecuta `npm install` dentro de `backend` y vuelve a intentarlo.

Si quieres que escriba instrucciones para desplegar en producción o generar un `docker-compose` para arrancar todo (Postgres+backend+frontend), dímelo y lo preparo.
