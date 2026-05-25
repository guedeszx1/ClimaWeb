import os
import io
import csv
import time
import psutil
import threading
from datetime import datetime, timedelta
import requests
from dotenv import load_dotenv
import telebot
from telebot import types
import subprocess
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from supabase import create_client, Client

# Carrega as variáveis de ambiente do arquivo .env
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(env_path)

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Inicializa o cliente do Supabase
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"[Telegram Bot] Erro ao conectar ao Supabase: {e}")

# Verifica se o Token foi configurado e é válido
bot_ativo = True
if not TOKEN or TOKEN == "insira_seu_token_aqui":
    print("[Telegram Bot] Bot desativado: TELEGRAM_BOT_TOKEN não foi configurado no .env.")
    bot_ativo = False

bot = telebot.TeleBot(TOKEN) if bot_ativo else None

# Limite de Alertas de Hardware
alerta_limite_cpu = 90.0
alerta_limite_ram = 90.0

# Teclado de Acesso Rápido Expandido
def obter_teclado_principal():
    markup = types.ReplyKeyboardMarkup(row_width=2, resize_keyboard=True)
    btn_status = types.KeyboardButton("🖥️ Status Rápido")
    btn_sysinfo = types.KeyboardButton("⚙️ Detalhes da VM")
    btn_monitor = types.KeyboardButton("📡 Monitor Ao Vivo")
    btn_stats = types.KeyboardButton("📊 Estatísticas da IA")
    btn_regions = types.KeyboardButton("🗺️ Auditorias por Região")
    btn_errors = types.KeyboardButton("❌ Erros Recentes da IA")
    btn_last = types.KeyboardButton("🔍 Última Auditoria")
    btn_export = types.KeyboardButton("📥 Exportar CSV da Base")
    btn_ajuda = types.KeyboardButton("❓ Ajuda")
    markup.add(btn_status, btn_sysinfo, btn_monitor, btn_stats, btn_regions, btn_errors, btn_last, btn_export, btn_ajuda)
    return markup

if bot_ativo:
    @bot.message_handler(commands=['start', 'help'])
    def send_welcome(message):
        welcome_text = (
            "👋 *Olá! Bem-vindo ao Painel de Controle Telegram do ClimaWeb!*\n\n"
            "Este assistente monitora a VM e permite gerenciar as análises de clima.\n\n"
            "📌 *Monitoramento do Servidor:*\n"
            "🖥️ `/status` - Uso atual de CPU e RAM\n"
            "⚙️ `/system_info` - Detalhes completos (Disco, Uptime, Processo)\n"
            "📡 `/monitor` - Gráfico dinâmico ao vivo (60s)\n"
            "📊 `/dashboard` - Dashboard visual com gráficos (NOVO!)\n\n"
            "📊 *Estatísticas & IA:*\n"
            "📊 `/stats` - Resumo do Supabase e acurácia da IA\n"
            "🗺️ `/audit_summary` - Progresso de validação por Região\n"
            "❌ `/ia_errors` - Últimas 5 divergências da IA corrigidas\n"
            "🔍 `/last_audit` - Detalhes da última auditoria salva\n\n"
            "📥 *Acesso a Dados & Busca:*\n"
            "📥 `/export` - Exporta e envia a base de auditoria completa em CSV\n"
            "🔍 `/search <termo>` - Busca termos nas descrições das cartas\n"
            "🗂️ `/export_charts <data_ini> <data_fim>` - Exporta as cartas sinóticas de um período\n"
            "📅 `/chart <AAAA-MM-DD>` - Busca o quadro de massas de um dia"
        )
        bot.reply_to(message, welcome_text, parse_mode='Markdown', reply_markup=obter_teclado_principal())

    @bot.message_handler(commands=['status'])
    def server_status(message):
        cpu = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory()
        ram_percent = mem.percent
        
        status_text = (
            "🖥️ *Status de Recursos da VM:*\n\n"
            f"⚡ *CPU:* {cpu}%\n"
            f"🧠 *RAM:* {ram_percent}% ({mem.used / (1024**2):.1f} MB / {mem.total / (1024**2):.1f} MB)"
        )
        bot.reply_to(message, status_text, parse_mode='Markdown')

    @bot.message_handler(commands=['monitor'])
    def live_monitor(message):
        def generate_bar(percent):
            filled = int(percent / 10)
            return '█' * filled + '░' * (10 - filled)
            
        initial_msg = bot.reply_to(message, "📡 *Iniciando monitoramento em tempo real...*", parse_mode='Markdown')
        
        def update_monitor():
            try:
                # O psutil cpu_percent precisa de uma chamada inicial para estabelecer a baseline
                psutil.cpu_percent(interval=0.1)
                for i in range(12):  # 12 * 5s = 60 segundos
                    cpu = psutil.cpu_percent(interval=None)
                    mem = psutil.virtual_memory()
                    ram = mem.percent
                    
                    text = (
                        "📡 *Monitoramento Dinâmico (Ao Vivo)*\n\n"
                        f"⚡ *CPU:* {cpu}%\n"
                        f"`[{generate_bar(cpu)}]`\n\n"
                        f"🧠 *RAM:* {ram}%\n"
                        f"`[{generate_bar(ram)}]`\n\n"
                        f"🔄 _Atualizando... ({12 - i} picos restantes)_"
                    )
                    
                    bot.edit_message_text(text, chat_id=initial_msg.chat.id, message_id=initial_msg.message_id, parse_mode='Markdown')
                    time.sleep(5)
                    
                # Mensagem final
                final_text = (
                    "📡 *Monitoramento Concluído.*\n"
                    "O período de 60 segundos finalizou. Envie o comando novamente se precisar de mais dados."
                )
                bot.edit_message_text(final_text, chat_id=initial_msg.chat.id, message_id=initial_msg.message_id, parse_mode='Markdown')
            except Exception as e:
                print(f"[Telegram Bot] Erro no monitor dinâmico: {e}")
                
        threading.Thread(target=update_monitor, daemon=True).start()

    @bot.message_handler(commands=['system_info'])
    def system_info(message):
        # Uptime
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.now() - boot_time
        dias = uptime.days
        horas, resto = divmod(uptime.seconds, 3600)
        minutos, _ = divmod(resto, 60)
        uptime_str = f"{dias}d {horas}h {minutos}m"
        
        # Disco
        disk = psutil.disk_usage('/')
        disk_free = disk.free / (1024 ** 3)
        disk_total = disk.total / (1024 ** 3)
        
        # Top 5 processos de RAM
        process_list = []
        for p in psutil.process_iter(['pid', 'name', 'cmdline', 'memory_info']):
            try:
                cmd = " ".join(p.info['cmdline']) if p.info['cmdline'] else p.info['name']
                mem_mb = p.info['memory_info'].rss / (1024 * 1024)
                
                friendly_name = p.info['name']
                if "app.py" in cmd or "streamlit" in cmd.lower():
                    friendly_name = "Streamlit (ClimaWeb)"
                elif "bot.py" in cmd or "server:socket_app" in cmd or "server.py" in cmd:
                    friendly_name = "Telegram Bot / Backend"
                elif "vite" in cmd.lower() or "node" in cmd.lower():
                    friendly_name = "Node/Vite (Admin)"
                    
                process_list.append((friendly_name, mem_mb))
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
                
        # Ordenar e agrupar para o Top 5
        process_list.sort(key=lambda x: x[1], reverse=True)
        top_processes = process_list[:5]
        
        top_text = "📊 *Top Processos Consumindo RAM:*\n"
        for name, mem in top_processes:
            top_text += f"   ├ 🔹 {name}: {mem:.1f} MB\n"
        
        info_text = (
            "⚙️ *Informações Detalhadas do Servidor:*\n\n"
            f"🕒 *Uptime da Máquina:* {uptime_str}\n"
            f"💾 *Espaço em Disco:* {disk.percent}% em uso ({disk_free:.1f} GB livres de {disk_total:.1f} GB)\n"
            f"⚡ *Threads Ativas:* {threading.active_count()}\n"
            f"📅 *Hora do Servidor:* {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n\n"
            f"{top_text}"
        )
        bot.reply_to(message, info_text, parse_mode='Markdown')

    @bot.message_handler(commands=['stats'])
    def db_stats(message):
        if not supabase:
            bot.reply_to(message, "❌ Conexão com o Supabase não configurada.")
            return
            
        bot.send_chat_action(message.chat.id, 'typing')
        try:
            res = supabase.table("clima_registros").select("status_informacao").execute()
            records = res.data
            
            if not records:
                bot.reply_to(message, "📭 Nenhum registro encontrado no banco de dados.")
                return
                
            total = len(records)
            auditados = sum(1 for r in records if "100% IA" not in r['status_informacao'])
            acertos_ia = sum(1 for r in records if r['status_informacao'] == 'Validado Humano (IA Acertou)')
            erros_ia = sum(1 for r in records if r['status_informacao'] == 'Corrigido Humano (IA Errou)')
            
            total_avaliado_ia = acertos_ia + erros_ia
            acuracia = (acertos_ia / total_avaliado_ia * 100) if total_avaliado_ia > 0 else 0
            
            stats_text = (
                "📊 *Estatísticas Climatológicas & IA:*\n\n"
                f"🗂️ *Total de Registros:* {total}\n"
                f"🛡️ *Registros Auditados:* {auditados} ({auditados/total*100:.1f}%)\n"
                f"🎯 *Acurácia do Modelo:* {acuracia:.1f}%\n"
                f"  └ ✅ Acertos da IA: {acertos_ia}\n"
                f"  └ ❌ Divergências (IA Errou): {erros_ia}"
            )
            bot.reply_to(message, stats_text, parse_mode='Markdown')
        except Exception as e:
            bot.reply_to(message, f"❌ Erro ao consultar estatísticas: {str(e)}")

    @bot.message_handler(commands=['audit_summary'])
    def audit_summary(message):
        if not supabase:
            bot.reply_to(message, "❌ Conexão com o Supabase não configurada.")
            return
            
        bot.send_chat_action(message.chat.id, 'typing')
        try:
            res = supabase.table("clima_registros").select("regiao, status_informacao").execute()
            records = res.data
            
            if not records:
                bot.reply_to(message, "📭 Sem registros para detalhar.")
                return
                
            # Agrupa por região
            regioes = {}
            for r in records:
                reg = r['regiao']
                status = r['status_informacao']
                
                if reg not in regioes:
                    regioes[reg] = {"total": 0, "auditados": 0}
                
                regioes[reg]["total"] += 1
                if "100% IA" not in status:
                    regioes[reg]["auditados"] += 1
            
            summary_text = "🗺️ *Progresso de Auditoria Humana por Região:*\n\n"
            for reg, count in sorted(regioes.items()):
                pct = (count["auditados"] / count["total"] * 100) if count["total"] > 0 else 0
                summary_text += f"📍 *{reg}:* {count['auditados']}/{count['total']} validados ({pct:.1f}%)\n"
                
            bot.reply_to(message, summary_text, parse_mode='Markdown')
        except Exception as e:
            bot.reply_to(message, f"❌ Erro ao processar resumo de regiões: {str(e)}")

    @bot.message_handler(commands=['ia_errors'])
    def ia_errors(message):
        if not supabase:
            bot.reply_to(message, "❌ Conexão com o Supabase não configurada.")
            return
            
        bot.send_chat_action(message.chat.id, 'typing')
        try:
            res = supabase.table("clima_registros")\
                .select("*")\
                .eq("status_informacao", "Corrigido Humano (IA Errou)")\
                .order("data_verificacao", desc=True)\
                .limit(5)\
                .execute()
                
            if not res.data:
                bot.reply_to(message, "🎉 Nenhuma divergência da IA foi registrada recentemente!")
                return
                
            errors_text = "❌ *Últimos 5 Erros da IA Corrigidos por Humanos:*\n\n"
            for i, r in enumerate(res.data, 1):
                errors_text += (
                    f"{i}. 📅 *Data:* {r['data_exibicao']} | 📍 *{r['regiao']}*\n"
                    f"   └ 🤖 IA predisse: `{r['massa_de_ar_ia']}`\n"
                    f"   └ 👤 Humano corrigiu para: `{r['massa_de_ar_final']}`\n"
                    f"   └ 🕒 Data/Hora: {r['data_verificacao']}\n\n"
                )
            bot.reply_to(message, errors_text, parse_mode='Markdown')
        except Exception as e:
            bot.reply_to(message, f"❌ Erro ao buscar erros da IA: {str(e)}")

    @bot.message_handler(commands=['last_audit'])
    def last_audit(message):
        if not supabase:
            bot.reply_to(message, "❌ Conexão com o Supabase não configurada.")
            return
            
        bot.send_chat_action(message.chat.id, 'typing')
        try:
            res = supabase.table("clima_registros")\
                .select("*")\
                .neq("status_informacao", "100% IA (Não Validado)")\
                .order("data_verificacao", desc=True)\
                .limit(1)\
                .execute()
                
            if not res.data:
                bot.reply_to(message, "🔎 Nenhuma auditoria registrada até o momento.")
                return
                
            audit = res.data[0]
            desc = audit.get('descricao') or 'Sem descrição'
            audit_text = (
                "🔍 *Última Auditoria Realizada:*\n\n"
                f"📅 *Data:* {audit['data_exibicao']}\n"
                f"📍 *Região:* {audit['regiao']}\n"
                f"🤖 *Classificação IA:* {audit['massa_de_ar_ia']}\n"
                f"👤 *Classificação Real:* {audit['massa_de_ar_final']}\n"
                f"🛡️ *Status:* {audit['status_informacao']}\n"
                f"🕒 *Verificado em:* {audit['data_verificacao']}\n"
                f"📝 *Descrição:* _{desc}_"
            )
            bot.reply_to(message, audit_text, parse_mode='Markdown')
        except Exception as e:
            bot.reply_to(message, f"❌ Erro ao buscar última auditoria: {str(e)}")

    @bot.message_handler(commands=['export'])
    def export_csv(message):
        if not supabase:
            bot.reply_to(message, "❌ Conexão com o Supabase não configurada.")
            return
            
        bot.send_chat_action(message.chat.id, 'upload_document')
        try:
            # Query para exportar tudo
            res = supabase.table("clima_registros").select("*").execute()
            records = res.data
            
            if not records:
                bot.reply_to(message, "📭 Sem dados no banco para exportar.")
                return
                
            # Cria o CSV em memória
            output_stream = io.StringIO()
            writer = csv.writer(output_stream)
            
            # Cabeçalhos
            writer.writerow(["data_exibicao", "regiao", "massa_de_ar_ia", "massa_de_ar_final", "status_informacao", "data_verificacao", "descricao", "estacao"])
            
            # Linhas
            for r in records:
                writer.writerow([
                    r.get("data_exibicao"),
                    r.get("regiao"),
                    r.get("massa_de_ar_ia"),
                    r.get("massa_de_ar_final"),
                    r.get("status_informacao"),
                    r.get("data_verificacao"),
                    r.get("descricao", ""),
                    r.get("estacao")
                ])
                
            # Converte em bytes
            bio = io.BytesIO(output_stream.getvalue().encode('utf-8'))
            bio.name = f"climaweb_auditoria_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            
            bot.send_document(
                message.chat.id, 
                bio, 
                caption="📥 *Aqui está a sua planilha de auditoria completa exportada do Supabase!*", 
                parse_mode='Markdown'
            )
        except Exception as e:
            bot.reply_to(message, f"❌ Erro ao exportar CSV: {str(e)}")

    @bot.message_handler(commands=['search'])
    def search_term(message):
        if not supabase:
            bot.reply_to(message, "❌ Conexão com o Supabase não configurada.")
            return
            
        # Pega o termo após o comando
        args = message.text.split(maxsplit=1)
        if len(args) < 2:
            bot.reply_to(message, "💡 *Uso correto:* `/search <termo>`\nExemplo: `/search frente fria`", parse_mode='Markdown')
            return
            
        term = args[1].strip()
        bot.send_chat_action(message.chat.id, 'typing')
        try:
            # Procura no Supabase nas descrições
            res = supabase.table("clima_registros").select("*").ilike("descricao", f"%{term}%").limit(5).execute()
            
            if not res.data:
                bot.reply_to(message, f"🔎 Nenhum registro encontrado contendo: `{term}`", parse_mode='Markdown')
                return
                
            search_text = f"🔎 *Resultados da busca por '{term}' (limite de 5):*\n\n"
            for i, r in enumerate(res.data, 1):
                desc_curta = r['descricao']
                if len(desc_curta) > 100: desc_curta = desc_curta[:97] + "..."
                search_text += (
                    f"📅 *Data:* {r['data_exibicao']} | 📍 *{r['regiao']}*\n"
                    f" └ Massa final: `{r['massa_de_ar_final']}`\n"
                    f" └ Descrição: _{desc_curta}_\n\n"
                )
            bot.reply_to(message, search_text, parse_mode='Markdown')
        except Exception as e:
            bot.reply_to(message, f"❌ Erro na busca: {str(e)}")

    @bot.message_handler(commands=['chart'])
    def daily_chart(message):
        if not supabase:
            bot.reply_to(message, "❌ Conexão com o Supabase não configurada.")
            return
            
        args = message.text.split(maxsplit=1)
        if len(args) < 2:
            bot.reply_to(message, "💡 *Uso correto:* `/chart <AAAA-MM-DD>`\nExemplo: `/chart 2025-12-20`", parse_mode='Markdown')
            return
            
        date_str = args[1].strip()
        bot.send_chat_action(message.chat.id, 'typing')
        try:
            # Valida formato de data simples
            try:
                datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                bot.reply_to(message, "❌ Formato de data inválido. Use o padrão `AAAA-MM-DD` (ex: `2025-12-20`).")
                return
                
            res = supabase.table("clima_registros").select("*").eq("data_exibicao", date_str).execute()
            
            if not res.data:
                bot.reply_to(message, f"📅 Nenhum registro encontrado para a data: `{date_str}`", parse_mode='Markdown')
                return
                
            chart_text = f"📅 *Quadro Sinótico - {date_str}:*\n\n"
            for r in sorted(res.data, key=lambda x: x['regiao']):
                status_icon = "👤" if "Humano" in r['status_informacao'] else "🤖"
                chart_text += (
                    f"📍 *{r['regiao']}* | Massa: `{r['massa_de_ar_final']}`\n"
                    f" └ Status: {status_icon} _{r['status_informacao']}_\n"
                )
            bot.reply_to(message, chart_text, parse_mode='Markdown')
        except Exception as e:
            bot.reply_to(message, f"❌ Erro ao consultar data: {str(e)}")

    @bot.message_handler(commands=['export_charts'])
    def export_charts(message):
        args = message.text.split()
        if len(args) != 3:
            bot.reply_to(message, "💡 *Uso correto:* `/export_charts <data_inicial> <data_final>`\nExemplo: `/export_charts 2025-05-01 2025-05-03`", parse_mode='Markdown')
            return
            
        data_ini_str = args[1]
        data_fim_str = args[2]
        
        try:
            data_ini = datetime.strptime(data_ini_str, "%Y-%m-%d")
            data_fim = datetime.strptime(data_fim_str, "%Y-%m-%d")
        except ValueError:
            bot.reply_to(message, "❌ Formato de data inválido. Use AAAA-MM-DD.")
            return
            
        if (data_fim - data_ini).days > 10:
            bot.reply_to(message, "❌ O período máximo permitido é de 10 dias para evitar sobrecarga no Telegram (limite de envio).")
            return
            
        if (data_fim - data_ini).days < 0:
            bot.reply_to(message, "❌ A data final deve ser maior ou igual à data inicial.")
            return
            
        bot.send_chat_action(message.chat.id, 'upload_photo')
        
        import os
        
        datas = [data_ini + timedelta(days=x) for x in range((data_fim - data_ini).days + 1)]
        media_group = []
        
        base_dir = "/home/ubuntu/APP/cartas_sinoticas"
        
        for data_obj in datas:
            data_formatada = data_obj.strftime("%Y%m%d")
            ano = data_obj.strftime("%Y")
            
            # Tentar baixar do arquivo local (00Z)
            # Nome padrao: web_AS_analise_YYYYMMDD0000_+0.png
            file_name = f"web_AS_analise_{data_formatada}0000_+0.png"
            file_path = os.path.join(base_dir, ano, file_name)
            
            success = False
            try:
                if os.path.exists(file_path):
                    with open(file_path, 'rb') as f:
                        file_data = f.read()
                    media_group.append(types.InputMediaPhoto(file_data, caption=f"🗺️ Carta Sinótica - {data_obj.strftime('%d/%m/%Y')}"))
                    success = True
            except Exception as e:
                pass
            
            if not success:
                bot.send_message(message.chat.id, f"⚠️ A carta do dia {data_obj.strftime('%d/%m/%Y')} não foi encontrada no banco de imagens local.")
                
        if media_group:
            # Dividir em blocos de 10 fotos (limite do Telegram)
            for i in range(0, len(media_group), 10):
                bot.send_media_group(message.chat.id, media_group[i:i+10])
                time.sleep(2)
        else:
            bot.reply_to(message, "❌ Nenhuma imagem de carta sinótica foi encontrada online para o período solicitado.")

    # Processamento de texto para botões do teclado customizado
    @bot.message_handler(func=lambda msg: msg.text and not msg.text.startswith('/'))
    def handle_text_buttons(message):
        text = message.text
        if text == "🖥️ Status Rápido":
            server_status(message)
        elif text == "⚙️ Detalhes da VM":
            system_info(message)
        elif text == "📡 Monitor Ao Vivo":
            live_monitor(message)
        elif text == "📊 Estatísticas da IA":
            db_stats(message)
        elif text == "🗺️ Auditorias por Região":
            audit_summary(message)
        elif text == "❌ Erros Recentes da IA":
            ia_errors(message)
        elif text == "🔍 Última Auditoria":
            last_audit(message)
        elif text == "📥 Exportar CSV da Base":
            export_csv(message)
        elif text == "❓ Ajuda":
            send_welcome(message)
        else:
            bot.reply_to(message, "Desculpe, não entendi. Utilize os botões do teclado para interagir ou digite `/help`.", reply_markup=obter_teclado_principal())

    def obter_teclado_inline():
        markup = types.InlineKeyboardMarkup(row_width=1)
        btn_dash = types.InlineKeyboardButton("📊 Gerar Dashboard", callback_data="cb_dashboard")
        btn_ram = types.InlineKeyboardButton("🖥️ Detalhes da RAM", callback_data="cb_ram")
        btn_restart = types.InlineKeyboardButton("🔄 Reiniciar Site", callback_data="cb_restart")
        markup.add(btn_dash, btn_ram, btn_restart)
        return markup

    @bot.message_handler(commands=['dashboard'])
    def send_dashboard(message):
        bot.send_chat_action(message.chat.id, 'upload_photo')
        try:
            # 1. Obter dados de CPU e RAM
            cpu_percent = psutil.cpu_percent(interval=0.5)
            ram_percent = psutil.virtual_memory().percent
            
            # 2. Gerar Gráfico
            fig, ax = plt.subplots(figsize=(6, 4))
            labels = ['CPU', 'RAM']
            values = [cpu_percent, ram_percent]
            colors = ['#ff9999', '#66b3ff']
            
            ax.bar(labels, values, color=colors)
            ax.set_ylim(0, 100)
            ax.set_ylabel('Uso (%)')
            ax.set_title('Recursos da VM - ClimaWeb')
            for i, v in enumerate(values):
                ax.text(i, v + 2, f"{v}%", ha='center', fontweight='bold')
                
            buf = io.BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            plt.close(fig)
            
            # 3. Contagem de Usuários
            active_users = "N/A"
            if supabase:
                try:
                    res = supabase.table("clima_registros").select("id", count="exact").execute()
                    active_users = str(res.count) if res.count is not None else "0"
                except Exception as e:
                    print(f"Error fetching count: {e}")
                    active_users = "Erro"
            
            caption_text = (
                "📊 *Dashboard Administrativo*\n\n"
                f"👥 *Registros Totais (Atividade):* {active_users}\n"
                f"⚡ *CPU Atual:* {cpu_percent}%\n"
                f"🧠 *RAM Atual:* {ram_percent}%\n\n"
                "Selecione uma ação abaixo:"
            )
            
            bot.send_photo(message.chat.id, photo=buf, caption=caption_text, parse_mode='Markdown', reply_markup=obter_teclado_inline())
            
        except Exception as e:
            bot.reply_to(message, f"❌ Erro ao gerar dashboard: {str(e)}")

    @bot.callback_query_handler(func=lambda call: True)
    def callback_query(call):
        if call.data.startswith("approve_"):
            uid = call.data.split("_")[1]
            try:
                supabase.table("perfis").update({"status": "aprovado"}).eq("id", uid).execute()
                bot.edit_message_text("✅ *Usuário Aprovado com sucesso!* Acesso liberado.", chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode='Markdown')
            except Exception as e:
                bot.answer_callback_query(call.id, "❌ Erro ao aprovar.")
                
        elif call.data.startswith("reject_"):
            uid = call.data.split("_")[1]
            try:
                supabase.table("perfis").update({"status": "recusado"}).eq("id", uid).execute()
                bot.edit_message_text("❌ *Usuário Recusado.* O acesso permanece bloqueado.", chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode='Markdown')
            except Exception as e:
                bot.answer_callback_query(call.id, "❌ Erro ao recusar.")

        elif call.data == "cb_dashboard":
            bot.answer_callback_query(call.id, "Gerando dashboard...")
            send_dashboard(call.message)
            
        elif call.data == "cb_ram":
            bot.answer_callback_query(call.id, "Coletando dados da RAM...")
            system_info(call.message)
            
        elif call.data == "cb_restart":
            if str(call.message.chat.id) != str(CHAT_ID):
                bot.answer_callback_query(call.id, "❌ Permissão Negada.", show_alert=True)
                return
                
            bot.answer_callback_query(call.id, "Reiniciando site. Aguarde...")
            try:
                subprocess.run("pkill -f streamlit", shell=True)
                subprocess.Popen("cd /home/ubuntu/APP && nohup /home/ubuntu/venv/bin/streamlit run app.py --server.port 8501 > streamlit.log 2>&1 &", shell=True)
                
                # Edita apenas o texto, não tem como editar a foto facilmente sem mandar outra, mas edit_message_caption serve
                bot.edit_message_caption(
                    caption="✅ *Site reiniciado com sucesso via Telegram!*\nO serviço Streamlit foi reinicializado na VM.",
                    chat_id=call.message.chat.id,
                    message_id=call.message.message_id,
                    parse_mode='Markdown'
                )
            except Exception as e:
                bot.send_message(call.message.chat.id, f"❌ Erro ao reiniciar site: {e}")

# Função para enviar alertas ativos de recursos da VM (CPU ou RAM crítica)
def enviar_alerta(mensagem):
    if not bot_ativo or not CHAT_ID or CHAT_ID == "insira_seu_chat_id_aqui":
        return False
    try:
        bot.send_message(CHAT_ID, f"⚠️ *ALERTA DE SISTEMA:*\n\n{mensagem}", parse_mode='Markdown')
        return True
    except Exception as e:
        print(f"[Telegram Bot] Falha ao enviar alerta ativo: {e}")
        return False

# Inicializador (Polling blocking) para desenvolvimento ou teste local standalone
import threading

notified_users = set()
def check_pending_users():
    while True:
        try:
            if supabase and bot_ativo and CHAT_ID:
                res = supabase.table("perfis").select("*").eq("status", "pendente").execute()
                if res.data:
                    for user in res.data:
                        uid = user['id']
                        if uid not in notified_users:
                            markup = types.InlineKeyboardMarkup(row_width=2)
                            btn_approve = types.InlineKeyboardButton("✅ Aprovar", callback_data=f"approve_{uid}")
                            btn_reject = types.InlineKeyboardButton("❌ Recusar", callback_data=f"reject_{uid}")
                            markup.add(btn_approve, btn_reject)
                            
                            bot.send_message(
                                CHAT_ID, 
                                f"🔔 *Nova Solicitação de Cadastro*\n\n📧 *Email:* `{user['email']}`\n\nDeseja aprovar este usuário para acesso ao painel de edição?", 
                                parse_mode='Markdown',
                                reply_markup=markup
                            )
                            notified_users.add(uid)
        except Exception as e:
            print(f"[Telegram Bot] Erro ao checar cadastros pendentes: {e}")
        time.sleep(15)

if __name__ == "__main__":
    if bot_ativo:
        threading.Thread(target=check_pending_users, daemon=True).start()
        print("[Telegram Bot] Iniciando escuta (polling)... Pressione Ctrl+C para encerrar.")
        try:
            bot.infinity_polling()
        except KeyboardInterrupt:
            print("[Telegram Bot] Encerrado pelo usuário.")
    else:
        print("[Telegram Bot] Bot não pôde ser iniciado porque as credenciais não foram configuradas.")
