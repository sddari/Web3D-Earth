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

// --- Plotting Logic ---
const lat1Input = document.getElementById('lat1');
const lon1Input = document.getElementById('lon1');
const lat2Input = document.getElementById('lat2');
const lon2Input = document.getElementById('lon2');
const plotButton = document.getElementById('plot-button');

let marker1, marker2, curveLine;
const R = 2; // Globe radius

function getPositionFromLatLon(lat, lon) {
    const latRad = lat * (Math.PI / 180);
    const lonRad = -lon * (Math.PI / 180);
    const x = R * Math.cos(latRad) * Math.cos(lonRad);
    const y = R * Math.sin(latRad);
    const z = R * Math.cos(latRad) * Math.sin(lonRad);
    return new THREE.Vector3(x, y, z);
}

function plotPoint(position, isFirstMarker) {
    let marker = isFirstMarker ? marker1 : marker2;
    if (!marker) {
        const markerGeometry = new THREE.SphereGeometry(0.025, 20, 20);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        marker = new THREE.Mesh(markerGeometry, markerMaterial);
        if (isFirstMarker) marker1 = marker;
        else marker2 = marker;
        scene.add(marker);
    }
    marker.position.copy(position);
}

function drawCurve(p1, p2) {
    if (curveLine) {
        scene.remove(curveLine);
    }
    const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    midpoint.normalize().multiplyScalar(R * 1.1);

    const curve = new THREE.QuadraticBezierCurve3(p1, midpoint, p2);
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    curveLine = new THREE.Line(geometry, material);
    scene.add(curveLine);
}

plotButton.addEventListener('click', () => {
    const lat1 = parseFloat(lat1Input.value);
    const lon1 = parseFloat(lon1Input.value);
    const lat2 = parseFloat(lat2Input.value);
    const lon2 = parseFloat(lon2Input.value);

    if ([lat1, lon1, lat2, lon2].some(isNaN)) {
        alert("Please enter valid coordinates for both points.");
        return;
    }

    const pos1 = getPositionFromLatLon(lat1, lon1);
    const pos2 = getPositionFromLatLon(lat2, lon2);

    plotPoint(pos1, true);
    plotPoint(pos2, false);
    drawCurve(pos1, pos2);
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
