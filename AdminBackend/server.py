import os
import time
import psutil
import socketio
import threading
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from bot import bot_ativo, bot, enviar_alerta

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

# Dicionário de controle de alertas para evitar spam (cooldown de 10 minutos por recurso)
last_alerts = {
    "cpu": 0,
    "ram": 0
}
ALERT_COOLDOWN = 600  # 10 minutos em segundos

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

# Tarefa em segundo plano para emitir estatísticas da VM a cada 2 segundos e verificar alertas
async def background_task():
    global last_alerts
    while True:
        await sio.sleep(2)
        # Coleta dados da máquina (CPU e RAM)
        cpu_percent = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()
        ram_percent = mem.percent
        
        # Coleta RAM dos processos específicos (FastAPI, Streamlit e Vite)
        fastapi_mem = 0.0
        streamlit_mem = 0.0
        vite_mem = 0.0
        
        try:
            import os
            current_pid = os.getpid()
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    pid = proc.info['pid']
                    cmd = proc.info['cmdline']
                    cmd_str = ' '.join(cmd).lower() if cmd else ''
                    name = proc.info['name'].lower()
                    
                    rss_mb = proc.memory_info().rss / (1024 * 1024)
                    
                    if pid == current_pid:
                        fastapi_mem += rss_mb
                    elif 'streamlit' in cmd_str or 'app.py' in cmd_str:
                        streamlit_mem += rss_mb
                    elif 'vite' in cmd_str or ('node' in name and any(x in cmd_str for x in ['vite', 'postcss', 'esbuild', 'rolldown'])):
                        vite_mem += rss_mb
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    pass
        except Exception as ex:
            print(f"Erro ao obter RAM de processos: {ex}")
            
        data = {
            "timestamp": time.time(),
            "cpu": cpu_percent,
            "ram_used_mb": round(mem.used / (1024 * 1024), 1),
            "ram_total_mb": round(mem.total / (1024 * 1024), 1),
            "ram_percent": ram_percent,
            "fastapi_mem": round(fastapi_mem, 1),
            "streamlit_mem": round(streamlit_mem, 1),
            "vite_mem": round(vite_mem, 1)
        }
        
        # Envia os dados para o dashboard
        await sio.emit('system_metrics', data)

        # Verificação ativa de alertas para o Telegram
        current_time = time.time()
        
        # Alerta de CPU crítica (> 90%)
        if cpu_percent > 90.0:
            if current_time - last_alerts["cpu"] > ALERT_COOLDOWN:
                mensagem = f"⚡ *Uso de CPU Crítico:* {cpu_percent}%\nO servidor está operando sob carga pesada."
                if enviar_alerta(mensagem):
                    last_alerts["cpu"] = current_time
                    print("[Telegram Bot] Alerta de CPU enviado com sucesso.")
                    
        # Alerta de RAM crítica (> 90%)
        if ram_percent > 90.0:
            if current_time - last_alerts["ram"] > ALERT_COOLDOWN:
                ram_used_gb = mem.used / (1024 ** 3)
                ram_total_gb = mem.total / (1024 ** 3)
                mensagem = f"🧠 *Uso de RAM Crítico:* {ram_percent}% ({ram_used_gb:.1f} GB / {ram_total_gb:.1f} GB)\nConsidere liberar memória no servidor."
                if enviar_alerta(mensagem):
                    last_alerts["ram"] = current_time
                    print("[Telegram Bot] Alerta de RAM enviado com sucesso.")

# Inicia a transmissão de dados no background e a thread do Telegram Bot
sio.start_background_task(background_task)

if bot_ativo:
    def run_telegram_bot():
        print("[Telegram Bot] Iniciando polling em thread secundária...")
        try:
            bot.infinity_polling(skip_pending=True)
        except Exception as e:
            print(f"[Telegram Bot] Erro fatal no polling: {e}")
            
    t = threading.Thread(target=run_telegram_bot, daemon=True)
    t.start()
    
    # Envia notificação de inicialização bem-sucedida para o usuário
    def notify():
        time.sleep(2)
        enviar_alerta("🚀 *O servidor ClimaWeb e o Bot de Monitoramento foram iniciados com sucesso!*")
    threading.Thread(target=notify, daemon=True).start()
else:
    print("[Telegram Bot] Bot de Telegram não foi iniciado por falta de credenciais no arquivo .env.")


