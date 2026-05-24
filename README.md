# ClimaWeb 🌦️

Bem-vindo ao repositório do **ClimaWeb**. Este projeto foi atualizado para uma nova arquitetura mais moderna e escalável, abandonando o modelo anterior baseado em Streamlit para adotar um painel de administração em React (Frontend) com um robusto Backend em Python.

## Estrutura do Projeto

O repositório agora está focado na parte administrativa e de monitoramento do sistema ClimaWeb:

- 📂 **`ClimaWeb_Admin/`**: Frontend do painel administrativo.
  - Desenvolvido em **React** + **Vite**.
  - Dashboard interativo para gestão e visualização de dados.
  - Para executar: entre na pasta, instale as dependências (`npm install`) e inicie o servidor de desenvolvimento (`npm run dev`).

- 📂 **`AdminBackend/`**: Backend da aplicação e serviços de monitoramento.
  - Desenvolvido em **Python** (FastAPI/Flask + psutil).
  - Inclui um **Bot do Telegram** (`bot.py`) para monitoramento ao vivo dos recursos da Máquina Virtual (VM) como CPU e RAM.
  - Geração de Dashboards automáticos (com `matplotlib`) via Telegram.
  - Para executar: instale as dependências (`pip install -r requirements.txt`) e rode o servidor (`python server.py`).

## Atualizações Recentes
- **Remoção do Streamlit**: Toda a interface antiga do Streamlit foi descartada para dar lugar a um ecossistema desacoplado (React + Python backend).
- **Monitoramento em Tempo Real**: Novo comando no Telegram bot para acompanhamento dinâmico do uso da máquina em tempo real.
- **Dashboards Nativos**: Geração de gráficos de uso de sistema nativos do backend e enviados diretamente para o Telegram.

## Contribuição
Fique à vontade para fazer _fork_ do projeto e submeter _pull requests_.
