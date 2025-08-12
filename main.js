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

function fitCameraToObject(object, padding = 1.5) {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2));

    const direction = center.clone().normalize();
    const newPosition = center.clone().add(direction.multiplyScalar(cameraDistance * padding));

    camera.position.copy(newPosition);
    controls.target.copy(center);
    controls.update();
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

    // Adjust camera to fit the route
    fitCameraToObject(markerGroup);
});


// --- Hover/Tooltip Logic ---
const tooltip = document.getElementById('tooltip');
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let lastApiCall = 0;
const throttlePeriod = 1000; // 1 second
let currentHover = { lat: 0, lon: 0 };

function getLatLonFrom3D(point) {
    const R = 2; // Globe radius
    const latRad = Math.asin(point.y / R);
    const lonRad = Math.atan2(point.z, point.x);

    const lat = latRad * (180 / Math.PI);
    const lon = -lonRad * (180 / Math.PI); // Negate to match our conversion
    return { lat, lon };
}

async function getCountryFromLatLon(lat, lon) {
    try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        if (!response.ok) return 'N/A';
        const data = await response.json();
        return data.countryName || 'N/A';
    } catch (error) {
        return 'N/A';
    }
}

window.addEventListener('mousemove', (event) => {
    // Normalize mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(sphere);

    if (intersects.length > 0) {
        tooltip.style.display = 'block';
        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.top = `${event.clientY + 10}px`;

        const intersectionPoint = intersects[0].point;
        const { lat, lon } = getLatLonFrom3D(intersectionPoint);
        currentHover = { lat, lon };

        tooltip.innerHTML = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}<br>Country: Loading...`;

        const now = Date.now();
        if (now - lastApiCall > throttlePeriod) {
            lastApiCall = now;
            getCountryFromLatLon(lat, lon).then(country => {
                // Only update if the mouse is still hovering over the same approximate location
                if (Math.abs(lat - currentHover.lat) < 0.5 && Math.abs(lon - currentHover.lon) < 0.5) {
                    tooltip.innerHTML = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}<br>Country: ${country}`;
                }
            });
        }
    } else {
        tooltip.style.display = 'none';
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
