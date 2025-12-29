const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const overlayButton = document.getElementById("overlay-button");
const leaderboardList = document.getElementById("leaderboard-list");
const leaderboardForm = document.getElementById("leaderboard-form");
const playerNameInput = document.getElementById("player-name");

const gameState = {
  running: false,
  started: false,
  gameOver: false,
  score: 0,
  highScore: 0,
  lastTime: 0,
  countdown: 0,
  countdownTime: 0,
};

const COUNTDOWN_STEP = 0.33;
const LEADERBOARD_KEY = "flappy-cheems-leaderboard";
const LEADERBOARD_LIMIT = 5;

const world = {
  gravity: 1800,
  flapStrength: -520,
  speed: 210,
  pipeGap: 170,
  pipeWidth: 70,
  pipeSpacing: 230,
  groundHeight: 110,
};

const bird = {
  x: 130,
  y: 300,
  radius: 26,
  velocity: 0,
  rotation: 0,
};

const getSpriteUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return window.SPRITE_URL || params.get("sprite") || "assets/doge-sprite.png";
};

const sprite = {
  image: new Image(),
  ready: false,
  frameCount: 3,
  frameIndex: 0,
  frameTime: 0,
  frameDuration: 0.12,
  frameWidth: 500,
  frameHeight: 606,
  displayWidth: 72,
  displayHeight: Math.round(72 * (606 / 500)),
};

const flapSound = new Audio("assets/bonk.wav");
flapSound.preload = "auto";
const crashSound = new Audio("assets/crash.wav");
crashSound.preload = "auto";

const getLeaderboard = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(LEADERBOARD_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    return [];
  }
};

const saveLeaderboard = (entries) => {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
};

const renderLeaderboard = () => {
  const entries = getLeaderboard();
  leaderboardList.innerHTML = "";
  if (entries.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.innerHTML = "<span>---</span><span>0</span>";
    leaderboardList.append(emptyItem);
    return;
  }
  entries.forEach((entry) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = entry.name;
    const score = document.createElement("span");
    score.textContent = entry.score.toString();
    item.append(name, score);
    leaderboardList.append(item);
  });
};

const qualifiesForLeaderboard = (score) => {
  const entries = getLeaderboard();
  if (entries.length < LEADERBOARD_LIMIT) {
    return true;
  }
  const lowestScore = entries[entries.length - 1]?.score ?? 0;
  return score > lowestScore;
};

const showLeaderboardForm = (show) => {
  if (show) {
    leaderboardForm.classList.add("leaderboard-form--visible");
    playerNameInput.value = "";
    playerNameInput.focus();
    overlayButton.disabled = true;
  } else {
    leaderboardForm.classList.remove("leaderboard-form--visible");
    overlayButton.disabled = false;
  }
};

const buildPlaceholderSprite = () => {
  const sheetCanvas = document.createElement("canvas");
  sheetCanvas.width = sprite.frameWidth * sprite.frameCount;
  sheetCanvas.height = sprite.frameHeight;
  const sheetCtx = sheetCanvas.getContext("2d");

  for (let frame = 0; frame < sprite.frameCount; frame += 1) {
    const offsetX = frame * sprite.frameWidth;
    const centerX = offsetX + sprite.frameWidth / 2;
    const centerY = sprite.frameHeight / 2;

    sheetCtx.fillStyle = "#f9c74f";
    sheetCtx.beginPath();
    sheetCtx.ellipse(centerX, centerY, 150, 180, 0, 0, Math.PI * 2);
    sheetCtx.fill();

    sheetCtx.fillStyle = "#f9844a";
    sheetCtx.beginPath();
    sheetCtx.moveTo(centerX + 140, centerY + 20);
    sheetCtx.lineTo(centerX + 230, centerY - 30 + frame * 15);
    sheetCtx.lineTo(centerX + 140, centerY - 10);
    sheetCtx.closePath();
    sheetCtx.fill();

    sheetCtx.fillStyle = "#22223b";
    sheetCtx.beginPath();
    sheetCtx.arc(centerX + 40, centerY - 40, 18, 0, Math.PI * 2);
    sheetCtx.fill();
  }

  return sheetCanvas.toDataURL("image/png");
};

let pipes = [];
let animationFrameId = null;

const placeholderSpriteUrl = buildPlaceholderSprite();
const spriteUrl = getSpriteUrl();
sprite.image.src = spriteUrl || placeholderSpriteUrl;
sprite.image.onload = () => {
  sprite.ready = true;
};
sprite.image.onerror = () => {
  if (sprite.image.src !== placeholderSpriteUrl) {
    sprite.image.src = placeholderSpriteUrl;
  }
};

const resetGame = () => {
  gameState.running = false;
  gameState.started = false;
  gameState.gameOver = false;
  gameState.score = 0;
  gameState.lastTime = 0;
  gameState.countdown = 0;
  gameState.countdownTime = 0;
  showLeaderboardForm(false);
  bird.y = canvas.height / 2;
  bird.velocity = 0;
  bird.rotation = 0;
  sprite.frameIndex = 0;
  sprite.frameTime = 0;
  pipes = createInitialPipes();
  updateScore(0);
  updateOverlay("Ready?", "Press Space or tap/click to start.", "Start");
};

const createInitialPipes = () => {
  const startX = canvas.width + 120;
  return Array.from({ length: 3 }, (_, index) =>
    createPipe(startX + index * world.pipeSpacing)
  );
};

const createPipe = (x) => {
  const minTop = 80;
  const maxTop = canvas.height - world.groundHeight - world.pipeGap - 80;
  const topHeight = Math.floor(
    minTop + Math.random() * (maxTop - minTop)
  );
  return {
    x,
    topHeight,
    passed: false,
  };
};

const updateScore = (nextScore) => {
  gameState.score = nextScore;
  scoreEl.textContent = nextScore.toString();
};

const updateOverlay = (title, message, buttonLabel) => {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  overlayButton.textContent = buttonLabel;
  overlay.classList.add("overlay--visible");
};

const hideOverlay = () => {
  overlay.classList.remove("overlay--visible");
};

const startGame = () => {
  if (!gameState.running) {
    gameState.running = true;
    gameState.started = true;
    gameState.gameOver = false;
    gameState.lastTime = performance.now();
    gameState.countdown = 3;
    gameState.countdownTime = 0;
    hideOverlay();
    animationFrameId = requestAnimationFrame(loop);
  }
};

const endGame = () => {
  if (gameState.gameOver) {
    return;
  }
  gameState.running = false;
  gameState.gameOver = true;
  gameState.countdown = 0;
  gameState.countdownTime = 0;
  crashSound.currentTime = 0;
  crashSound.play();
  gameState.highScore = Math.max(gameState.highScore, gameState.score);
  showLeaderboardForm(qualifiesForLeaderboard(gameState.score));
  updateOverlay(
    "Game Over",
    `Score: ${gameState.score} · Best: ${gameState.highScore}`,
    "Play Again"
  );
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
};

const flap = () => {
  if (!gameState.started) {
    startGame();
  }
  if (gameState.running) {
    bird.velocity = world.flapStrength;
    flapSound.currentTime = 0;
    flapSound.play();
  }
};

const handleInput = (event) => {
  if (event.type === "keydown" && event.code !== "Space") {
    return;
  }
  if (gameState.gameOver) {
    return;
  }
  event.preventDefault();
  if (gameState.started && gameState.countdown > 0) {
    return;
  }
  flap();
};

const update = (deltaSeconds) => {
  if (gameState.running && gameState.countdown > 0) {
    gameState.countdownTime += deltaSeconds;
    if (gameState.countdownTime >= COUNTDOWN_STEP) {
      gameState.countdownTime -= COUNTDOWN_STEP;
      gameState.countdown -= 1;
    }
    return;
  }
  bird.velocity += world.gravity * deltaSeconds;
  bird.y += bird.velocity * deltaSeconds;
  bird.rotation = Math.min(Math.max(bird.velocity / 600, -0.5), 1.1);

  if (gameState.running) {
    sprite.frameTime += deltaSeconds;
    if (sprite.frameTime >= sprite.frameDuration) {
      sprite.frameTime = 0;
      sprite.frameIndex = (sprite.frameIndex + 1) % sprite.frameCount;
    }
  }

  pipes.forEach((pipe) => {
    pipe.x -= world.speed * deltaSeconds;
    if (!pipe.passed && pipe.x + world.pipeWidth < bird.x) {
      pipe.passed = true;
      updateScore(gameState.score + 1);
    }
  });

  const lastPipe = pipes[pipes.length - 1];
  if (lastPipe.x < canvas.width - world.pipeSpacing) {
    pipes.push(createPipe(lastPipe.x + world.pipeSpacing));
  }

  if (pipes[0].x + world.pipeWidth < -50) {
    pipes.shift();
  }

  if (bird.y - bird.radius < 0) {
    bird.y = bird.radius;
    bird.velocity = 0;
  }

  const groundLevel = canvas.height - world.groundHeight;
  if (bird.y + bird.radius > groundLevel) {
    bird.y = groundLevel - bird.radius;
    endGame();
  }

  const collision = pipes.some((pipe) => {
    const pipeX = pipe.x;
    const topBottom = pipe.topHeight;
    const gapBottom = pipe.topHeight + world.pipeGap;
    const withinX =
      bird.x + bird.radius > pipeX && bird.x - bird.radius < pipeX + world.pipeWidth;
    const hitsTop = bird.y - bird.radius < topBottom;
    const hitsBottom = bird.y + bird.radius > gapBottom;
    return withinX && (hitsTop || hitsBottom);
  });

  if (collision) {
    endGame();
  }
};

const drawBackground = () => {
  ctx.fillStyle = "#6db6ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const horizon = canvas.height - world.groundHeight;
  ctx.fillStyle = "#d9f1ff";
  ctx.fillRect(0, 0, canvas.width, horizon);

  ctx.fillStyle = "#5bb26e";
  ctx.fillRect(0, horizon, canvas.width, world.groundHeight);

  ctx.fillStyle = "#4aa45f";
  for (let i = 0; i < canvas.width; i += 40) {
    ctx.fillRect(i + 10, horizon + 20, 20, 10);
  }
};

const drawPipes = () => {
  ctx.fillStyle = "#3d8d50";
  ctx.strokeStyle = "#2b6b3a";
  ctx.lineWidth = 4;

  pipes.forEach((pipe) => {
    ctx.beginPath();
    ctx.rect(pipe.x, 0, world.pipeWidth, pipe.topHeight);
    ctx.fill();
    ctx.stroke();

    const gapBottom = pipe.topHeight + world.pipeGap;
    ctx.beginPath();
    ctx.rect(pipe.x, gapBottom, world.pipeWidth, canvas.height - gapBottom);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#50a867";
    ctx.fillRect(pipe.x - 6, pipe.topHeight - 18, world.pipeWidth + 12, 18);
    ctx.fillRect(pipe.x - 6, gapBottom, world.pipeWidth + 12, 18);
    ctx.fillStyle = "#3d8d50";
  });
};

const drawBird = () => {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);
  if (sprite.ready) {
    const sx = sprite.frameIndex * sprite.frameWidth;
    const sy = 0;
    ctx.drawImage(
      sprite.image,
      sx,
      sy,
      sprite.frameWidth,
      sprite.frameHeight,
      -sprite.displayWidth / 2,
      -sprite.displayHeight / 2,
      sprite.displayWidth,
      sprite.displayHeight
    );
  } else {
    ctx.fillStyle = "#f9c74f";
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawCountdown = () => {
  if (!gameState.running || gameState.countdown <= 0) {
    return;
  }
  const progress = Math.min(
    gameState.countdownTime / COUNTDOWN_STEP,
    1
  );
  const scale = 0.6 + progress * 1.4;
  const alpha = Math.max(1 - progress, 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 96px 'Nunito', 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 12;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(scale, scale);
  ctx.fillText(gameState.countdown.toString(), 0, 0);
  ctx.restore();
};

const draw = () => {
  drawBackground();
  drawPipes();
  drawBird();
  drawCountdown();
};

const loop = (timestamp) => {
  const delta = Math.min((timestamp - gameState.lastTime) / 1000, 0.03);
  gameState.lastTime = timestamp;
  update(delta);
  draw();

  if (gameState.running) {
    animationFrameId = requestAnimationFrame(loop);
  }
};

overlayButton.addEventListener("click", () => {
  if (gameState.gameOver) {
    resetGame();
  }
  startGame();
});

leaderboardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = playerNameInput.value.trim().slice(0, 10);
  if (!name) {
    return;
  }
  const entries = getLeaderboard();
  entries.push({ name, score: gameState.score });
  entries.sort((a, b) => b.score - a.score);
  const trimmed = entries.slice(0, LEADERBOARD_LIMIT);
  saveLeaderboard(trimmed);
  renderLeaderboard();
  showLeaderboardForm(false);
});

document.addEventListener("keydown", handleInput);
canvas.addEventListener("pointerdown", handleInput);

resetGame();
draw();
renderLeaderboard();
