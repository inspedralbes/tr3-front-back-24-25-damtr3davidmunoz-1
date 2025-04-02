from pymongo import MongoClient
from websockets.sync.client import connect
import json
import time
from datetime import datetime
import logging

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('skin_stats.log'),
        logging.StreamHandler()
    ]
)

class SkinStatsCollector:
    def __init__(self, mongo_uri="mongodb://localhost:27017/", db_name="game_stats"):
        """Inicializa el recolector de estadísticas"""
        self.client = MongoClient(mongo_uri)
        self.db = self.client[db_name]
        self.skin_stats = self.db.skin_stats
        self.ensure_indexes()
        logging.info("SkinStatsCollector inicializado")
        
    def ensure_indexes(self):
        """Crea índices para optimizar las consultas"""
        self.skin_stats.create_index("image_url")
        self.skin_stats.create_index("timestamp")
        self.skin_stats.create_index("date")
        logging.info("Índices de MongoDB creados/verificados")
        
    def record_skin_selection(self, image_url):
        """Registra una selección de skin en la base de datos"""
        try:
            record = {
                "image_url": image_url,
                "timestamp": datetime.now(),
                "date": datetime.now().strftime("%Y-%m-%d")
            }
            result = self.skin_stats.insert_one(record)
            logging.info(f"Skin registrada: {image_url} (ID: {result.inserted_id})")
            return True
        except Exception as e:
            logging.error(f"Error al registrar skin: {e}")
            return False
        
    def get_popular_skins(self, limit=5, days=None):
        """Obtiene las skins más populares, opcionalmente filtradas por días"""
        try:
            pipeline = [
                {"$match": {}}
            ]
            
            if days:
                days_ago = datetime.now() - timedelta(days=days)
                pipeline[0]["$match"]["timestamp"] = {"$gte": days_ago}
            
            pipeline.extend([
                {"$group": {
                    "_id": "$image_url",
                    "count": {"$sum": 1},
                    "last_used": {"$max": "$timestamp"}
                }},
                {"$sort": {"count": -1, "last_used": -1}},
                {"$limit": limit}
            ])
            
            return list(self.skin_stats.aggregate(pipeline))
        except Exception as e:
            logging.error(f"Error al obtener skins populares: {e}")
            return []
        
    def connect_to_websocket(self, ws_url="ws://localhost:3000"):
        """Conecta al websocket y escucha eventos de cambio de skin"""
        logging.info(f"Iniciando conexión WebSocket a {ws_url}")
        while True:
            try:
                with connect(ws_url) as websocket:
                    logging.info("Conexión WebSocket establecida")
                    # Suscribirse a eventos de skin
                    websocket.send(json.dumps({
                        "type": "subscribe",
                        "events": ["player-image-updated"]
                    }))
                    
                    while True:
                        message = websocket.recv()
                        try:
                            data = json.loads(message)
                            if data.get("type") == "player-image-updated":
                                self.record_skin_selection(data["imageUrl"])
                        except json.JSONDecodeError:
                            logging.warning(f"Mensaje no JSON recibido: {message}")
                        except Exception as e:
                            logging.error(f"Error procesando mensaje: {e}")
                            
            except Exception as e:
                logging.error(f"Error en WebSocket: {e}. Reconectando en 5 segundos...")
                time.sleep(5)

    def close(self):
        """Cierra las conexiones"""
        self.client.close()
        logging.info("Conexiones cerradas")

if __name__ == "__main__":
    collector = None
    try:
        collector = SkinStatsCollector()
        collector.connect_to_websocket()
    except KeyboardInterrupt:
        logging.info("Deteniendo recolector...")
    finally:
        if collector:
            collector.close()
    logging.info("Recolector detenido")