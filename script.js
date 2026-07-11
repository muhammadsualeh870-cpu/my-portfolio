// --- THEME SWITCHER ---
const themeToggleBtn = document.getElementById('themeToggle');
const sunIcon = themeToggleBtn.querySelector('.sun-icon');
const moonIcon = themeToggleBtn.querySelector('.moon-icon');

// Check cached theme or fallback to dark
const cachedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', cachedTheme);
updateThemeIcons(cachedTheme);

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcons(newTheme);
});

function updateThemeIcons(theme) {
    if (theme === 'light') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

// --- TYPEWRITER EFFECT ---
const typewriterText = document.getElementById('typewriter');
const roles = ['Unity Game Developer', 'Software Engineering Student', 'C# Programming Enthusiast'];
let roleIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingSpeed = 100;

function type() {
    const currentRole = roles[roleIndex];
    
    if (isDeleting) {
        typewriterText.textContent = currentRole.substring(0, charIndex - 1);
        charIndex--;
        typingSpeed = 50; // speed up deleting
    } else {
        typewriterText.textContent = currentRole.substring(0, charIndex + 1);
        charIndex++;
        typingSpeed = 100;
    }
    
    if (!isDeleting && charIndex === currentRole.length) {
        typingSpeed = 1500; // Pause at end of word
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        typingSpeed = 500; // Pause before typing next word
    }
    
    setTimeout(type, typingSpeed);
}

// Start Typewriter
if (typewriterText) {
    setTimeout(type, 500);
}

// --- SCROLL REVEAL ANIMATION ---
const revealElements = document.querySelectorAll('.reveal');

const revealOnScroll = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target); // only reveal once
        }
    });
}, {
    threshold: 0.15
});

revealElements.forEach(el => revealOnScroll.observe(el));

// --- 2D BALL CATCHER CANVAS GAME ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM elements for game HUD and Overlays
const hudScore = document.getElementById('hudScore');
const hudLives = document.getElementById('hudLives');
const hudHighScore = document.getElementById('hudHighScore');
const overlayStart = document.getElementById('overlayStart');
const overlayGameOver = document.getElementById('overlayGameOver');
const finalScoreVal = document.getElementById('finalScoreVal');

const btnStartGame = document.getElementById('btnStartGame');
const btnRestartGame = document.getElementById('btnRestartGame');
const btnPauseGame = document.getElementById('btnPauseGame');
const btnMoveLeft = document.getElementById('btnMoveLeft');
const btnMoveRight = document.getElementById('btnMoveRight');

const playGameBtn = document.getElementById('playGameBtn');
const gameCabinet = document.getElementById('gameCabinet');

// Game state
let score = 0;
let lives = 3;
let highScore = parseInt(localStorage.getItem('ballCatcherHighScore')) || 0;
let gameActive = false;
let gamePaused = false;
let animationFrameId = null;

// Game Config
const BASKET_WIDTH = 90;
const BASKET_HEIGHT = 16;
const BASKET_SPEED = 8;

let basket = {
    x: canvas.width / 2,
    y: canvas.height - 40,
    width: BASKET_WIDTH,
    height: BASKET_HEIGHT
};

let keys = {
    ArrowLeft: false,
    ArrowRight: false
};

// Touch / Button controller indicators
let autoMoveDirection = 0; // -1 for left, 1 for right, 0 for stop

let items = [];
let particles = [];
let shakeTime = 0;
let baseSpawnInterval = 1200; // ms
let lastSpawnTime = 0;
let level = 1;

// Load High Score to HUD
hudHighScore.textContent = pad(highScore, 4);

// Scroll down and show game when clicking "Play Demo"
playGameBtn.addEventListener('click', () => {
    gameCabinet.classList.add('visible');
    gameCabinet.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Auto start game or focus
    setTimeout(() => {
        gameCabinet.style.boxShadow = '0 20px 50px rgba(99, 102, 241, 0.6)';
        setTimeout(() => {
            gameCabinet.style.boxShadow = '';
        }, 1500);
    }, 800);
});

// Setup Keyboard Inputs
window.addEventListener('keydown', (e) => {
    if (e.key in keys) {
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key in keys) {
        keys[e.key] = false;
    }
});

// Touch / Button controllers
btnMoveLeft.addEventListener('mousedown', () => autoMoveDirection = -1);
btnMoveLeft.addEventListener('mouseup', () => autoMoveDirection = 0);
btnMoveLeft.addEventListener('mouseleave', () => autoMoveDirection = 0);
btnMoveLeft.addEventListener('touchstart', (e) => { e.preventDefault(); autoMoveDirection = -1; });
btnMoveLeft.addEventListener('touchend', () => autoMoveDirection = 0);

btnMoveRight.addEventListener('mousedown', () => autoMoveDirection = 1);
btnMoveRight.addEventListener('mouseup', () => autoMoveDirection = 0);
btnMoveRight.addEventListener('mouseleave', () => autoMoveDirection = 0);
btnMoveRight.addEventListener('touchstart', (e) => { e.preventDefault(); autoMoveDirection = 1; });
btnMoveRight.addEventListener('touchend', () => autoMoveDirection = 0);

// Mouse and Touch dragging inside canvas
canvas.addEventListener('mousemove', (e) => {
    if (!gameActive || gamePaused) return;
    const rect = canvas.getBoundingClientRect();
    const root = document.documentElement;
    
    // Scale position correctly based on canvas bounding rect
    const mouseX = e.clientX - rect.left;
    const canvasWidthScale = canvas.width / rect.width;
    basket.x = mouseX * canvasWidthScale;
    keepBasketInBounds();
});

canvas.addEventListener('touchmove', (e) => {
    if (!gameActive || gamePaused) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mouseX = touch.clientX - rect.left;
    const canvasWidthScale = canvas.width / rect.width;
    basket.x = mouseX * canvasWidthScale;
    keepBasketInBounds();
    e.preventDefault(); // Prevent page scrolling while playing
}, { passive: false });

function keepBasketInBounds() {
    if (basket.x < basket.width / 2) {
        basket.x = basket.width / 2;
    }
    if (basket.x > canvas.width - basket.width / 2) {
        basket.x = canvas.width - basket.width / 2;
    }
}

// Game triggers
btnStartGame.addEventListener('click', startGame);
btnRestartGame.addEventListener('click', startGame);
btnPauseGame.addEventListener('click', togglePause);

function startGame() {
    overlayStart.classList.add('hidden');
    overlayGameOver.classList.add('hidden');
    
    score = 0;
    lives = 3;
    level = 1;
    items = [];
    particles = [];
    shakeTime = 0;
    basket.x = canvas.width / 2;
    
    updateHUD();
    gameActive = true;
    gamePaused = false;
    lastSpawnTime = Date.now();
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    gameLoop();
}

function togglePause() {
    if (!gameActive) return;
    gamePaused = !gamePaused;
    btnPauseGame.textContent = gamePaused ? "Resume" : "Pause";
    
    if (!gamePaused) {
        lastSpawnTime = Date.now(); // reset spawn timer
        gameLoop();
    }
}

function endGame() {
    gameActive = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    // Save High Score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('ballCatcherHighScore', highScore);
        hudHighScore.textContent = pad(highScore, 4);
    }
    
    finalScoreVal.textContent = score;
    overlayGameOver.classList.remove('hidden');
}

// Core Game Loop
function gameLoop() {
    if (!gameActive || gamePaused) return;
    
    update();
    draw();
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Spawn Items
function spawnItem() {
    const r = Math.random();
    let type = 'normal';
    let color = '#22c55e'; // Green
    
    if (r < 0.2) {
        type = 'powerup';
        color = '#3b82f6'; // Blue
    } else if (r > 0.8) {
        type = 'bomb';
        color = '#ef4444'; // Red
    }
    
    const x = Math.random() * (canvas.width - 40) + 20;
    const speed = (Math.random() * 2 + 2) + (level * 0.4); // increases with level
    
    items.push({
        x: x,
        y: -15,
        radius: type === 'normal' ? 8 : (type === 'powerup' ? 6 : 10),
        speed: speed,
        type: type,
        color: color
    });
}

// Particle generator
function createExplosion(x, y, color) {
    const count = 12;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 3 + 1,
            color: color,
            alpha: 1,
            decay: Math.random() * 0.03 + 0.02
        });
    }
}

// Update game entities
function update() {
    // Keyboard basket movement
    if (keys.ArrowLeft) {
        basket.x -= BASKET_SPEED;
    }
    if (keys.ArrowRight) {
        basket.x += BASKET_SPEED;
    }
    
    // Auto Move from UI Buttons
    if (autoMoveDirection !== 0) {
        basket.x += autoMoveDirection * BASKET_SPEED;
    }
    
    keepBasketInBounds();
    
    // Dynamic Leveling based on score
    level = Math.floor(score / 100) + 1;
    let spawnRate = Math.max(500, baseSpawnInterval - (level * 80));
    
    // Spawning timer
    const now = Date.now();
    if (now - lastSpawnTime > spawnRate) {
        spawnItem();
        lastSpawnTime = now;
    }
    
    // Screen shake update
    if (shakeTime > 0) {
        shakeTime--;
    }
    
    // Update items
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.y += item.speed;
        
        // Basket Collision
        const halfW = basket.width / 2;
        const insideX = item.x >= (basket.x - halfW) && item.x <= (basket.x + halfW);
        const insideY = (item.y + item.radius >= basket.y) && (item.y - item.radius <= basket.y + basket.height);
        
        if (insideX && insideY) {
            // Collision caught!
            createExplosion(item.x, item.y, item.color);
            
            if (item.type === 'normal') {
                score += 10;
            } else if (item.type === 'powerup') {
                score += 25;
            } else if (item.type === 'bomb') {
                lives--;
                shakeTime = 15; // Trigger screen shake
            }
            
            updateHUD();
            items.splice(i, 1);
            
            if (lives <= 0) {
                endGame();
            }
            continue;
        }
        
        // Bottom Boundary check
        if (item.y - item.radius > canvas.height) {
            // Let a good ball drop? Drop a life!
            if (item.type !== 'bomb') {
                lives--;
                shakeTime = 15; // shake screen slightly
                updateHUD();
                if (lives <= 0) {
                    endGame();
                }
            }
            items.splice(i, 1);
        }
    }
    
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Render game entities
function draw() {
    ctx.save();
    
    // Screen Shake Implementation
    if (shakeTime > 0) {
        const dx = (Math.random() - 0.5) * 8;
        const dy = (Math.random() - 0.5) * 8;
        ctx.translate(dx, dy);
    }
    
    // Clear screen
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw Grid Lines (Arcade Visual Style)
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw Items
    items.forEach(item => {
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        
        // Add glow to falling balls
        ctx.shadowBlur = 10;
        ctx.shadowColor = item.color;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
    });
    
    // Draw Particles
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
    });
    
    // Draw Basket
    const bLeft = basket.x - basket.width / 2;
    
    // Retro glow styling for the basket
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#6366f1';
    
    // Main basket shell
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.roundRect(bLeft, basket.y, basket.width, basket.height, 6);
    ctx.fill();
    
    // Basket highlights
    ctx.shadowBlur = 0; // reset
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(bLeft + 10, basket.y + 4, basket.width - 20, 3);
    
    ctx.restore();
}

// Helpers
function updateHUD() {
    hudScore.textContent = pad(score, 4);
    hudLives.textContent = '❤'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
}

function pad(num, size) {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}
