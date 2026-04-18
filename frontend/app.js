const map = L.map('map').setView([38.88, -6.97], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Cargar lugares desde backend
fetch('http://localhost:3000/lugares')
  .then(res => res.json())
  .then(data => {
    data.forEach(lugar => {
      L.marker([lugar.lat, lugar.lng])
        .addTo(map)
        .bindPopup(lugar.nombre);
    });
  });

// Click en mapa para buscar cercanos
map.on('click', function(e) {
  const { lat, lng } = e.latlng;

  fetch(`http://localhost:3000/cercanos?lat=${lat}&lng=${lng}`)
    .then(res => res.json())
    .then(data => {
      console.log('Lugares cercanos:', data);
    });
});