PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS highscores;

CREATE TABLE highscores (
                            id            INTEGER PRIMARY KEY AUTOINCREMENT,
                            name          TEXT    NOT NULL,
                            score_seconds INTEGER NOT NULL,
                            level_reached INTEGER NOT NULL,
                            created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_highscores_score
    ON highscores(score_seconds DESC, created_at DESC);
