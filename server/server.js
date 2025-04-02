require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');

// Configuración inicial
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuración de Multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, JPG, PNG, GIF)'));
    }
  }
});

// Crear directorio uploads si no existe
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Inicialización de SQLite
const db = new sqlite3.Database('./game_db.sqlite', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
    process.exit(1);
  }
  
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS game_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playerSpeed REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS player_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.get("SELECT COUNT(*) as count FROM game_settings", (err, row) => {
      if (row && row.count === 0) {
        db.run("INSERT INTO game_settings (playerSpeed) VALUES (5)");
      }
    });
  });
});

// Configuración de MongoDB
const localUri = 'mongodb://localhost:27017';
let mongoClient;

async function connectToMongoDB() {
  try {
    mongoClient = new MongoClient(localUri);
    await mongoClient.connect();
    console.log('✅ Conectado a MongoDB Local');
    
    // Crear índices
    const db = mongoClient.db('game_stats');
    await db.collection('skin_stats').createIndex({ image_url: 1 });
    await db.collection('skin_stats').createIndex({ timestamp: 1 });
    
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err);
    setTimeout(connectToMongoDB, 5000); // Reintentar conexión
  }
}

// Variables de estado
let currentSpeed = 5;
let lastImageUrl = null;

// Cargar estado inicial
db.get("SELECT playerSpeed FROM game_settings ORDER BY id DESC LIMIT 1", (err, row) => {
  if (!err && row) currentSpeed = row.playerSpeed;
});

db.get("SELECT image_url FROM player_images ORDER BY created_at DESC LIMIT 1", (err, row) => {
  if (!err && row) lastImageUrl = row.image_url;
});

// Middleware para registro de solicitudes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ==================== ENDPOINTS ====================

// 1. Endpoints de velocidad del jugador
app.get('/api/player-speed', (req, res) => {
  db.get("SELECT playerSpeed FROM game_settings ORDER BY id DESC LIMIT 1", (err, row) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database error',
        error: err.message 
      });
    }
    currentSpeed = row ? row.playerSpeed : 5;
    res.json({ success: true, speed: currentSpeed });
  });
});

app.post('/api/player-speed', (req, res) => {
  const newSpeed = parseFloat(req.body.speed);
  
  if (isNaN(newSpeed)) {
    return res.status(400).json({ success: false, message: 'Invalid speed value' });
  }

  db.run("INSERT INTO game_settings (playerSpeed) VALUES (?)", [newSpeed], function(err) {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database error',
        error: err.message 
      });
    }
    
    currentSpeed = newSpeed;
    broadcastMessage(JSON.stringify({ 
      type: 'player-speed-updated', 
      speed: newSpeed,
      timestamp: new Date().toISOString()
    }));
    
    res.json({ success: true, speed: newSpeed });
  });
});

// 2. Endpoints de gestión de imágenes
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded or invalid file type' });
  }

  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  db.run("INSERT INTO player_images (image_url) VALUES (?)", [imageUrl], function(err) {
    if (err) {
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error',
        error: err.message 
      });
    }
    
    lastImageUrl = imageUrl;
    broadcastMessage(JSON.stringify({ 
      type: 'player-image-updated', 
      imageUrl,
      timestamp: new Date().toISOString()
    }));
    
    recordSkinSelection(imageUrl);
    res.json({ success: true, imageUrl });
  });
});

app.get('/api/player-images', (req, res) => {
  db.all("SELECT id, image_url FROM player_images ORDER BY created_at DESC", (err, rows) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database error',
        error: err.message 
      });
    }
    res.json({ success: true, images: rows || [] });
  });
});

app.post('/api/select-image', async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ success: false, message: 'No image URL provided' });
  }

  try {
    const row = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM player_images WHERE image_url = ?", [imageUrl], 
        (err, row) => err ? reject(err) : resolve(row));
    });

    if (!row) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }

    lastImageUrl = imageUrl;
    broadcastMessage(JSON.stringify({ 
      type: 'player-image-updated', 
      imageUrl,
      timestamp: new Date().toISOString()
    }));
    
    await recordSkinSelection(imageUrl);
    res.json({ success: true, imageUrl });
  } catch (err) {
    console.error('Error selecting image:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Database error',
      error: err.message 
    });
  }
});

app.get('/api/last-player-image', (req, res) => {
  db.get("SELECT image_url FROM player_images ORDER BY created_at DESC LIMIT 1", (err, row) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database error',
        error: err.message 
      });
    }
    res.json({ success: true, imageUrl: row ? row.image_url : null });
  });
});

// 3. Endpoints de estadísticas
app.get('/api/skin-stats', async (req, res) => {
  try {
    if (!mongoClient) {
      return res.status(500).json({ success: false, message: 'MongoDB not connected' });
    }
    
    const { limit = 5, days } = req.query;
    const db = mongoClient.db('game_stats');
    const skinStats = db.collection('skin_stats');
    
    const pipeline = [{ $match: {} }];
    
    if (days && !isNaN(days)) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      pipeline[0].$match.timestamp = { $gte: daysAgo };
    }
    
    pipeline.push(
      {
        $group: {
          _id: "$image_url",
          count: { $sum: 1 },
          last_used: { $max: "$timestamp" }
        }
      },
      { $sort: { count: -1, last_used: -1 } },
      { $limit: parseInt(limit) }
    );
    
    const stats = await skinStats.aggregate(pipeline).toArray();
    res.json({ success: true, stats, generated_at: new Date().toISOString() });
  } catch (err) {
    console.error('Error getting skin stats:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Database error',
      error: err.message 
    });
  }
});

// Servir archivos estáticos
app.use('/uploads', express.static('uploads'));

// WebSocket Server
wss.on('connection', (ws, req) => {
  console.log(`New client connected: ${req.socket.remoteAddress}`);
  
  ws.send(JSON.stringify({
    type: 'initial-state',
    speed: currentSpeed,
    imageUrl: lastImageUrl,
    timestamp: new Date().toISOString()
  }));
});

function broadcastMessage(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

async function recordSkinSelection(imageUrl) {
  if (!mongoClient) {
    await connectToMongoDB();
    if (!mongoClient) return false;
  }
  
  try {
    const db = mongoClient.db('game_stats');
    await db.collection('skin_stats').insertOne({
      image_url: imageUrl,
      timestamp: new Date(),
      date: new Date().toLocaleDateString('en-CA'),
      server: process.env.SERVER_NAME || 'default'
    });
    return true;
  } catch (err) {
    console.error('Error recording skin selection:', err);
    return false;
  }
}

// Iniciar servidor
const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectToMongoDB();
  server.listen(PORT, () => {
    console.log(`
    Servidor listo en http://localhost:${PORT}
    WebSocket: ws://localhost:${PORT}
    MongoDB Local: ${localUri}
    `);
  });
}

startServer();

// Manejar cierre limpio
process.on('SIGINT', async () => {
  console.log('\nApagando servidor...');
  if (mongoClient) await mongoClient.close();
  if (db) db.close();
  server.close(() => process.exit(0));
});