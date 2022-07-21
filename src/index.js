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

let clock, scene, camera, fillLight1, numAnimations = 0
let loader, directionalLight, container, mixer, model, skeleton

const GRAVITY = 30;

// const playerVelocity = new THREE.Vector3();
// const playerDirection = new THREE.Vector3();

let movingForward = false, mousedown = false, movingBackward = false

const cameraAssembly = new THREE.Group();
const xAxis = new THREE.Vector3(1, 0, 0);

const cameraOrigin = new THREE.Vector3(0, 0,0)


let playerOnFloor = false;

const keyStates = {};
const worldOctree = new Octree();
let mouseTime = 0;






clock = new THREE.Clock();

scene = new THREE.Scene();
scene.background = new THREE.Color(0x88ccee);
scene.fog = new THREE.Fog(0x88ccee, 0, 50);

const axisHelper = new THREE.AxesHelper(5)
scene.add(axisHelper)

camera = new THREE.PerspectiveCamera(70, WIDTH / HEIGHT, 0.1, 1000)
// camera.rotation.order = "YXZ"
camera.position.set(0,3,-2)
// camera.lookAt.y = 3
//controls.update() must be called after any manual changes to the camera's transform
// camera.position.set( 0, 20, 100 );


const tempModelVector = new THREE.Vector3(0,0,-1)
const tempCameraVector = new THREE.Vector3(0,0,-1)
const playerFacingDirection = new THREE.Vector3()

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



const controls = new OrbitControls( camera, renderer.domElement );


controls.update();



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



loader.load( 'https://threejs.org/examples/models/gltf/Xbot.glb', function ( gltf ) {
    model = gltf.scene;
    gltf.scene.position.set(0,0.1,0)
    scene.add(model)
    // container.add(model);
    
    model.traverse( function ( object ) {
      if ( object.isMesh ) {
        object.castShadow = true;
      }   
    });
    
    skeleton = new THREE.SkeletonHelper( model );
    skeleton.visible = false;
    scene.add( skeleton );
    
    const animations = gltf.animations;
    mixer = new THREE.AnimationMixer( model );
  
    let a = animations.length;
    for ( let i = 0; i < a; ++ i ) {
      let clip = animations[ i ];
      const name = clip.name;
      if ( baseActions[ name ] ) {
        const action = mixer.clipAction( clip );
        activateAction( action );
        baseActions[ name ].action = action;
        allActions.push( action );
        numAnimations += 1;
      }
    }
  });


  const helper = new OctreeHelper(worldOctree);
  helper.visible = false;
  scene.add(helper);

  // animate();
});

const allActions = [];

const baseActions = {
  idle: { weight: 1 },
  walk: { weight: 0 },
  // run: { weight: 0 }
};

function activateAction( action ) {
  const clip = action.getClip();
  const settings = baseActions[ clip.name ];
  setWeight( action, settings.weight );
  action.play();
}

function setWeight( action, weight ) {
  action.enabled = true;
  action.setEffectiveTimeScale( 1 );
  action.setEffectiveWeight( weight );
}

window.addEventListener("keydown", (e) => {
  const { keyCode } = e;
  console.log(e)
  if(keyCode === 87) {
    baseActions.idle.weight = 0;
    baseActions.walk.weight = 5;   
    activateAction(baseActions.walk.action);
    activateAction(baseActions.idle.action);
    movingForward = true;
  }
  if(keyCode === 83 ) {
    baseActions.idle.weight = 0;
    baseActions.walk.weight = 5;   
    activateAction(baseActions.walk.action);
    activateAction(baseActions.idle.action);
    movingBackward = true;
  }
});


window.addEventListener("keyup", (e) => {
  const {keyCode} = e;
  // keycode w
  if (keyCode === 87) {
    baseActions.idle.weight = 1;
    baseActions.walk.weight = 0;
    activateAction(baseActions.walk.action);
    activateAction(baseActions.idle.action);
    movingForward = false;
}
if (keyCode === 83) {
  baseActions.idle.weight = 1;
  baseActions.walk.weight = 0;
  activateAction(baseActions.walk.action);
  activateAction(baseActions.idle.action);
  movingBackward = false;
}

})


  


const animate = function () {

  

  requestAnimationFrame( animate );


  for ( let i = 0; i < numAnimations; i++ ) {
    const action = allActions[ i ];
    const clip = action.getClip();
    const settings = baseActions[clip.name];
    // settings.weight = action.getEffectiveWeight();
  }

  if(mixer) {
    const mixerUpdateDelta = clock.getDelta();
    mixer.update( mixerUpdateDelta );
  }
  
  if(movingForward) {
    // Get the X-Z plane in which camera is looking to move the player
    cameraAssembly.getWorldDirection(tempCameraVector);
    const cameraDirection = tempCameraVector.setY(0).normalize();
    
    // Get the X-Z plane in which player is looking to compare with camera
    model.getWorldDirection(tempModelVector);
    const playerDirection = tempModelVector.setY(0).normalize();
    model.translateZ(0.06);
    // camera.translateZ(0.06)
    cameraAssembly.position.copy(model.position)
    model.updateMatrixWorld()
    playerFacingDirection.copy(tempModelVector);
    playerFacingDirection.applyMatrix4(model.matrixWorld);
    playerFacingDirection.y = 0;
    playerFacingDirection.x = 0;
    playerFacingDirection.z = 0;
    camera.rotation.set(new THREE.Vector3( 0, Math.PI, 0))
    playerFacingDirection.normalize();
    camera.quaternion.setFromUnitVectors(tempCameraVector, playerFacingDirection);
   
  }

  if(movingBackward) {
    // Get the X-Z plane in which camera is looking to move the player
    cameraAssembly.getWorldDirection(tempCameraVector);
    const cameraDirection = tempCameraVector.setY(0).normalize();
    
    // Get the X-Z plane in which player is looking to compare with camera
    model.getWorldDirection(tempModelVector);
    const playerDirection = tempModelVector.setY(0).normalize();
    model.translateZ(-0.06);
    // camera.translateZ(-0.06);
    cameraAssembly.position.copy(model.position)
    model.updateMatrixWorld()
   
  }

  renderer.render( scene, camera );
};

animate()

