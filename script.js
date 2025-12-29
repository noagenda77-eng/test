const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const overlayButton = document.getElementById("overlay-button");

const gameState = {
  running: false,
  started: false,
  gameOver: false,
  score: 0,
  highScore: 0,
  lastTime: 0,
};

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
  radius: 18,
  velocity: 0,
  rotation: 0,
};

let pipes = [];
let animationFrameId = null;

const resetGame = () => {
  gameState.running = false;
  gameState.started = false;
  gameState.gameOver = false;
  gameState.score = 0;
  gameState.lastTime = 0;
  bird.y = canvas.height / 2;
  bird.velocity = 0;
  bird.rotation = 0;
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
    hideOverlay();
    animationFrameId = requestAnimationFrame(loop);
  }
};

const endGame = () => {
  gameState.running = false;
  gameState.gameOver = true;
  gameState.highScore = Math.max(gameState.highScore, gameState.score);
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
  }
};

const handleInput = (event) => {
  if (event.type === "keydown" && event.code !== "Space") {
    return;
  }
  event.preventDefault();
  if (gameState.gameOver) {
    resetGame();
    startGame();
  } else {
    flap();
  }
};

const update = (deltaSeconds) => {
  bird.velocity += world.gravity * deltaSeconds;
  bird.y += bird.velocity * deltaSeconds;
  bird.rotation = Math.min(Math.max(bird.velocity / 600, -0.5), 1.1);

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
  ctx.fillStyle = "#f9c74f";
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f9844a";
  ctx.beginPath();
  ctx.moveTo(bird.radius - 2, 2);
  ctx.lineTo(bird.radius + 10, 6);
  ctx.lineTo(bird.radius - 2, 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(-4, -4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const draw = () => {
  drawBackground();
  drawPipes();
  drawBird();
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

document.addEventListener("keydown", handleInput);
canvas.addEventListener("pointerdown", handleInput);

resetGame();
draw();
