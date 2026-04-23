///// ----- VARIABLES ----- /////

const map = L.map('map').setView([38.88, -6.97], 13);

const tiles = L.tileLayer('http://localhost:3000/tiles/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

tiles.on('tileerror', (err) => {
  console.error('Error cargando un tile:', err);
});

let marcadores = [];
let puntoSeleccionado = null;
let circulo = null;
let marcadorSeleccionado = null;

const pointerIcon = L.icon({
  iconUrl: './static/marker-icon-violet.png',
  shadowUrl: './static/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const filtro = document.getElementById('filtroTipo');
filtro.addEventListener('change', () => {
  cargarLugares(filtro.value);
});

function crearPopup(lugar) {
  return `
    <b>${lugar.nombre}</b><br>
    Tipo: ${lugar.tipo}<br><br>
    <button onclick="editarLugar(${lugar.id}, '${lugar.nombre}', '${lugar.tipo}')">Editar</button>
    <button onclick="eliminarLugar(${lugar.id})">Eliminar</button>
  `;
}

function getColor(trafico) {
  if (trafico === 3) return 'red';
  if (trafico === 2) return 'orange';
  return 'green';
}

var drawControl = new L.Control.Draw({
  draw: {
    polygon: true,
    rectangle: false,
    circle: false,
    marker: false,
    polyline: false
  }
});

map.addControl(drawControl);

///// ----- FUNCIONES ----- /////

function limpiarMapa() {
  marcadores.forEach(m => map.removeLayer(m));
  marcadores = [];
}

function coordsToWKT(coords) {
  const puntos = coords.map(c => `${c.lng} ${c.lat}`);
  puntos.push(`${coords[0].lng} ${coords[0].lat}`);
  return `POLYGON((${puntos.join(',')}))`;

}

async function cargarTipos() {
  try {
    const res = await fetch('http://localhost:3000/lugares');
    if (!res.ok) throw new Error('Error fetching lugares');
    const data = await res.json();
    const tipos = Array.from(new Set(data.map(l => l.tipo).filter(Boolean))).sort();

    const select = document.getElementById('filtroTipo');
    select.innerHTML = '<option value="">Todos</option>';

    tipos.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Error cargando tipos:', err);
  }
}

function cargarLugares(tipo = '') {
  limpiarMapa();

  fetch('http://localhost:3000/lugares')
    .then(res => res.json())
    .then(data => {
      data
        .filter(l => !tipo || l.tipo === tipo)
        .forEach(lugar => {
          const marker = L.marker([lugar.lat, lugar.lng])
            .addTo(map)
            .bindPopup(crearPopup(lugar));

          marcadores.push(marker);
        });
    }).catch(err => {
      console.error('Error cargando lugares:', err);
    });
}

async function cargarZonas() {
  const res = await fetch('http://localhost:3000/zonas');
  const zonas = await res.json();

  zonas.forEach(zona => {
    const geo = JSON.parse(zona.geojson);

    L.geoJSON(geo, {
      style: {
        color: getColor(zona.trafico),
        fillOpacity: 0.4
      }
    })
      .bindPopup(`
        <b>${zona.nombre}</b><br>
        Tipo: ${zona.tipo}<br>
        Tráfico: ${zona.trafico}<br><br>
        <button onclick="editarZona(${zona.id}, '${zona.nombre}', '${zona.tipo}', '${zona.trafico}')">Editar</button>
        <button onclick="eliminarZona(${zona.id})">Eliminar</button>
      `)
    .addTo(map);
  });
}

// AÑADIR lugar
function anadirLugar() {
  if (!puntoSeleccionado) {
    alert('Haz click en el mapa primero');
    return;
  }

  const nombre = prompt('Nombre del lugar:');
  if (!nombre) return;
  const tipo = prompt('Tipo (restaurante/hospital/etc):');
  if (!tipo) return;

  const lat = puntoSeleccionado.lat;
  const lng = puntoSeleccionado.lng;

  fetch('http://localhost:3000/lugares', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ nombre, tipo, lat, lng })
  })
  .then(res => {
    if (!res.ok) throw new Error('Error al guardar lugar');
    return res.json();
  })
  .then(data => {
    L.marker([lat, lng])
      .addTo(map)
      .bindPopup(`<b>${data.nombre}</b><br>Tipo: ${data.tipo}`);

    // refrescar marcadores según filtro actual
    cargarLugares(filtro.value);
  })
  .catch(err => {
    console.error('Error guardando lugar:', err);
    alert('Error guardando el lugar');
  });
}

// ELIMINAR lugar
function eliminarLugar(id) {
  if (!confirm('¿Seguro que quieres eliminar este punto?')) return;

  fetch(`http://localhost:3000/lugares/${id}`, {
    method: 'DELETE'
  })
  .then(() => {
    cargarLugares();
  });
}

// EDITAR lugar
function editarLugar(id, nombreActual, tipoActual) {
  const nuevoNombre = prompt('Nuevo nombre:', nombreActual);
  const nuevoTipo = prompt('Nuevo tipo:', tipoActual);

  if (!nuevoNombre || !nuevoTipo) return;

  fetch(`http://localhost:3000/lugares/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ nombre: nuevoNombre, tipo: nuevoTipo })
  })
  .then(res => res.json())
  .then(() => {
    cargarLugares();
  });
}

// AÑADIR zona
async function guardarZona() {
  const nombre = prompt("Nombre de la zona:");
  const tipo = prompt("Tipo (avenida, barrio...):");
  const trafico = prompt("Nivel tráfico (1-3):");

  const wkt = coordsToWKT(window.currentPolygon);

  await fetch('http://localhost:3000/zonas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      nombre,
      tipo,
      trafico: parseInt(trafico),
      wkt
    })
  });

  alert("Zona guardada");
}

// EDITAR zona
function editarZona(id, nombreActual, tipoActual, traficoActual) {
  const nuevoNombre = prompt('Nuevo nombre:', nombreActual);
  const nuevoTipo = prompt('Nuevo tipo:', tipoActual);
  const nuevoTrafico = prompt('Nuevo nivel de tráfico (1-3):', traficoActual);

  if (!nuevoNombre || !nuevoTipo || !nuevoTrafico) return;

  const body = {
    nombre: nuevoNombre,
    tipo: nuevoTipo,
    trafico: parseInt(nuevoTrafico)
  };

  fetch(`http://localhost:3000/zonas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  .then(res => res.json())
  .then(() => {
    cargarZonas();
  })
  .catch(err => {
    console.error('Error editando zona:', err);
    alert('Error editando la zona');
  });
}

// ELIMINAR zona
function eliminarZona(id) {
  if (!confirm('¿Seguro que quieres eliminar esta zona?')) return;

  fetch(`http://localhost:3000/zonas/${id}`, { 
    method: 'DELETE' 
  })
  .then(() => {
    cargarZonas();
  })
  .catch(err => {
    alert('Error eliminando la zona');
  });
}

function buscarCercanos() {
  if (!puntoSeleccionado) {
    alert('Haz click en el mapa primero');
    return;
  }

  const radio = document.getElementById('radio').value;

  fetch(`http://localhost:3000/cercanos?lat=${puntoSeleccionado.lat}&lng=${puntoSeleccionado.lng}&radio=${radio}`)
    .then(res => res.json())
    .then(data => {
      const div = document.getElementById('resultados');
      div.innerHTML = '<b>Resultados:</b><br>';

      data.forEach(l => {
        div.innerHTML += `${l.nombre} (${Math.round(l.distancia)} m)<br>`;
      });
    }).catch(err => {
      console.error('Error buscando cercanos:', err);
    });
}

map.on('click', function(e) {
  puntoSeleccionado = e.latlng;

  if (circulo) map.removeLayer(circulo);

  const radio = document.getElementById('radio').value;

  circulo = L.circle(puntoSeleccionado, {
    radius: radio
  }).addTo(map);

  if (marcadorSeleccionado) map.removeLayer(marcadorSeleccionado);

  marcadorSeleccionado = L.marker(puntoSeleccionado, { 
    icon: pointerIcon 
  }).addTo(map);
});

map.on('draw:created', function (e) {
  const layer = e.layer;
  map.addLayer(layer);

  const puntos = layer.getLatLngs()[0]; // array de puntos

  window.currentPolygon = puntos;
});

cargarLugares();
cargarZonas();
cargarTipos();