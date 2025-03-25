const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const fs = require("fs");
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "rootpassword",
  database: process.env.DB_NAME || "game_db",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL database");

  db.query(`
    CREATE TABLE IF NOT EXISTS game_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      playerSpeed FLOAT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error("Error creating table:", err);
    } else {
      console.log("Table 'game_settings' created or already exists");
    }
  });

  db.query(`
    CREATE TABLE IF NOT EXISTS player_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      image_url VARCHAR(255) NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error("Error creating table:", err);
    } else {
      console.log("Table 'player_images' created or already exists");
    }
  });
});

let gameData = { playerSpeed: 5 };

db.query("SELECT playerSpeed FROM game_settings ORDER BY id DESC LIMIT 1", (err, results) => {
  if (err) {
    console.error("Error fetching player speed:", err);
  } else if (results.length > 0) {
    gameData.playerSpeed = results[0].playerSpeed;
    console.log("Initial player speed from database:", gameData.playerSpeed);
  }
});

app.get("/api/player-speed", (req, res) => {
  res.json({ speed: gameData.playerSpeed });
});

app.post("/api/player-speed", express.json(), (req, res) => {
  const newSpeed = req.body.speed;
  console.log("Received speed update request:", newSpeed);

  if (typeof newSpeed === "number") {
    gameData.playerSpeed = newSpeed;

    db.query("INSERT INTO game_settings (playerSpeed) VALUES (?)", [newSpeed], (err) => {
      if (err) {
        console.error("Error updating player speed:", err);
        res.status(500).json({ success: false, message: "Database error" });
      } else {
        console.log("Player speed updated in database:", newSpeed);

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "player-speed-updated", speed: newSpeed }));
          }
        });
        res.json({ success: true, speed: newSpeed });
      }
    });
  } else {
    console.error("Invalid speed value:", newSpeed);
    res.status(400).json({ success: false, message: "Invalid speed value" });
  }
});

app.post("/api/upload-image", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  const imageUrl = `http://localhost:3000/uploads/${req.file.filename}`;

  db.query("INSERT INTO player_images (image_url) VALUES (?)", [imageUrl], (err) => {
    if (err) {
      console.error("Error saving image URL to database:", err);
      res.status(500).json({ success: false, message: "Database error" });
    } else {
      console.log("Image URL saved to database:", imageUrl);

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "player-image-updated", imageUrl }));
        }
      });
      res.json({ success: true, imageUrl });
    }
  });
});

app.use("/uploads", express.static("uploads"));

wss.on("connection", (ws) => {
  console.log("New client connected");

  ws.send(JSON.stringify({ type: "player-speed-updated", speed: gameData.playerSpeed }));

  ws.on("message", (message) => {
    console.log("Received:", message.toString());

    if (message.toString() === "get-speed") {
      ws.send(JSON.stringify({ type: "player-speed-updated", speed: gameData.playerSpeed }));
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});