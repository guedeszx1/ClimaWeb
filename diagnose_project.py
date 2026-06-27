import os
import sys
import socket
import subprocess
import importlib.util

def print_header(title):
    print("\n" + "="*60)
    print(f" {title.upper()} ".center(60, "="))
    print("="*60)

def print_status(label, success, detail=""):
    status = "[ OK ]" if success else "[FAIL]"
    print(f"{status} {label:<45} {detail}")

def check_file(path):
    exists = os.path.exists(path)
    print_status(f"Arquivo: {os.path.basename(path)}", exists, f"({path})" if exists else "NÃO ENCONTRADO")
    return exists

def check_port(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1.0)
        result = s.connect_ex(('localhost', port))
        in_use = (result == 0)
        print_status(f"Porta {port} em uso?", in_use, "SIM (Serviço rodando)" if in_use else "NÃO (Serviço parado)")
        return in_use

def check_python_imports(requirements_file):
    print_header("Verificação de Dependências Python")
    if not os.path.exists(requirements_file):
        print_status("requirements.txt", False, "Arquivo não encontrado")
        return False
        
    all_ok = True
    with open(requirements_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            # Extract package name (ignoring version specs)
            pkg = line.split('==')[0].split('>=')[0].strip().replace('-', '_')
            # Map common pip packages to import names if they differ
            import_name = pkg
            if pkg == 'python_telegram_bot':
                import_name = 'telegram'
            elif pkg == 'supabase':
                import_name = 'supabase'
            elif pkg == 'fastapi':
                import_name = 'fastapi'
            elif pkg == 'uvicorn':
                import_name = 'uvicorn'
            elif pkg == 'python_socketio':
                import_name = 'socketio'
            elif pkg == 'pyTelegramBotAPI':
                import_name = 'telebot'
            elif pkg == 'python_dotenv':
                import_name = 'dotenv'
                
            spec = importlib.util.find_spec(import_name)
            pkg_installed = spec is not None
            print_status(f"Módulo Python: {import_name}", pkg_installed, "Instalado" if pkg_installed else "FALTANDO")
            if not pkg_installed:
                all_ok = False
    return all_ok

def check_env_vars(env_path, required_keys):
    if not os.path.exists(env_path):
        return False
    keys_found = {}
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                k, v = line.split('=', 1)
                keys_found[k.strip()] = v.strip()
    
    all_ok = True
    for key in required_keys:
        has_key = key in keys_found and len(keys_found[key]) > 0
        print_status(f"Chave env: {key}", has_key, "Configurada" if has_key else "VAZIA/AUSENTE")
        if not has_key:
            all_ok = False
    return all_ok

def main():
    # Use workspace dir relative to script location or manual configuration
    base_dir = r"c:\ClimaWeb_GIT"
    backend_dir = os.path.join(base_dir, "ClimaWeb", "AdminBackend")
    frontend_dir = os.path.join(base_dir, "ClimaWeb", "ClimaWeb_Admin")
    
    print_header("Diagnóstico Geral - ClimaWeb")
    
    # 1. VERIFICAÇÃO DO BACKEND
    print("\n--- [1] BACKEND ---")
    if check_file(backend_dir):
        # Check config
        env_path = os.path.join(backend_dir, ".env")
        check_file(env_path)
        print("\nVerificando chaves de ambiente backend:")
        check_env_vars(env_path, ["SUPABASE_URL", "SUPABASE_KEY", "TELEGRAM_BOT_TOKEN"])
        
        # Check requirements
        req_path = os.path.join(backend_dir, "requirements.txt")
        check_python_imports(req_path)
        
        # Check Python codes syntax
        print("\nVerificando erros de sintaxe nos scripts:")
        for script in ["bot.py", "server.py"]:
            script_path = os.path.join(backend_dir, script)
            if os.path.exists(script_path):
                res = subprocess.run([sys.executable, "-m", "py_compile", script_path], capture_output=True)
                syntax_ok = res.returncode == 0
                print_status(f"Sintaxe de {script}", syntax_ok, "OK" if syntax_ok else "ERRO")
            else:
                print_status(f"Script {script}", False, "Não encontrado")
    
    # 2. VERIFICAÇÃO DO FRONTEND
    print("\n--- [2] FRONTEND (React / Vite) ---")
    if check_file(frontend_dir):
        # Check node_modules
        node_modules_path = os.path.join(frontend_dir, "node_modules")
        has_node_modules = os.path.exists(node_modules_path)
        print_status("Dependências Node (node_modules)", has_node_modules, "Instaladas" if has_node_modules else "FALTANDO (execute: npm install)")
        
        # Check frontend env
        f_env_path = os.path.join(frontend_dir, ".env")
        check_file(f_env_path)
        print("\nVerificando chaves de ambiente frontend:")
        check_env_vars(f_env_path, ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"])
        
        # Check if index.html and package.json exist
        check_file(os.path.join(frontend_dir, "package.json"))
        check_file(os.path.join(frontend_dir, "index.html"))
        
    # 3. VERIFICAÇÃO DE REDE / SERVIÇOS ATIVOS
    print("\n--- [3] SERVIÇOS E PORTAS ---")
    check_port(5173)  # Vite local default
    check_port(8000)  # FastAPI local default
    
    print("\n" + "="*60)
    print(" FIM DO DIAGNÓSTICO ".center(60, "="))
    print("="*60)

if __name__ == "__main__":
    main()
