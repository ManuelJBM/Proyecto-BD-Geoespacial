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

const redIcon = L.icon({
  iconUrl: './static/marker-icon-red.png',
  shadowUrl: './static/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function limpiarMapa() {
  marcadores.forEach(m => map.removeLayer(m));
  marcadores = [];
}

async function cargarTipos() {
  try {
    const res = await fetch('http://localhost:3000/lugares');
    if (!res.ok) throw new Error('Error fetching lugares');
    const data = await res.json();
    const tipos = Array.from(new Set(data.map(l => l.tipo).filter(Boolean))).sort();

    const select = document.getElementById('filtroTipo');
    // keep a default 'Todos' option
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
            .bindPopup(`<b>${lugar.nombre}</b><br>Tipo: ${lugar.tipo}`);

          marcadores.push(marker);
        });
    }).catch(err => {
      console.error('Error cargando lugares:', err);
    });
}

const filtro = document.getElementById('filtroTipo');
filtro.addEventListener('change', () => {
  cargarLugares(filtro.value);
});

map.on('click', function(e) {
  puntoSeleccionado = e.latlng;

  if (circulo) map.removeLayer(circulo);

  const radio = document.getElementById('radio').value;

  circulo = L.circle(puntoSeleccionado, {
    radius: radio
  }).addTo(map);

  if (marcadorSeleccionado) map.removeLayer(marcadorSeleccionado);

  marcadorSeleccionado = L.marker(puntoSeleccionado, { 
    icon: redIcon 
  }).addTo(map);
});

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

cargarLugares();
cargarTipos();