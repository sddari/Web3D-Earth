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

// --- Trace Route Logic ---
const urlInput = document.getElementById('url-input');
const traceButton = document.getElementById('trace-button');
const infoText = document.getElementById('info-text');

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

function plotPoint(position, isUserMarker) {
    let marker = isUserMarker ? marker1 : marker2;
    if (!marker) {
        const markerGeometry = new THREE.SphereGeometry(0.025, 20, 20);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: isUserMarker ? 0x00ff00 : 0xff0000 }); // Green for user, Red for server
        marker = new THREE.Mesh(markerGeometry, markerMaterial);
        if (isUserMarker) marker1 = marker;
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
    const material = new THREE.LineBasicMaterial({ color: 0x00aaff, linewidth: 2 });
    curveLine = new THREE.Line(geometry, material);
    scene.add(curveLine);
}

async function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
        } else {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve(position.coords),
                () => reject(new Error('Unable to retrieve your location'))
            );
        }
    });
}

async function getServerLocation(domain) {
    try {
        // Remove protocol and paths from domain
        const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
        const response = await fetch(`http://ip-api.com/json/${cleanDomain}`);
        if (!response.ok) {
            throw new Error('Server location API request failed');
        }
        const data = await response.json();
        if (data.status === 'fail') {
            throw new Error(`Could not locate server: ${data.message}`);
        }
        return { latitude: data.lat, longitude: data.lon };
    } catch (error) {
        throw new Error(`Failed to fetch server location: ${error.message}`);
    }
}

traceButton.addEventListener('click', async () => {
    infoText.textContent = 'Tracing route...';
    const domain = urlInput.value;
    if (!domain) {
        infoText.textContent = 'Please enter a web address.';
        return;
    }

    try {
        const [userCoords, serverCoords] = await Promise.all([
            getUserLocation(),
            getServerLocation(domain)
        ]);

        infoText.textContent = `Route traced from your location to ${domain}'s server.`;

        const userPos = getPositionFromLatLon(userCoords.latitude, userCoords.longitude);
        const serverPos = getPositionFromLatLon(serverCoords.latitude, serverCoords.longitude);

        plotPoint(userPos, true); // true for user marker (green)
        plotPoint(serverPos, false); // false for server marker (red)
        drawCurve(userPos, serverPos);

    } catch (error) {
        infoText.textContent = `Error: ${error.message}`;
        alert(`Error: ${error.message}`);
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
