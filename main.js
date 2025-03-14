import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from 'tween.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

// Add orbit controls for camera movement
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 5, 10);
controls.update();

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// Counter
const counterGeometry = new THREE.BoxGeometry(10, 1, 10);
const counterMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
const counter = new THREE.Mesh(counterGeometry, counterMaterial);
counter.position.y = 0.5;
scene.add(counter);

// Ingredient definitions
const ingredients = {
    'bottomBun': { geometry: new THREE.SphereGeometry(1, 32, 16), material: new THREE.MeshBasicMaterial({ color: 0x8B4513 }), height: 1 },
    'patty': { geometry: new THREE.CylinderGeometry(1, 1, 0.2, 32), material: new THREE.MeshBasicMaterial({ color: 0x654321 }), height: 0.2 },
    'cheese': { geometry: new THREE.BoxGeometry(1.5, 0.1, 1.5), material: new THREE.MeshBasicMaterial({ color: 0xFFD700 }), height: 0.1 },
    'lettuce': { geometry: new THREE.PlaneGeometry(1.5, 1.5), material: new THREE.MeshBasicMaterial({ color: 0x00FF00, side: THREE.DoubleSide }), height: 0.1 },
    'tomato': { geometry: new THREE.CylinderGeometry(1, 1, 0.1, 32), material: new THREE.MeshBasicMaterial({ color: 0xFF0000 }), height: 0.1 },
    'topBun': { geometry: new THREE.SphereGeometry(1, 32, 16), material: new THREE.MeshBasicMaterial({ color: 0x8B4513 }), height: 1 }
};

// Selectable ingredients
const selectableIngredients = [];
const ingredientTypes = Object.keys(ingredients);
ingredientTypes.forEach((type, index) => {
    const ingredient = new THREE.Mesh(ingredients[type].geometry, ingredients[type].material);
    ingredient.position.set(-5 + index * 2, 1.5, -5);
    ingredient.userData.type = type;
    scene.add(ingredient);
    selectableIngredients.push(ingredient);
});

// Player's burger stack
let stack = [];
let stackHeight = 1; // Start above counter
const stackGroup = new THREE.Group();
stackGroup.position.set(0, 0, 0);
scene.add(stackGroup);

// Target stack (customer's order)
let targetStack = [];
const targetGroup = new THREE.Group();
targetGroup.position.set(5, 1, -5);
scene.add(targetGroup);

// Serve button
const serveGeometry = new THREE.BoxGeometry(1, 0.5, 1);
const serveMaterial = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
const serveButton = new THREE.Mesh(serveGeometry, serveMaterial);
serveButton.position.set(0, 1.25, 4);
serveButton.userData.isServeButton = true;
scene.add(serveButton);

// Game state
let score = 0;
let timeLeft = 30; // Seconds per order
let gameActive = true;

// UI elements
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
function updateUI() {
    scoreElement.textContent = `Score: ${score}`;
    timerElement.textContent = `Time Left: ${timeLeft.toFixed(1)}s`;
}

// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Click handler
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

// Add ingredient to stack
function addIngredient(type) {
    const ingredientData = ingredients[type];
    const ingredient = new THREE.Mesh(ingredientData.geometry, ingredientData.material);
    ingredient.position.y = stackHeight + ingredientData.height / 2;
    stackGroup.add(ingredient);
    stack.push(type);
    stackHeight += ingredientData.height;
    // Animation effect
    ingredient.scale.set(0.1, 0.1, 0.1);
    new TWEEN.Tween(ingredient.scale)
        .to({ x: 1, y: 1, z: 1 }, 200)
        .easing(TWEEN.Easing.Bounce.Out)
        .start();
}

// Remove top ingredient
function removeTopIngredient() {
    if (stack.length > 0) {
        const topIngredient = stackGroup.children[stackGroup.children.length - 1];
        stackHeight -= ingredients[stack.pop()].height;
        stackGroup.remove(topIngredient);
    }
}

// Generate random order
function generateOrder() {
    targetStack = ['bottomBun'];
    const middleIngredients = ['patty', 'cheese', 'lettuce', 'tomato'];
    const numMiddle = Math.min(Math.floor(score / 10) + 1, 4); // Increase complexity with score
    for (let i = 0; i < numMiddle; i++) {
        const randomIngredient = middleIngredients[Math.floor(Math.random() * middleIngredients.length)];
        targetStack.push(randomIngredient);
    }
    targetStack.push('topBun');
    buildTargetStack();
    timeLeft = 30; // Reset timer
}

// Build target stack
function buildTargetStack() {
    while (targetGroup.children.length > 0) {
        targetGroup.remove(targetGroup.children[0]);
    }
    let height = 0;
    targetStack.forEach(type => {
        const ingredientData = ingredients[type];
        const ingredient = new THREE.Mesh(ingredientData.geometry, ingredientData.material);
        ingredient.position.y = height + ingredientData.height / 2;
        targetGroup.add(ingredient);
        height += ingredientData.height;
    });
}

// Serve burger and check result
function serveBurger() {
    if (JSON.stringify(stack) === JSON.stringify(targetStack)) {
        score += Math.floor(100 + timeLeft * 5); // Base points + time bonus
        console.log('Burger served correctly! +', Math.floor(100 + timeLeft * 5), 'points');
        resetBurger();
        generateOrder();
    } else {
        score -= 50;
        console.log('Wrong burger! -50 points');
        resetBurger();
    }
}

// Reset burger stack
function resetBurger() {
    stack = [];
    stackHeight = 1;
    while (stackGroup.children.length > 0) {
        stackGroup.remove(stackGroup.children[0]);
    }
}

// Fun mechanic: Customer changes order
function maybeChangeOrder() {
    if (Math.random() < 0.1 && stack.length > 0 && timeLeft > 10) { // 10% chance if time remains
        const middleIngredients = ['patty', 'cheese', 'lettuce', 'tomato'];
        const extra = middleIngredients[Math.floor(Math.random() * middleIngredients.length)];
        targetStack.splice(targetStack.length - 1, 0, extra); // Add before top bun
        buildTargetStack();
        console.log('Customer changed their mind! Added', extra);
    }
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

    TWEEN.update(time); // Pass time to TWEEN.update for consistency
    controls.update();
    renderer.render(scene, camera);
}

// Start game
generateOrder();
animate(0);

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});