(function () {
  const UNLOCK_SCORE = 10;
  const LOCKED_IDS = ["about", "skills", "contact", "education"];
  const UNLOCK_KEY = "portfolioUnlocked";
  const BEST_KEY = "flappyBest";

  let unlocked = false;
  try {
    unlocked = localStorage.getItem(UNLOCK_KEY) === "true";
  } catch (e) {}

  /* ----- Small API used by style.js ----- */
  window.portfolioGame = {
    isLocked: () => !unlocked,
    showLockedHint: () => {
      const hint = document.getElementById("gameHint");
      if (!hint) return;
      hint.textContent =
        "🔒 Score " + UNLOCK_SCORE + " to unlock About, Skills, Education and Contact!";
      hint.classList.remove("pulse");
      void hint.offsetWidth; // restart animation
      hint.classList.add("pulse");
    },
  };

  function applyLockState() {
    LOCKED_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle("locked", !unlocked);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();

    /* ---------- Build the game section (right after Home) ---------- */
    const section = document.createElement("section");
    section.className = "game-section";
    section.id = "game";
    section.innerHTML = `
      <h2 class="title"><span>Play to Unlock</span></h2>
      <p class="game-hint" id="gameHint"></p>
      <canvas id="gameCanvas" width="400" height="600"></canvas>
      <p class="game-help">Click, tap, or press Space to flap</p>
      <button class="game-btn" id="gameUnlockBtn" hidden>View My Portfolio ↓</button>
    `;
    const home = document.querySelector("section.home");
    home.insertAdjacentElement("afterend", section);

    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const unlockBtn = document.getElementById("gameUnlockBtn");
    const hint = document.getElementById("gameHint");

    function updateHint() {
      hint.textContent = unlocked
        ? "✅ Unlocked! Keep playing for fun, or scroll down."
        : "Score " + UNLOCK_SCORE + " points to reveal my About, Skills, Education and Contact!";
    }
    updateHint();
    applyLockState();

    /* ---------- Game constants ---------- */
    const W = 400, H = 600, GROUND = 60;
    const BIRD_X = 90, R = 14;
    const GRAVITY = 0.42, FLAP = -7.2, SPEED = 2.8;
    const GAP = 160, PIPE_W = 64, SPACING = 230;

    /* ---------- Game state ---------- */
    let state = "ready"; // ready | playing | over | won
    let bird, pipes, score, groundX, overAt;
    let best = 0;
    try {
      best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0;
    } catch (e) {}

    function reset() {
      bird = { y: (H - GROUND) / 2, v: 0 };
      pipes = [];
      score = 0;
      groundX = 0;
      state = "ready";
    }
    reset();

    function spawnPipe(x) {
      const minTop = 70;
      const maxTop = H - GROUND - GAP - 70;
      pipes.push({
        x,
        top: minTop + Math.random() * (maxTop - minTop),
        passed: false,
      });
    }

    function flap() {
      if (state === "ready") {
        state = "playing";
        bird.v = FLAP;
      } else if (state === "playing") {
        bird.v = FLAP;
      } else if (state === "over" && performance.now() - overAt > 400) {
        reset();
      }
    }

    function die() {
      state = "over";
      overAt = performance.now();
    }

    function win() {
      state = "won";
      unlocked = true;
      try {
        localStorage.setItem(UNLOCK_KEY, "true");
      } catch (e) {}
      applyLockState();
      updateHint();
      unlockBtn.hidden = false;
    }

    /* ---------- Input ---------- */
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      flap();
    });

    function gameInView() {
      const r = section.getBoundingClientRect();
      return r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.4;
    }

    document.addEventListener("keydown", (e) => {
      if (e.code !== "Space" && e.code !== "ArrowUp") return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const modal = document.getElementById("authModal");
      if (modal && modal.classList.contains("open")) return;
      if (!gameInView()) return;
      e.preventDefault();
      flap();
    });

    unlockBtn.addEventListener("click", () => {
      const about = document.getElementById("about");
      if (about) {
        const header = document.querySelector("header");
        const offset = header ? header.offsetHeight + 20 : 0;
        window.scrollTo({
          top: about.getBoundingClientRect().top + window.scrollY - offset,
          behavior: "smooth",
        });
      }
    });

    /* ---------- Update ---------- */
    function update(dt) {
      if (state === "ready") {
        bird.y = (H - GROUND) / 2 + Math.sin(performance.now() / 250) * 8;
        groundX = (groundX - SPEED * dt) % 24;
        return;
      }
      if (state !== "playing") return;

      bird.v += GRAVITY * dt;
      bird.y += bird.v * dt;
      groundX = (groundX - SPEED * dt) % 24;

      // Spawn pipes
      const last = pipes[pipes.length - 1];
      if (!last) spawnPipe(W + 80);
      else if (last.x < W - SPACING + 0) spawnPipe(last.x + SPACING);

      pipes.forEach((p) => {
        p.x -= SPEED * dt;
        if (!p.passed && p.x + PIPE_W < BIRD_X - R) {
          p.passed = true;
          score++;
          if (score > best) {
            best = score;
            try {
              localStorage.setItem(BEST_KEY, String(best));
            } catch (e) {}
          }
        }
      });
      pipes = pipes.filter((p) => p.x + PIPE_W > -10);

      // Win!
      if (score >= UNLOCK_SCORE) {
        win();
        return;
      }

      // Ceiling / ground
      if (bird.y - R < 0) {
        bird.y = R;
        bird.v = 0;
      }
      if (bird.y + R >= H - GROUND) {
        bird.y = H - GROUND - R;
        return die();
      }

      // Pipes
      for (const p of pipes) {
        const hitX = BIRD_X + R > p.x && BIRD_X - R < p.x + PIPE_W;
        if (hitX && (bird.y - R < p.top || bird.y + R > p.top + GAP)) {
          return die();
        }
      }
    }

    /* ---------- Draw ---------- */
    function drawPipe(p) {
      const capH = 22, capExtra = 5;
      ctx.fillStyle = "#1a1aff";
      ctx.strokeStyle = "#8c8cff";
      ctx.lineWidth = 2;

      // top pipe
      ctx.fillRect(p.x, 0, PIPE_W, p.top - capH);
      ctx.strokeRect(p.x, 0, PIPE_W, p.top - capH);
      ctx.fillRect(p.x - capExtra, p.top - capH, PIPE_W + capExtra * 2, capH);
      ctx.strokeRect(p.x - capExtra, p.top - capH, PIPE_W + capExtra * 2, capH);

      // bottom pipe
      const by = p.top + GAP;
      ctx.fillRect(p.x, by + capH, PIPE_W, H - GROUND - by - capH);
      ctx.strokeRect(p.x, by + capH, PIPE_W, H - GROUND - by - capH);
      ctx.fillRect(p.x - capExtra, by, PIPE_W + capExtra * 2, capH);
      ctx.strokeRect(p.x - capExtra, by, PIPE_W + capExtra * 2, capH);
    }

    function drawBird() {
      ctx.save();
      ctx.translate(BIRD_X, bird.y);
      const angle = Math.max(-0.5, Math.min(1.2, bird.v / 12));
      ctx.rotate(angle);

      // body
      ctx.fillStyle = "#ffd23f";
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      // wing
      ctx.fillStyle = "#f0a500";
      ctx.beginPath();
      ctx.ellipse(-4, 3, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // eye
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(6, -4, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(7.5, -4, 2, 0, Math.PI * 2);
      ctx.fill();
      // beak
      ctx.fillStyle = "#ff7a1a";
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(20, 3);
      ctx.lineTo(10, 7);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    function text(str, x, y, size, color) {
      ctx.font = "700 " + size + "px Poppins, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#000";
      ctx.strokeText(str, x, y);
      ctx.fillStyle = color || "#fff";
      ctx.fillText(str, x, y);
    }

    function draw() {
      // sky
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#02020f");
      g.addColorStop(1, "#0a0a4a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      pipes.forEach(drawPipe);

      // ground
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, H - GROUND, W, GROUND);
      ctx.fillStyle = "#1a1aff";
      ctx.fillRect(0, H - GROUND, W, 4);
      ctx.fillStyle = "#12125a";
      for (let x = groundX - 24; x < W; x += 24) {
        ctx.fillRect(x, H - GROUND + 14, 12, 6);
      }

      drawBird();

      // score
      text(String(score), W / 2, 70, 48);
      ctx.font = "500 14px Poppins, sans-serif";
      ctx.fillStyle = "#cfcfff";
      ctx.textAlign = "left";
      ctx.fillText("Best: " + best, 12, 24);
      ctx.textAlign = "right";
      ctx.fillText("Goal: " + UNLOCK_SCORE, W - 12, 24);

      if (state === "ready") {
        text("Tap to start", W / 2, H / 2 - 80, 30);
      } else if (state === "over") {
        text("Game Over", W / 2, H / 2 - 60, 36, "#ff6b6b");
        text("Score: " + score, W / 2, H / 2 - 18, 24);
        text("Tap to try again", W / 2, H / 2 + 24, 20);
      } else if (state === "won") {
        text("YOU WIN! 🎉", W / 2, H / 2 - 40, 38, "#4cd964");
        text("Portfolio unlocked!", W / 2, H / 2, 22);
      }
    }

    /* ---------- Main loop ---------- */
    let lastTime = performance.now();
    function loop(now) {
      const dt = Math.min((now - lastTime) / 16.667, 3); // 1 = one 60fps frame
      lastTime = now;
      update(dt);
      draw();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });

  /* ---------- Styles for the game section + locked sections ---------- */
  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .locked { display: none !important; }

      .game-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 100px 20px 60px;
        background: #000;
      }
      .game-section .title { text-align: center; margin-bottom: 20px; }
      .game-section .title span {
        position: relative;
        display: inline-block;
        color: #fff;
        font-size: 40px;
        font-weight: 700;
        padding-bottom: 10px;
      }
      .game-section .title span::before {
        content: "";
        position: absolute; left: 0; bottom: 0;
        width: 100%; height: 3px;
        background: #1a1aff; border-radius: 2px;
      }
      .game-section .title span::after {
        content: "";
        position: absolute; left: 50%; bottom: -8px;
        width: 70%; height: 3px;
        background: #1a1aff; border-radius: 2px;
        transform: translateX(-50%);
      }
      .game-hint {
        font-size: 16px;
        color: rgb(235, 230, 230);
        text-align: center;
        margin-bottom: 20px;
        max-width: 500px;
      }
      .game-hint.pulse { animation: hintPulse 0.8s ease 2; }
      @keyframes hintPulse {
        0%, 100% { transform: scale(1); color: rgb(235,230,230); }
        50% { transform: scale(1.08); color: #8c8cff; }
      }
      #gameCanvas {
        width: min(400px, 92vw, calc(70vh * 2 / 3));
        height: auto;
        aspect-ratio: 2 / 3;
        border: 3px solid #1a1aff;
        border-radius: 12px;
        box-shadow: 0 0 25px rgba(26, 26, 255, 0.5);
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
      }
      .game-help { margin-top: 14px; font-size: 14px; color: #aaa; }
      .game-btn {
        margin-top: 20px;
        padding: 12px 32px;
        background: #0000ff;
        color: #fff;
        font-size: 16px;
        font-weight: 600;
        border: 2px solid #0000ff;
        border-radius: 8px;
        cursor: pointer;
        transition: 0.3s ease;
      }
      .game-btn:hover { background: #1a1aff; box-shadow: 0 0 12px rgba(0,0,255,.6); }
      .game-btn[hidden] { display: none; }
    `;
    document.head.appendChild(style);
  }
})();
