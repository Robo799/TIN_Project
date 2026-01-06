const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const titleScreen = document.getElementById("titleScreen");
const gameScreen = document.getElementById("gameScreen");
const scoreScreen = document.getElementById("scoreScreen");
const finalStats = document.getElementById("finalStats");
const backToTitleBtn = document.getElementById("backToTitleBtn");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const scoresToggleBtn = document.getElementById("scoresToggleBtn");

const musicToggle = document.getElementById("musicToggle");
const sfxToggle = document.getElementById("sfxToggle");

const submitPanel = document.getElementById("submitPanel");
const nameInput = document.getElementById("nameInput");
const submitBtn = document.getElementById("submitBtn");
const submitMsg = document.getElementById("submitMsg");

const highscoresBox = document.getElementById("highscores");
const highscoresList = document.getElementById("highscoresList");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");

const ASSETS = {
    player: new Image(),
    enemy: new Image(),
    over: new Image(),
};
ASSETS.player.src = "/images/player.png";
ASSETS.enemy.src = "/images/enemy.png";
ASSETS.over.src = "/images/over.png";

const audio = {
    music: new Audio("/images/music.mp3"),
    over: new Audio("/images/over.mp3"),
    near: new Audio("/images/near.mp3"),
};
audio.music.loop = true;
audio.music.volume = 0.2;
audio.over.volume = 0.5;
let nearBeepCooldownMs = 0;
const NEAR_DIST_PX = 120;
const NEAR_BEEP_MS = 500;

function safePlay(aud) {
    if (!aud) return;
    try {
        aud.currentTime = 0;
        aud.play().catch(() => {});
    } catch {}
}
function updateMusic() {
    if (!musicToggle || !audio.music || STATE.name !== "PLAY") return;
    if (musicToggle.checked) {
        audio.music.play().catch(() => {});
    } else {
        audio.music.pause();
        audio.music.currentTime = 0;
    }
}

function updateNearSfx(dt) {
    if (STATE.name !== "PLAY") return;
    if (sfxToggle && !sfxToggle.checked) return;

    nearBeepCooldownMs -= dt * 1000;
    if (nearBeepCooldownMs > 0) return;

    let minD = Infinity;
    for (const e of GAME.enemies) {
        const d = Math.hypot(GAME.player.x - e.x, GAME.player.y - e.y);
        if (d < minD) minD = d;
    }

    if (minD <= NEAR_DIST_PX) {
        const factor = clamp(minD / NEAR_DIST_PX, 0.2, 1.0);
        if (audio.near) audio.near.volume = 0.15 + (1 - factor) * 0.35;
        safePlay(audio.near);
        nearBeepCooldownMs = NEAR_BEEP_MS * factor;
    } else {
        nearBeepCooldownMs = 120;
    }
}

if (musicToggle) musicToggle.addEventListener("change", updateMusic);

const STATE = {
    name: "TITLE",
};

const GAME = {
    player: { x: 0, y: 0, r: 18, speed: 230 },
    enemies: [],
    startMs: 0,
    elapsedMs: 0,
    level: 1,
    spawnTimerMs: 0,

    baseSpawnMs: 900,
    baseEnemySpeed: 95,
    over: false,
};

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

function resetGame() {
    GAME.player.x = canvas.width / 2;
    GAME.player.y = canvas.height / 2;
    GAME.enemies = [];
    GAME.startMs = performance.now();
    GAME.elapsedMs = 0;
    GAME.level = 1;
    GAME.spawnTimerMs = 0;
    GAME.over = false;
    nearBeepCooldownMs = 0;
}

function showScreen(which) {
    if (!titleScreen || !gameScreen || !scoreScreen) return;
    titleScreen.classList.toggle("hidden", which !== "TITLE");
    gameScreen.classList.toggle("hidden", which !== "GAME");
    scoreScreen.classList.toggle("hidden", which !== "SCORE");
    const audioControls = document.getElementById("audioControls");
    if (audioControls) {
        audioControls.classList.toggle("hidden", which === "SCORE");
    }
}

function setScreen(name) {
    STATE.name = name;

    if (startBtn) startBtn.style.display = name === "TITLE" ? "inline-block" : "none";
    if (restartBtn) restartBtn.style.display = name === "TITLE" ? "none" : "inline-block";

    if (submitPanel) submitPanel.style.display = name === "GAMEOVER" ? "flex" : "none";
    if (submitMsg) {
        submitMsg.textContent = "";
        submitMsg.classList.remove("error");
    }
}

function startGame() {
    resetGame();
    showScreen("GAME");
    setScoresOpen(false);
    setScreen("PLAY");
    updateMusic();
}

function gameOver() {
    if (GAME.over) return;
    GAME.over = true;

    try { audio.music.pause(); } catch {}
    if (musicToggle ? musicToggle.checked : true) {
        try { audio.over.currentTime = 0; audio.over.play().catch(()=>{}); } catch {}
    }

    setScreen("GAMEOVER");
    showScreen("SCORE");

    const sec = Math.floor(GAME.elapsedMs / 1000);
    if (finalStats) {
        finalStats.textContent = `Time survived: ${sec}s | Level reached: ${GAME.level}`;
    }

    setScoresOpen(true);
}

function secondsSurvived() {
    return Math.floor(GAME.elapsedMs / 1000);
}

function computeLevel(elapsedMs) {
    return 1 + Math.floor(elapsedMs / 15000);
}

function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;

    if (side === 0) { x = 0; y = Math.random() * canvas.height; }
    if (side === 1) { x = canvas.width; y = Math.random() * canvas.height; }
    if (side === 2) { x = Math.random() * canvas.width; y = 0; }
    if (side === 3) { x = Math.random() * canvas.width; y = canvas.height; }

    const speed = GAME.baseEnemySpeed + (GAME.level - 1) * 18;

    GAME.enemies.push({ x, y, r: 16, speed });
}

const keys = new Set();
window.addEventListener("keydown", (e) => {
    keys.add(e.key.toLowerCase());

    if (STATE.name === "TITLE") {
        if (e.key === "Enter" || e.key === " ") startGame();
    } else if (STATE.name === "GAMEOVER") {
        if (e.key === "Enter") showHighScores(true);
    } else if (STATE.name === "SCORES") {
        if (e.key === "Enter") {
            setScreen("TITLE");
        }
    }
});

window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

function update(dt) {
    if (STATE.name !== "PLAY") return;

    const now = performance.now();
    GAME.elapsedMs = now - GAME.startMs;
    GAME.level = computeLevel(GAME.elapsedMs);

    let vx = 0, vy = 0;
    if (keys.has("w") || keys.has("arrowup")) vy -= 1;
    if (keys.has("s") || keys.has("arrowdown")) vy += 1;
    if (keys.has("a") || keys.has("arrowleft")) vx -= 1;
    if (keys.has("d") || keys.has("arrowright")) vx += 1;

    const mag = Math.hypot(vx, vy) || 1;
    vx /= mag; vy /= mag;

    GAME.player.x = clamp(GAME.player.x + vx * GAME.player.speed * dt, GAME.player.r, canvas.width - GAME.player.r);
    GAME.player.y = clamp(GAME.player.y + vy * GAME.player.speed * dt, GAME.player.r, canvas.height - GAME.player.r);

    const spawnInterval = Math.max(220, GAME.baseSpawnMs - (GAME.level - 1) * 80);
    GAME.spawnTimerMs -= dt * 1000;
    if (GAME.spawnTimerMs <= 0) {
        spawnEnemy();
        GAME.spawnTimerMs = spawnInterval;
    }
    updateNearSfx(dt);

    for (const e of GAME.enemies) {
        const dx = GAME.player.x - e.x;
        const dy = GAME.player.y - e.y;
        const d = Math.hypot(dx, dy) || 1;

        e.x += (dx / d) * e.speed * dt;
        e.y += (dy / d) * e.speed * dt;

        if (d < GAME.player.r + e.r) {
            gameOver();
            return;
        }
    }
}

function drawSpriteOrCircle(img, x, y, w, h, rFallback) {
    if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    } else {
        ctx.beginPath();
        ctx.arc(x, y, rFallback, 0, Math.PI * 2);
        ctx.fill();
    }
}

function stopGameOverSound() {
    if (!audio || !audio.over) return;
    try {
        audio.over.pause();
        audio.over.currentTime = 0;
    } catch {}
}

function drawTitle() {
    updateMusic();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawPlay() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sec = secondsSurvived();

    ctx.fillStyle = "#e1e1e1";
    ctx.font = "14px Arial";
    ctx.fillText(`Time: ${sec}s`, 12, 20);
    ctx.fillText(`Level: ${GAME.level}`, 12, 40);

    ctx.fillStyle = "#e7e7e7";
    drawSpriteOrCircle(ASSETS.player, GAME.player.x, GAME.player.y, 42, 42, GAME.player.r);

    for (const e of GAME.enemies) {
        drawSpriteOrCircle(ASSETS.enemy, e.x, e.y, 38, 38, e.r);
    }
}

function drawGameOver() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (ASSETS.over.complete && ASSETS.over.naturalWidth > 0) {
        const w = 500, h = 500;
        ctx.drawImage(ASSETS.over, (canvas.width - w)/2, 0, w, h);
    }
}

function drawScores() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function clientValidateName(name) {
    const n = (name || "").trim();
    if (n.length < 2 || n.length > 20) return "Name must be 2..20 characters.";
    if (!/^[a-zA-Z0-9 _-]+$/.test(n)) return "Name contains invalid characters.";
    return null;
}

let scoresOpen = false;
let hsPage = 1;
const hsSize = 10;

function setScoresOpen(open) {
    scoresOpen = open;
    if (highscoresBox) highscoresBox.classList.toggle("hidden", !open);
    if (scoresToggleBtn) scoresToggleBtn.textContent = open ? "Close" : "Scores";
    if (open) loadHighScores(1);
}

if (scoresToggleBtn) {
    scoresToggleBtn.addEventListener("click", () => setScoresOpen(!scoresOpen));
}

async function submitScore() {
    const name = (nameInput?.value || "").trim();
    const err = clientValidateName(name);
    if (err) {
        submitMsg.textContent = err;
        submitMsg.classList.add("error");
        return;
    }

    const scoreSeconds = secondsSurvived();
    const levelReached = GAME.level;

    submitMsg.textContent = "Submitting...";
    submitMsg.classList.remove("error");

    try {
        const r = await fetch("/api/highscores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, scoreSeconds, levelReached }),
        });

        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
            submitMsg.textContent = (data.errors || ["Submit failed."]).join(" ");
            submitMsg.classList.add("error");
            return;
        }

        submitMsg.textContent = "Saved!";
        showHighScores(true);
        setScoresOpen(true);
    } catch {
        submitMsg.textContent = "Network error.";
        submitMsg.classList.add("error");
    }
}

if (submitBtn) {
    submitBtn.addEventListener("click", () => {
        submitScore()
    });
}
if (startBtn) startBtn.addEventListener("click", startGame);

if (restartBtn)restartBtn.addEventListener("click", () => {
    try { audio.music.pause(); audio.music.currentTime = 0; } catch {}
    try { audio.over.pause(); audio.over.currentTime = 0; } catch {}
    setScoresOpen(false);
    setScreen("TITLE");
    showScreen("TITLE");
});

if (backToTitleBtn){
    backToTitleBtn.addEventListener("click", () => {
        stopGameOverSound();
        setScoresOpen(false);
        setScreen("TITLE");
        showScreen("TITLE");
    });
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[c]));
}

async function showHighScores(page) {
    hsPage = page;
    setScreen("SCORES");
    drawScores();

    await loadHighScores(hsPage);
}

async function loadHighScores(page) {
    if (!highscoresList) return;

    const r = await fetch(`/api/highscores?page=${page}&size=${hsSize}`);
    const data = await r.json();

    hsPage = data.page;

    if (pageInfo) pageInfo.textContent = `Page ${data.page}/${data.totalPages}`;
    if (prevPageBtn) prevPageBtn.disabled = data.page <= 1;
    if (nextPageBtn) nextPageBtn.disabled = data.page >= data.totalPages;

    highscoresList.innerHTML = "";

    const header = document.createElement("div");
    header.className = "row";
    header.style.fontWeight = "700";
    header.innerHTML = `<div>#</div><div>Name</div><div>Time</div><div>Level</div><div>Date</div>`;
    highscoresList.appendChild(header);

    (data.items || []).forEach((it, idx) => {
        const rank = (data.page - 1) * data.size + idx + 1;
        const createdAt = (it.createdAt || "").replace("T", " ").slice(0, 19);

        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `
      <div>${rank}</div>
      <div>${escapeHtml(it.name)}</div>
      <div>${it.scoreSeconds}s</div>
      <div>${it.levelReached}</div>
      <div>${escapeHtml(createdAt)}</div>
    `;
        highscoresList.appendChild(row);
    });
}

if (prevPageBtn) prevPageBtn.addEventListener("click", () => loadHighScores(Math.max(1, hsPage - 1)));
if (nextPageBtn) nextPageBtn.addEventListener("click", () => loadHighScores(hsPage + 1));

let last = performance.now();
function loop(t) {
    const dt = Math.min(0.033, (t - last) / 1000);
    last = t;

    update(dt);

    if (STATE.name === "TITLE") drawTitle();
    if (STATE.name === "PLAY") drawPlay();
    if (STATE.name === "GAMEOVER") drawGameOver();
    if (STATE.name === "SCORES") drawScores();

    requestAnimationFrame(loop);
}

showScreen("TITLE");
setScoresOpen(false);
setScreen("TITLE");
requestAnimationFrame(loop);