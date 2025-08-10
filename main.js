import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 7;

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
const pointsContainer = document.getElementById('points-container');
const addPointButton = document.getElementById('add-point-button');
const plotRouteButton = document.getElementById('plot-route-button');

let pointCount = 2;

function createPointInput(index) {
    const pointGroup = document.createElement('div');
    pointGroup.className = 'point-group';
    pointGroup.innerHTML = `
        <b>Point ${index}</b><br>
        <label>Lat:</label>
        <input type="number" class="lat-input" placeholder="e.g., 35.68">
        <label>Lon:</label>
        <input type="number" class="lon-input" placeholder="e.g., 139.69">
        <button class="remove-point-button">Remove</button>
    `;
    return pointGroup;
}

addPointButton.addEventListener('click', () => {
    pointCount++;
    const newPointInput = createPointInput(pointCount);
    pointsContainer.appendChild(newPointInput);
});

pointsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-point-button')) {
        if (pointsContainer.children.length > 2) {
            e.target.closest('.point-group').remove();
            // No need to decrement pointCount, as it's just for labeling new points
        } else {
            alert("At least two points are required.");
        }
    }
});

let markerGroup = new THREE.Group();
let curveGroup = new THREE.Group();
scene.add(markerGroup);
scene.add(curveGroup);

const R = 2; // Globe radius

function getPositionFromLatLon(lat, lon) {
    const latRad = lat * (Math.PI / 180);
    const lonRad = -lon * (Math.PI / 180);
    const x = R * Math.cos(latRad) * Math.cos(lonRad);
    const y = R * Math.sin(latRad);
    const z = R * Math.cos(latRad) * Math.sin(lonRad);
    return new THREE.Vector3(x, y, z);
}

function plotPoint(position) {
    const markerGeometry = new THREE.SphereGeometry(0.025, 20, 20);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(position);
    markerGroup.add(marker);
}

function drawCurve(p1, p2) {
    const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    midpoint.normalize().multiplyScalar(R * 1.1);

    const curve = new THREE.QuadraticBezierCurve3(p1, midpoint, p2);
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x00aaff, linewidth: 2 });
    const curveLine = new THREE.Line(geometry, material);
    curveGroup.add(curveLine);
}

plotRouteButton.addEventListener('click', () => {
    // Clear previous route
    markerGroup.clear();
    curveGroup.clear();

    const pointGroups = pointsContainer.querySelectorAll('.point-group');
    const positions = [];

    pointGroups.forEach(group => {
        const lat = parseFloat(group.querySelector('.lat-input').value);
        const lon = parseFloat(group.querySelector('.lon-input').value);
        if (!isNaN(lat) && !isNaN(lon)) {
            positions.push(getPositionFromLatLon(lat, lon));
        }
    });

    if (positions.length < 2) {
        alert("Please enter at least two valid points.");
        return;
    }

    // Plot markers and curves
    positions.forEach(pos => plotPoint(pos));
    for (let i = 0; i < positions.length - 1; i++) {
        drawCurve(positions[i], positions[i+1]);
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
