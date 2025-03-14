import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from 'tween.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 5, 10);
controls.target.set(0, 0, 0);
controls.update();

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);
const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(0, 5, 0);
scene.add(pointLight);

// Texture loader
const textureLoader = new THREE.TextureLoader();
const textures = {};
const ingredientTypes = ['bottomBun', 'patty', 'cheese', 'lettuce', 'tomato', 'topBun'];
ingredientTypes.forEach(type => {
    textures[type] = textureLoader.load(`textures/${type}.png`);
});
const counterTexture = textureLoader.load('textures/wood.png');
const serveTexture = textureLoader.load('textures/serve.png');

// Counter
const counterGeometry = new THREE.BoxGeometry(10, 1, 10);
const counterMaterial = new THREE.MeshStandardMaterial({ map: counterTexture });
const counter = new THREE.Mesh(counterGeometry, counterMaterial);
counter.position.y = 0.5;
scene.add(counter);

// Ingredient definitions
const ingredients = {
    'bottomBun': { geometry: new THREE.SphereGeometry(1, 32, 16), height: 1 },
    'patty': { geometry: new THREE.CylinderGeometry(1, 1, 0.2, 32), height: 0.2 },
    'cheese': { geometry: new THREE.BoxGeometry(1.5, 0.1, 1.5), height: 0.1 },
    'lettuce': { geometry: new THREE.PlaneGeometry(1.5, 1.5), height: 0.1 },
    'tomato': { geometry: new THREE.CylinderGeometry(1, 1, 0.1, 32), height: 0.1 },
    'topBun': { geometry: new THREE.SphereGeometry(1, 32, 16), height: 1 }
};

// Selectable ingredients
const selectableIngredients = [];
ingredientTypes.forEach((type, index) => {
    const ingredient = new THREE.Mesh(ingredients[type].geometry, new THREE.MeshStandardMaterial({ map: textures[type] }));
    ingredient.position.set(-5 + index * 2, 1.5, -5);
    ingredient.userData.type = type;
    scene.add(ingredient);
    selectableIngredients.push(ingredient);
});

// Player's burger stack
let stack = [];
let stackHeight = 1;
const stackGroup = new THREE.Group();
stackGroup.position.set(0, 0, 0);
scene.add(stackGroup);

// Target stack
let targetStack = [];
const targetGroup = new THREE.Group();
targetGroup.position.set(5, 1, -5);
scene.add(targetGroup);

// Serve button
const serveGeometry = new THREE.PlaneGeometry(1, 0.5);
const serveMaterial = new THREE.MeshBasicMaterial({ map: serveTexture, side: THREE.DoubleSide });
const serveButton = new THREE.Mesh(serveGeometry, serveMaterial);
serveButton.position.set(0, 1.01, 4);
serveButton.rotation.x = -Math.PI / 2;
serveButton.userData.isServeButton = true;
scene.add(serveButton);

// Labels
function createTextTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
    return new THREE.CanvasTexture(canvas);
}
const customerLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: createTextTexture("Customer's Order") }));
customerLabel.position.set(5, 3, -5);
customerLabel.scale.set(2, 0.5, 1);
scene.add(customerLabel);
const playerLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: createTextTexture("Your Burger") }));
playerLabel.position.set(0, 3, 0);
playerLabel.scale.set(2, 0.5, 1);
scene.add(playerLabel);

// Game state
let score = 0;
let timeLeft = 30;
let gameActive = true;
let streak = 0;

// UI elements
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
function updateUI() {
    scoreElement.textContent = `Score: ${score}`;
    timerElement.textContent = `Time Left: ${timeLeft.toFixed(1)}s`;
}

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener('click', (event) => {
    if (!gameActive) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(selectableIngredients.concat(stackGroup.children).concat([serveButton]));
    if (intersects.length > 0) {
        const selected = intersects[0].object;
        if (selectableIngredients.includes(selected)) {
            addIngredient(selected.userData.type);
        } else if (stackGroup.children.includes(selected) && selected === stackGroup.children[stackGroup.children.length - 1]) {
            removeTopIngredient();
        } else if (selected.userData.isServeButton) {
            serveBurger();
        }
    }
});

// Functions
function addIngredient(type) {
    const ingredientData = ingredients[type];
    const ingredient = new THREE.Mesh(ingredientData.geometry, new THREE.MeshStandardMaterial({ map: textures[type] }));
    ingredient.position.y = stackHeight + ingredientData.height / 2;
    stackGroup.add(ingredient);
    stack.push(type);
    stackHeight += ingredientData.height;
    ingredient.scale.set(0.1, 0.1, 0.1);
    new TWEEN.Tween(ingredient.scale)
        .to({ x: 1, y: 1, z: 1 }, 200)
        .easing(TWEEN.Easing.Bounce.Out)
        .start();
}

function removeTopIngredient() {
    if (stack.length > 0) {
        const topIngredient = stackGroup.children[stackGroup.children.length - 1];
        stackHeight -= ingredients[stack.pop()].height;
        stackGroup.remove(topIngredient);
    }
}

function generateOrder() {
    targetStack = ['bottomBun'];
    const middleIngredients = ['patty', 'cheese', 'lettuce', 'tomato'];
    const numMiddle = Math.min(Math.floor(score / 10) + 1, 4);
    for (let i = 0; i < numMiddle; i++) {
        const randomIngredient = middleIngredients[Math.floor(Math.random() * middleIngredients.length)];
        targetStack.push(randomIngredient);
    }
    targetStack.push('topBun');
    buildTargetStack();
    timeLeft = 30;
}

function buildTargetStack() {
    while (targetGroup.children.length > 0) {
        targetGroup.remove(targetGroup.children[0]);
    }
    let height = 0;
    targetStack.forEach(type => {
        const ingredientData = ingredients[type];
        const ingredient = new THREE.Mesh(ingredientData.geometry, new THREE.MeshStandardMaterial({ map: textures[type] }));
        ingredient.position.y = height + ingredientData.height / 2;
        targetGroup.add(ingredient);
        height += ingredientData.height;
    });
}

function serveBurger() {
    if (JSON.stringify(stack) === JSON.stringify(targetStack)) {
        streak++;
        const multiplier = 1 + Math.min(streak * 0.1, 1);
        const basePoints = 100 + timeLeft * 5;
        score += Math.floor(basePoints * multiplier);
        console.log('Burger served correctly! +', Math.floor(basePoints * multiplier), 'points');
        resetBurger();
        generateOrder();
    } else {
        streak = 0;
        score -= 50;
        console.log('Wrong burger! -50 points');
        resetBurger();
    }
}

function resetBurger() {
    stack = [];
    stackHeight = 1;
    while (stackGroup.children.length > 0) {
        stackGroup.remove(stackGroup.children[0]);
    }
}

function maybeChangeOrder() {
    if (Math.random() < 0.1 && stack.length > 0 && timeLeft > 10) {
        const middleIngredients = ['patty', 'cheese', 'lettuce', 'tomato'];
        const extra = middleIngredients[Math.floor(Math.random() * middleIngredients.length)];
        targetStack.splice(targetStack.length - 1, 0, extra);
        buildTargetStack();
        flashTargetStack();
        console.log('Customer changed their mind! Added', extra);
    }
}

function flashTargetStack() {
    new TWEEN.Tween(targetGroup.scale)
        .to({ x: 1.1, y: 1.1, z: 1.1 }, 100)
        .yoyo(true)
        .repeat(1)
        .start();
}

// Animation loop
let lastTime = 0;
function animate(time) {
    requestAnimationFrame(animate);
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    if (gameActive) {
        timeLeft -= delta;
        if (timeLeft <= 0) {
            console.log('Time’s up! -50 points');
            score -= 50;
            resetBurger();
            generateOrder();
        }
        maybeChangeOrder();
        updateUI();
    }

    TWEEN.update(time);
    controls.update();
    renderer.render(scene, camera);
}

// Start game
generateOrder();
animate(0);

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});