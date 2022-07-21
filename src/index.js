import * as THREE from 'three';

import { OrbitControls } from 'https://unpkg.com/three@0.142.0/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'https://unpkg.com/three@0.142.0/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.142.0/examples/jsm/loaders/GLTFLoader.js';
import { Capsule } from 'https://unpkg.com/three@0.142.0/examples/jsm/math/Capsule.js';
import { Octree } from 'https://unpkg.com/three@0.142.0/examples/jsm/math/Octree.js';
import { OctreeHelper } from 'https://unpkg.com/three@0.142.0/examples/jsm/helpers/OctreeHelper.js';




// variable declaration section
const WIDTH = window.innerWidth
const HEIGHT = window.innerHeight
const STEPS_PER_FRAME = 5

var clock, scene, camera, fillLight1
var loader, directionalLight, container

const GRAVITY = 30;

const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let playerOnFloor = false;

const keyStates = {};
const worldOctree = new Octree();
let mouseTime = 0;



clock = new THREE.Clock();

scene = new THREE.Scene();
scene.background = new THREE.Color(0x88ccee);
scene.fog = new THREE.Fog(0x88ccee, 0, 50);


camera = new THREE.PerspectiveCamera(70, WIDTH / HEIGHT, 0.1, 1000)
camera.rotation.order = "YXZ"


fillLight1 = new THREE.HemisphereLight(0x4488bb, 0x002244, 0.5)
fillLight1.position.set(2, 1, 1)
scene.add(fillLight1)


directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(-5, 25, -1)
directionalLight.castShadow = true
directionalLight.shadow.camera.near = 0.01
directionalLight.shadow.camera.far = 500
directionalLight.shadow.camera.right = 30
directionalLight.shadow.camera.left = -30
directionalLight.shadow.camera.top = 30
directionalLight.shadow.camera.bottom = -30
directionalLight.shadow.mapSize.width = 1024
directionalLight.shadow.mapSize.height = 1024
directionalLight.shadow.radius = 4
directionalLight.shadow.bias = -0.00006
scene.add(directionalLight);

container = document.getElementById("container")

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);



loader = new GLTFLoader()

loader.load("./models/shop/shop.gltf", (gltf) => {
    gltf.scene.scale.set(0.4,0.4,0.4)
  scene.add(gltf.scene);

  worldOctree.fromGraphNode(gltf.scene);

  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      if (child.material.map) {
        child.material.map.anisotropy = 4;
      }
    }
  });

  const helper = new OctreeHelper(worldOctree);
  helper.visible = false;
  scene.add(helper);

  animate();
});


document.addEventListener("keydown", (event) => {
    keyStates[event.code] = true;
  });
  
  document.addEventListener("keyup", (event) => {
    keyStates[event.code] = false;
  });
  
  container.addEventListener("mousedown", () => {
    document.body.requestPointerLock();
  
    mouseTime = performance.now();
  });
  
  document.addEventListener("mouseup", () => {
    if (document.pointerLockElement !== null) throwBall();
  });
  
  document.body.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === document.body) {
      camera.rotation.y -= event.movementX / 500;
      camera.rotation.x -= event.movementY / 500;
    }
  });
  


function animate() {
    const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;
  
    // we look for collisions in substeps to mitigate the risk of
    // an object traversing another too quickly for detection.
    for (let i = 0; i < STEPS_PER_FRAME; i++) {
      controls(deltaTime);
  
      updatePlayer(deltaTime);
  
      teleportPlayerIfOob();
    }
  
    renderer.render(scene, camera);
  
    // stats.update();
  
    requestAnimationFrame(animate);
}


function controls(deltaTime) {
    // gives a bit of air control
    const speedDelta = deltaTime * (playerOnFloor ? 25 : 8);
  
    if (keyStates["KeyW"]) {
      playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));
    }
  
    if (keyStates["KeyS"]) {
      playerVelocity.add(getForwardVector().multiplyScalar(-speedDelta));
    }
  
    if (keyStates["KeyA"]) {
      playerVelocity.add(getSideVector().multiplyScalar(-speedDelta));
    }
  
    if (keyStates["KeyD"]) {
      playerVelocity.add(getSideVector().multiplyScalar(speedDelta));
    }
  
    if (playerOnFloor) {
      if (keyStates["Space"]) {
        playerVelocity.y = 15;
      }
    }
}



function updatePlayer(deltaTime) {
    let damping = Math.exp(-4 * deltaTime) - 1;
  
    if (!playerOnFloor) {
      playerVelocity.y -= GRAVITY * deltaTime;
  
      // small air resistance
      damping *= 0.1;
    }
  
    playerVelocity.addScaledVector(playerVelocity, damping);
    const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
    playerCollider.translate(deltaPosition);
  
    playerCollisions();
  
    camera.position.copy(playerCollider.end);
}


function teleportPlayerIfOob() {
    if (camera.position.y <= -25) {
      playerCollider.start.set(0, 0.35, 0);
      playerCollider.end.set(0, 1, 0);
      playerCollider.radius = 0.35;
      camera.position.copy(playerCollider.end);
      camera.rotation.set(0, 0, 0);
    }
}


function playerCollisions() {
    const result = worldOctree.capsuleIntersect(playerCollider);
    playerOnFloor = false;
    if (result) {
      playerOnFloor = result.normal.y > 0;
      if (!playerOnFloor) {
        playerVelocity.addScaledVector(
          result.normal,
          -result.normal.dot(playerVelocity)
        );
      }
      playerCollider.translate(result.normal.multiplyScalar(result.depth));
    }
  }

const playerCollider = new Capsule(
    new THREE.Vector3(0, 0.35, 0),
    new THREE.Vector3(0, 1, 0),
    0.35
);

function getForwardVector() {
    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();
  
    return playerDirection;
  }
  
  function getSideVector() {
    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();
    playerDirection.cross(camera.up);
  
    return playerDirection;
  }