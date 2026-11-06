
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("score");
const bestDisplay = document.getElementById("best");
const levelDisplay = document.getElementById("level");
const livesDisplay = document.getElementById("lives");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const restartButton = document.getElementById("restartButton");

let width = 0;
let height = 0;
let animationId;
let lastTime = 0;
let spawnTimer = 0;

let score = 0;
let best = Number(localStorage.getItem("neonCollectorBest")) || 0;
let lives = 3;
let level = 1;

let gameRunning = false;
let gamePaused = false;

let objects = [];
let particles = [];

const keys = {};

const player = {
  x: 0,
  y: 0,
  size: 22,
  speed: 420
};

bestDisplay.textContent = best;

/* RESIZE CANVAS */

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;

  width = rect.width;
  height = rect.height;

  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  player.x = Math.max(0, Math.min(player.x, width - player.size));
  player.y = Math.max(0, Math.min(player.y, height - player.size));

  drawGame();
}

window.addEventListener("resize", resizeCanvas);

/* UPDATE SCOREBOARD */

function updateStats() {
  scoreDisplay.textContent = score;
  bestDisplay.textContent = best;
  levelDisplay.textContent = level;
  livesDisplay.textContent = `${lives} / 3`;
}

/* RESET GAME */

function resetGame() {
  score = 0;
  lives = 3;
  level = 1;
  spawnTimer = 0;

  objects = [];
  particles = [];

  player.x = width / 2 - player.size / 2;
  player.y = height - 60;

  updateStats();
  drawGame();
}

/* START GAME */

function startGame() {
  cancelAnimationFrame(animationId);

  resetGame();

  gameRunning = true;
  gamePaused = false;

  overlay.style.display = "none";
  pauseButton.textContent = "PAUSE";

  lastTime = performance.now();

  animationId = requestAnimationFrame(gameLoop);
}

/* PAUSE GAME */

function pauseGame() {
  if (!gameRunning) return;

  gamePaused = !gamePaused;

  if (gamePaused) {
    cancelAnimationFrame(animationId);

    overlayTitle.textContent = "PAUSED";
    overlayMessage.textContent =
      "Take a break. Resume when you are ready.";

    startButton.textContent = "RESUME";
    overlay.style.display = "flex";
    pauseButton.textContent = "RESUME";
  } else {
    overlay.style.display = "none";
    pauseButton.textContent = "PAUSE";

    lastTime = performance.now();
    animationId = requestAnimationFrame(gameLoop);
  }
}

/* END GAME */

function endGame() {
  gameRunning = false;
  gamePaused = false;

  cancelAnimationFrame(animationId);

  if (score > best) {
    best = score;
    localStorage.setItem("neonCollectorBest", best);
  }

  updateStats();

  overlayTitle.textContent = "GAME OVER";
  overlayMessage.textContent = `Your final score is ${score}.`;

  startButton.textContent = "PLAY AGAIN";
  overlay.style.display = "flex";

  pauseButton.textContent = "PAUSE";
}

/* CREATE FALLING OBJECTS */

function createObject() {
  const type = Math.random() < 0.65 ? "star" : "bomb";
  const size = type === "star" ? 14 : 17;

  objects.push({
    type,
    x: size + Math.random() * (width - size * 2),
    y: -size,
    size,
    speed: 220 + level * 25 + Math.random() * 70,
    rotation: 0
  });
}

/* CREATE PARTICLES */

function createParticles(x, y, color) {
  for (let i = 0; i < 6; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 180,
      vy: (Math.random() - 0.5) * 180,
      life: 0.3,
      color
    });
  }
}

/* UPDATE PARTICLES */

function updateParticles(deltaTime) {
  particles.forEach(particle => {
    particle.x += particle.vx * deltaTime;
    particle.y += particle.vy * deltaTime;
    particle.life -= deltaTime;
  });

  particles = particles.filter(particle => particle.life > 0);
}

/* UPDATE GAME */

function update(deltaTime) {
  const movement = player.speed * deltaTime;

  // PLAYER MOVEMENT

  if (keys.ArrowLeft || keys.a) player.x -= movement;
  if (keys.ArrowRight || keys.d) player.x += movement;
  if (keys.ArrowUp || keys.w) player.y -= movement;
  if (keys.ArrowDown || keys.s) player.y += movement;

  player.x = Math.max(0, Math.min(width - player.size, player.x));
  player.y = Math.max(0, Math.min(height - player.size, player.y));

  // SPAWN OBJECTS

  spawnTimer += deltaTime;

  const spawnDelay = Math.max(0.18, 0.48 - level * 0.015);

  if (spawnTimer >= spawnDelay) {
    createObject();
    spawnTimer = 0;
  }

  const remainingObjects = [];

  // MOVE AND CHECK OBJECTS

  for (const object of objects) {
    object.y += object.speed * deltaTime;
    object.rotation += deltaTime * 4;

    const distanceX = Math.abs(
      player.x + player.size / 2 - object.x
    );

    const distanceY = Math.abs(
      player.y + player.size / 2 - object.y
    );

    const collision =
      distanceX < player.size / 2 + object.size * 0.65 &&
      distanceY < player.size / 2 + object.size * 0.65;

    if (collision) {

      if (object.type === "star") {
        // STARS GIVE 10 POINTS

        score += 10;

        // LEVEL INCREASES EVERY 100 POINTS

        level = Math.floor(score / 100) + 1;

        createParticles(object.x, object.y, "#ffe44d");

        // UPDATE BEST SCORE DURING GAMEPLAY

        if (score > best) {
          best = score;
          localStorage.setItem("neonCollectorBest", best);
        }

      } else {
        // BOMBS REMOVE ONE LIFE

        lives--;

        createParticles(object.x, object.y, "#ff287c");

        if (lives <= 0) {
          objects = [];
          endGame();
          return;
        }
      }

      continue;
    }

    if (object.y < height + object.size) {
      remainingObjects.push(object);
    }
  }

  objects = remainingObjects;

  updateParticles(deltaTime);
  updateStats();
}

/* DRAW BACKGROUND */

function drawBackground() {
  ctx.fillStyle = "#090b19";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(0, 247, 255, 0.06)";

  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

/* DRAW PLAYER */

function drawPlayer() {
  const centerX = player.x + player.size / 2;
  const centerY = player.y + player.size / 2;

  ctx.save();

  ctx.fillStyle = "#00f7ff";
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#00f7ff";

  ctx.beginPath();
  ctx.moveTo(centerX, player.y);
  ctx.lineTo(player.x + player.size, centerY);
  ctx.lineTo(centerX, player.y + player.size);
  ctx.lineTo(player.x, centerY);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/* DRAW STARS AND BOMBS */

function drawObject(object) {
  ctx.save();

  ctx.translate(object.x, object.y);
  ctx.rotate(object.rotation);

  if (object.type === "star") {
    ctx.fillStyle = "#ffe44d";
    ctx.shadowColor = "#ffe44d";
    ctx.shadowBlur = 18;

    ctx.beginPath();

    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0
        ? object.size
        : object.size / 2;

      const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;

      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.fill();

  } else {
    ctx.fillStyle = "#ff287c";
    ctx.shadowColor = "#ff287c";
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.arc(0, 0, object.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/* DRAW PARTICLES */

function drawParticles() {
  particles.forEach(particle => {
    ctx.save();

    ctx.globalAlpha = Math.max(0, particle.life / 0.3);
    ctx.fillStyle = particle.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = particle.color;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

/* DRAW EVERYTHING */

function drawGame() {
  if (!width || !height) return;

  drawBackground();

  objects.forEach(drawObject);

  drawParticles();

  drawPlayer();
}

/* GAME LOOP */

function gameLoop(currentTime) {
  if (!gameRunning || gamePaused) return;

  const deltaTime = Math.min(
    (currentTime - lastTime) / 1000,
    0.05
  );

  lastTime = currentTime;

  update(deltaTime);

  if (!gameRunning) return;

  drawGame();

  animationId = requestAnimationFrame(gameLoop);
}

/* BUTTON EVENTS */

startButton.addEventListener("click", () => {
  if (gamePaused) {
    pauseGame();
  } else {
    startGame();
  }
});

pauseButton.addEventListener("click", pauseGame);

restartButton.addEventListener("click", startGame);

/* KEYBOARD CONTROLS */

window.addEventListener("keydown", event => {
  const key = event.key.length === 1
    ? event.key.toLowerCase()
    : event.key;

  keys[key] = true;

  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "]
      .includes(event.key)
  ) {
    event.preventDefault();
  }

  if (event.key === "Escape" && gameRunning) {
    pauseGame();
  }
});

window.addEventListener("keyup", event => {
  const key = event.key.length === 1
    ? event.key.toLowerCase()
    : event.key;

  keys[key] = false;
});

/* MOBILE TOUCH CONTROLS */

let dragging = false;

canvas.addEventListener("pointerdown", event => {
  if (!gameRunning || gamePaused) return;

  dragging = true;

  canvas.setPointerCapture(event.pointerId);

  movePlayer(event);
});

canvas.addEventListener("pointermove", event => {
  if (dragging) {
    movePlayer(event);
  }
});

canvas.addEventListener("pointerup", () => {
  dragging = false;
});

canvas.addEventListener("pointercancel", () => {
  dragging = false;
});

/* MOVE PLAYER WITH TOUCH */

function movePlayer(event) {
  const rect = canvas.getBoundingClientRect();

  player.x = event.clientX - rect.left - player.size / 2;
  player.y = event.clientY - rect.top - player.size / 2;

  player.x = Math.max(0, Math.min(width - player.size, player.x));
  player.y = Math.max(0, Math.min(height - player.size, player.y));
}

/* INITIAL SCREEN */

resizeCanvas();
resetGame();

overlayTitle.textContent = "HOW TO PLAY";
overlayMessage.textContent = "Welcome to Neon Collector!";
startButton.textContent = "START GAME";
overlay.style.display = "flex";

drawGame();
