const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
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
  `);

  db.query(`
    CREATE TABLE IF NOT EXISTS player_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      image_url VARCHAR(255) NOT NULL
    )
  `);
});

const gameRooms = new Map();
const CONNECTION_TIMEOUT = 3600000;
let gameData = { playerSpeed: 5 };

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of gameRooms.entries()) {
    if (now - room.createdAt > CONNECTION_TIMEOUT) {
      gameRooms.delete(code);
      console.log(`Sala ${code} eliminada por inactividad`);
    }
  }
}, 60000);

function generateRoomCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

app.get("/api/player-speed", (req, res) => {
  res.json({ speed: gameData.playerSpeed });
});

app.post("/api/player-speed", (req, res) => {
  const newSpeed = req.body.speed;
  gameData.playerSpeed = newSpeed;

  db.query("INSERT INTO game_settings (playerSpeed) VALUES (?)", [newSpeed], (err) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "player-speed-updated", speed: newSpeed }));
      }
    });
    res.json({ success: true, speed: newSpeed });
  });
});

app.post("/api/upload-image", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

  const imageUrl = `http://localhost:3000/uploads/${req.file.filename}`;

  db.query("INSERT INTO player_images (image_url) VALUES (?)", [imageUrl], (err) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "player-image-updated", imageUrl }));
      }
    });
    res.json({ success: true, imageUrl });
  });
});

app.get("/api/player-images", (req, res) => {
  db.query("SELECT id, image_url FROM player_images ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    res.json({ success: true, images: results });
  });
});

app.post("/api/select-image", (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ success: false, message: "No image URL provided" });

  db.query("SELECT id FROM player_images WHERE image_url = ?", [imageUrl], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    if (results.length === 0) return res.status(404).json({ success: false, message: "Image not found" });

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "player-image-updated", imageUrl }));
      }
    });
    res.json({ success: true, imageUrl });
  });
});

app.get("/api/last-player-image", (req, res) => {
  db.query("SELECT image_url FROM player_images ORDER BY id DESC LIMIT 1", (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    res.json({ success: true, imageUrl: results[0]?.image_url || null });
  });
});

app.post("/api/create-room", (req, res) => {
  const { hostIP, port } = req.body;
  const roomCode = generateRoomCode();
  
  gameRooms.set(roomCode, {
    hostIP,
    port,
    players: [hostIP],
    createdAt: Date.now()
  });
  
  res.json({ success: true, roomCode });
});

app.post("/api/join-room", (req, res) => {
  const { roomCode, playerIP } = req.body;
  
  if (!gameRooms.has(roomCode)) {
    return res.status(404).json({ success: false, message: "Sala no encontrada" });
  }
  
  const room = gameRooms.get(roomCode);
  room.players.push(playerIP);
  
  res.json({ 
    success: true, 
    hostIP: room.hostIP,
    port: room.port
  });
});

app.get("/api/active-rooms", (req, res) => {
  const rooms = Array.from(gameRooms.entries()).map(([code, data]) => ({
    code,
    players: data.players.length,
    createdAt: data.createdAt
  }));
  
  res.json({ success: true, rooms });
});

wss.on("connection", (ws) => {
  console.log("Nuevo cliente conectado");
  
  ws.send(JSON.stringify({ 
    type: "initial-state", 
    speed: gameData.playerSpeed 
  }));
  
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === "game-event") {
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      }
    } catch (e) {
      console.error("Error procesando mensaje WebSocket:", e);
    }
  });
});

app.use("/uploads", express.static("uploads"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});