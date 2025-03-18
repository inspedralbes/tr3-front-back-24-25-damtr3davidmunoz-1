const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let gameData = {
  playerSpeed: 5,
};

app.get("/api/player-speed", (req, res) => {
  res.json({ speed: gameData.playerSpeed });
});

app.post("/api/player-speed", express.json(), (req, res) => {
  const newSpeed = req.body.speed;
  if (typeof newSpeed === "number") {
    gameData.playerSpeed = newSpeed;
    io.emit("player-speed-updated", newSpeed);
    res.json({ success: true, speed: newSpeed });
  } else {
    res.status(400).json({ success: false, message: "Invalid speed value" });
  }
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.emit("player-speed-updated", gameData.playerSpeed);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});