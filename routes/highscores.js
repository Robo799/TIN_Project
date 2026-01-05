const express = require("express");
const router = express.Router();

function validate(body) {
    const errors = [];
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const scoreSeconds = Number(body.scoreSeconds);
    const levelReached = Number(body.levelReached);

    if (!name || name.length < 2 || name.length > 20) errors.push("Name 2..20 chars.");
    if (!/^[a-zA-Z0-9 _-]+$/.test(name)) errors.push("Invalid name characters.");
    if (!Number.isInteger(scoreSeconds) || scoreSeconds < 0) errors.push("scoreSeconds must be int >= 0.");
    if (!Number.isInteger(levelReached) || levelReached < 1) errors.push("levelReached must be int >= 1.");

    return { ok: errors.length === 0, errors, clean: { name, scoreSeconds, levelReached } };
}

router.get("/highscores", (req, res) => {
    const db = req.app.locals.db;

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const size = Math.min(50, Math.max(5, parseInt(req.query.size || "10", 10)));
    const offset = (page - 1) * size;

    const total = db.prepare("SELECT COUNT(*) c FROM highscores").get().c;
    const totalPages = Math.max(1, Math.ceil(total / size));

    const items = db.prepare(`
    SELECT id, name,
           score_seconds AS scoreSeconds,
           level_reached AS levelReached,
           created_at AS createdAt
    FROM highscores
    ORDER BY score_seconds DESC, created_at DESC
    LIMIT ? OFFSET ?
  `).all(size, offset);

    res.json({ page, size, total, totalPages, items });
});

router.post("/highscores", (req, res) => {
    const db = req.app.locals.db;
    const v = validate(req.body || {});
    if (!v.ok) return res.status(400).json({ errors: v.errors });

    const info = db.prepare(`
    INSERT INTO highscores(name, score_seconds, level_reached)
    VALUES (?, ?, ?)
  `).run(v.clean.name, v.clean.scoreSeconds, v.clean.levelReached);

    const row = db.prepare(`
    SELECT id, name,
           score_seconds AS scoreSeconds,
           level_reached AS levelReached,
           created_at AS createdAt
    FROM highscores
    WHERE id = ?
  `).get(info.lastInsertRowid);

    res.status(201).json(row);
});

module.exports = router;