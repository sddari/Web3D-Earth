import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Sphere
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(2, 50, 50),
  new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load('/earthmap.jpg')
  })
);
scene.add(sphere);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 3, 5);
scene.add(directionalLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- Marker Logic ---
const latInput = document.getElementById('lat');
const lonInput = document.getElementById('lon');
const plotButton = document.getElementById('plot-button');

let marker;
const R = 2; // Globe radius

function plotMarker(lat, lon) {
    if (!marker) {
        const markerGeometry = new THREE.SphereGeometry(0.05, 20, 20);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        marker = new THREE.Mesh(markerGeometry, markerMaterial);
        scene.add(marker);
    }

    const latRad = lat * (Math.PI / 180);
    const lonRad = -lon * (Math.PI / 180); // Negate longitude for correct mapping

    // Convert lat/lon to 3D coordinates
    marker.position.x = R * Math.cos(latRad) * Math.cos(lonRad);
    marker.position.y = R * Math.sin(latRad);
    marker.position.z = R * Math.cos(latRad) * Math.sin(lonRad);
}

plotButton.addEventListener('click', () => {
    const lat = parseFloat(latInput.value);
    const lon = parseFloat(lonInput.value);

    if (!isNaN(lat) && !isNaN(lon)) {
        plotMarker(lat, lon);
    } else {
        alert("Please enter valid latitude and longitude.");
    }
});


// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
