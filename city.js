import * as THREE from 'three';

let scene, camera, renderer, analyser, dataArray, audio, source;
let city = new THREE.Object3D(), smoke = new THREE.Object3D(), town = new THREE.Object3D();
let isPlaying = false;

let camZ = 30, camX = 0, camY = 15;
const cityLength = 40;
const numberOfClones = 4;
let cityClones = [];

const clock = new THREE.Clock();
let currentCamX = camX;
let currentCamY = camY;
let currentCamZ = camZ;
let smoothedAvg = 0;

init();
animate();

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
  camera.position.set(camX, camY, camZ);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1c4dac);
  scene.fog = new THREE.Fog(0x1c4dac, 10, 60);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  createCity();
  generateLines();
  setupLights();

  city.position.z = 0;
  scene.add(city);
  cityClones.push(city);

  for (let i = 1; i < numberOfClones; i++) {
    const clone = city.clone();
    clone.position.z = -i * cityLength;
    scene.add(clone);
    cityClones.push(clone);
  }

  document.getElementById('audioFile').addEventListener('change', handleAudio);
  document.getElementById('playPauseBtn').addEventListener('click', togglePlay);
}

function handleAudio(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (audio) audio.pause();

  audio = new Audio(URL.createObjectURL(file));
  audio.crossOrigin = "anonymous";
  audio.loop = true;

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  source = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  audio.play();
  isPlaying = true;
  document.getElementById('playPauseBtn').innerText = "Pause";
}

function togglePlay() {
  if (!audio) return;

  if (isPlaying) {
    audio.pause();
    document.getElementById('playPauseBtn').innerText = "Play";
  } else {
    audio.play();
    document.getElementById('playPauseBtn').innerText = "Pause";
  }
  isPlaying = !isPlaying;
}

function mathRandom(num = 8) {
  return -Math.random() * num + Math.random() * num;
}

function setTintColor() {
  return 0x001144;
}

function createCity() {
  for (let i = 0; i < 150; i++) {
    const base = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhysicalMaterial({
      color: setTintColor(),
      metalness: 0.9,
      roughness: 0.2,
      reflectivity: 0.6,
      clearcoat: 0.3,
      emissive: new THREE.Color(0x44aaff),
      emissiveIntensity: 0.3
    });

    const height = 0.1 + Math.abs(mathRandom(10));
    const width = 0.5 + Math.random() * 0.5;
    const depth = 0.5 + Math.random() * 0.5;

    const cube = new THREE.Mesh(base, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.scale.set(width, height, depth);
    cube.position.set(Math.round(mathRandom(20)), height / 2, Math.round(mathRandom(20)));

    if (Math.random() > 0.7) {
      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x4488ff, emissiveIntensity: 1 })
      );
      antenna.position.y = height + 0.25;
      cube.add(antenna);
    }

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      opacity: 0.03,
      transparent: true
    });
    const wire = new THREE.Mesh(base, wireMaterial);
    cube.add(wire);

    town.add(cube);
  }

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({
      color: 0x000011,
      side: THREE.DoubleSide,
      metalness: 0.3,
      roughness: 0.8,
      emissive: new THREE.Color(0x001122),
      emissiveIntensity: 0.05
    })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.001;
  plane.receiveShadow = true;

  city.add(plane);
  city.add(town);

  const gmat = new THREE.MeshToonMaterial({ color: 0x00ccff });
  const gpart = new THREE.CircleGeometry(0.01, 3);
  for (let h = 0; h < 300; h++) {
    const particle = new THREE.Mesh(gpart, gmat);
    particle.position.set(mathRandom(30), mathRandom(10), mathRandom(30));
    particle.rotation.set(mathRandom(), mathRandom(), mathRandom());
    smoke.add(particle);
  }
  smoke.position.y = 2;
  city.add(smoke);

  const particleGeo = new THREE.BufferGeometry();
  const particleCount = 500;
  const positions = [];
  for (let i = 0; i < particleCount; i++) {
    positions.push(mathRandom(40), mathRandom(20), mathRandom(40));
  }
  particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x88ccff,
    size: 0.2,
    transparent: true,
    opacity: 0.7
  });
  const audioParticles = new THREE.Points(particleGeo, particleMat);
  city.add(audioParticles);
  window._audioParticles = audioParticles;
}

function generateLines() {
  const mat = new THREE.MeshToonMaterial({ color: 0x33ddff });
  const geo = new THREE.BoxGeometry(1, 0.05, 0.05);

  for (let i = 0; i < 80; i++) {
    const line = new THREE.Mesh(geo, mat);
    line.position.set((Math.random() - 0.5) * 60, 0.1, (Math.random() - 0.5) * 60);
    city.add(line);
  }
}

function setupLights() {
  const ambient = new THREE.AmbientLight(0x3355aa, 1.5);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(15, 30, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  dirLight.shadow.bias = -0.001;
  const hemiLight = new THREE.HemisphereLight(0x001133, 0x000000, 0.6);
  scene.add(hemiLight);
  scene.add(dirLight);
  scene.add(ambient);
}

function animate() {
  requestAnimationFrame(animate);

  if (analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);
    const rawAvg = dataArray.reduce((a, b) => a + b) / dataArray.length;
    smoothedAvg += (rawAvg - smoothedAvg) * 0.1;

    town.children.forEach((b, i) => {
      const scale = 0.5 + (dataArray[i % dataArray.length] / 255) * 2;
      b.scale.y = scale;
      b.position.y = scale / 2;
      b.material.emissiveIntensity = 0.3 + scale * 0.05;
    });

    const time = clock.getElapsedTime();
    const speed = 0.02 + smoothedAvg / 1024;
    camZ -= speed;

    const targetX = Math.sin(time * 0.3) * 10;
    const flyLow = Math.sin(time * 0.2) * 0.5 + 0.5;
    const targetY = 10 - flyLow * 6 + Math.sin(time * 0.5) * 1.5;
    const targetZ = camZ;

    const damping = 0.05;
    currentCamX += (targetX - currentCamX) * damping;
    currentCamY += (targetY - currentCamY) * damping;
    currentCamZ += (targetZ - currentCamZ) * damping;

    cityClones.forEach(clone => {
      const dz = clone.position.z - camZ;
      if (dz > cityLength * numberOfClones * 0.5) {
        clone.position.z -= cityLength * numberOfClones;
      }
    });

    camera.position.set(currentCamX, currentCamY, currentCamZ);
    camera.lookAt(new THREE.Vector3(currentCamX, 6, currentCamZ - 20));

    if (window._audioParticles) {
      const scaleFactor = 1 + (smoothedAvg / 255) * 0.5;
      window._audioParticles.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }
  }

  smoke.rotation.y += 0.002;
  smoke.rotation.x += 0.001;
  renderer.render(scene, camera);
}
