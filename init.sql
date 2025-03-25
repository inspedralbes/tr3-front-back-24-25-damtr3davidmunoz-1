USE game_db;

CREATE TABLE IF NOT EXISTS game_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playerSpeed FLOAT NOT NULL
);

INSERT INTO game_settings (playerSpeed) VALUES (5);