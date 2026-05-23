import os
import time
import psutil
import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configura o FastAPI e o Socket.IO
app = FastAPI()

# Permite conexões do Frontend Admin (Porta 3001)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Na produção, limite ao IP do admin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

@app.get("/")
def read_root():
    return {"status": "Backend de Monitoramento OK"}

@sio.on('connect')
async def connect(sid, environ):
    # Futuro: Aqui entra a validação do token do Supabase enviado via headers (environ)
    print(f"[{sid}] Painel de Admin conectado ao WebSocket.")

@sio.on('disconnect')
async def disconnect(sid):
    print(f"[{sid}] Painel de Admin desconectado.")

# Tarefa em segundo plano para emitir estatísticas da VM a cada 2 segundos
async def background_task():
    while True:
        await sio.sleep(2)
        # Coleta dados da máquina (CPU e RAM)
        cpu_percent = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()
        
        data = {
            "timestamp": time.time(),
            "cpu": cpu_percent,
            "ram_used_mb": round(mem.used / (1024 * 1024), 1),
            "ram_total_mb": round(mem.total / (1024 * 1024), 1),
            "ram_percent": mem.percent
        }
        
        # Envia os dados para o dashboard
        await sio.emit('system_metrics', data)

# Inicia a transmissão de dados no background quando o servidor subir
@app.on_event("startup")
async def startup_event():
    sio.start_background_task(background_task)
