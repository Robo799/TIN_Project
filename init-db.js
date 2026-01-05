const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || "./data/game.db";

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

const schema = fs.readFileSync(path.join(__dirname, "db", "schema.sql"), "utf8");
db.exec(schema);

const count = db.prepare("SELECT COUNT(*) AS c FROM highscores").get().c;
if (count === 0) {
    const seed = fs.readFileSync(path.join(__dirname, "db", "seed.sql"), "utf8");
    db.exec(seed);
}

db.close();
console.log("DB ready:", DB_PATH);