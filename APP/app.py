import streamlit as st
import pandas as pd
import glob
import os
import psutil
import plotly.express as px
import plotly.graph_objects as go
import pygwalker as pyg
import streamlit.components.v1 as components
from datetime import datetime

# ==============
st.set_page_config(
    page_title="Dashboard Climatológico PIBIC",
    page_icon="⛈️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Customização visual com CSS para visual premium (Wow Factor)
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;700;800&display=swap');
    
    /* Tipografia global */
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    h1, h2, h3, h4, h5, h6 {
        font-family: 'Outfit', sans-serif;
        color: var(--text-color);
    }
    
    /* Glassmorphism e Neumorphism adaptativo para Métricas */
    div[data-testid="metric-container"] {
        background-color: var(--secondary-background-color);
        border: 1px solid var(--faded-text-color);
        padding: 20px;
        border-radius: 16px;
        box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
    }
    div[data-testid="metric-container"]:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.2);
        border-color: var(--primary-color);
    }
    div[data-testid="metric-container"]::before {
        content: '';
        position: absolute;
        top: 0; left: 0; width: 100%; height: 4px;
        background: linear-gradient(90deg, #3b82f6, #8b5cf6);
        opacity: 0; transition: opacity 0.3s;
    }
    div[data-testid="metric-container"]:hover::before {
        opacity: 1;
    }
    
    /* Botões Premium */
    .stButton>button {
        border-radius: 10px;
        font-weight: 600;
        transition: all 0.2s;
    }
    
    /* Layout dos Expander */
    .streamlit-expanderHeader {
        font-family: 'Outfit', sans-serif;
        font-weight: 600;
        border-radius: 8px;
    }
    
    /* Cartões de Glossário (usados no markdown) */
    .glossary-card {
        background-color: var(--secondary-background-color);
        border-radius: 12px; padding: 20px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        margin-bottom: 15px;
        transition: transform 0.2s, box-shadow 0.2s;
    }
    .glossary-card:hover { 
        transform: scale(1.02); 
        box-shadow: 0 10px 15px rgba(0,0,0,0.2);
    }
</style>
""", unsafe_allow_html=True)

# Glossário estático com cores coordenadas para cada massa de ar
GLOSSARIO = {
    'mEc': {
        'nome': 'Massa Equatorial Continental',
        'carac': 'Quente e extremamente úmida',
        'origem': 'Região Amazônica',
        'atuacao': 'Domina grande parte do país no verão, causando chuvas de fim de tarde intensas e calor. Recua bastante no inverno.',
        'cor': '#ef4444' # Vermelho vibrante
    },
    'mEa': {
        'nome': 'Massa Equatorial Atlântica',
        'carac': 'Quente e úmida',
        'origem': 'Oceano Atlântico Norte (próximo à Linha do Equador)',
        'atuacao': 'Atua no litoral norte e nordeste do Brasil, trazendo ventos úmidos e chuvas frequentes para essa faixa.',
        'cor': '#f97316' # Laranja
    },
    'mTa': {
        'nome': 'Massa Tropical Atlântica',
        'carac': 'Quente e úmida',
        'origem': 'Oceano Atlântico Sul (próximo ao Trópico de Capricórnio)',
        'atuacao': 'Atua durante todo o ano sobre o litoral brasileiro, trazendo umidade e ventos constantes para o Sudeste, Sul e Nordeste.',
        'cor': '#3b82f6' # Azul brilhante
    },
    'mTc': {
        'nome': 'Massa Tropical Continental',
        'carac': 'Quente e seca',
        'origem': 'Depressão do Chaco (fronteira Paraguai/Argentina)',
        'atuacao': 'Gera períodos de calor intenso e baixíssima umidade do ar no Centro-Oeste, Sudeste e Sul, especialmente no fim do inverno.',
        'cor': '#eab308' # Amarelo/Dourado
    },
    'mPa': {
        'nome': 'Massa Polar Atlântica',
        'carac': 'Fria e úmida',
        'origem': 'Oceano Atlântico Sul (alta latitude, perto da Antártida)',
        'atuacao': 'Causa frentes frias, declínio acentuado de temperatura, geadas no Sul/Sudeste e friagem no sul da Amazônia.',
        'cor': '#10b981' # Verde
    },
    'Não Informada': {
        'nome': 'Massa não identificada',
        'carac': 'Sem classificação no banco de dados',
        'origem': 'Indeterminada',
        'atuacao': 'Período sem registro ou análise descritiva conclusiva.',
        'cor': '#94a3b8' # Slate (Cinza claro premium)
    }
}

# ================= 1.5 FUNÇÕES DE APOIO VISUAL =================
def renderizar_mapa_svg(dados_dia=None):
    """
    Renderiza um mapa geométrico do Brasil com 5 regiões coloridas.
    dados_dia: dicionário { 'Norte': 'mEc', 'Sul': 'mPa', ... }
    """
    cor_norte = "#e2e8f0"; cor_nordeste = "#e2e8f0"; cor_centro = "#e2e8f0"
    cor_sul = "#e2e8f0"; cor_litoral = "#cbd5e1"
    
    if dados_dia is not None:
        if 'Norte' in dados_dia and dados_dia['Norte'] in GLOSSARIO: cor_norte = GLOSSARIO[dados_dia['Norte']]['cor']
        if 'Nordeste' in dados_dia and dados_dia['Nordeste'] in GLOSSARIO: cor_nordeste = GLOSSARIO[dados_dia['Nordeste']]['cor']
        if 'Centro' in dados_dia and dados_dia['Centro'] in GLOSSARIO: cor_centro = GLOSSARIO[dados_dia['Centro']]['cor']
        if 'Sul' in dados_dia and dados_dia['Sul'] in GLOSSARIO: cor_sul = GLOSSARIO[dados_dia['Sul']]['cor']
        if 'Litoral' in dados_dia and dados_dia['Litoral'] in GLOSSARIO: cor_litoral = GLOSSARIO[dados_dia['Litoral']]['cor']

    svg_html = f"""
    <div style="display: flex; justify-content: center; align-items: center; padding: 20px; background: rgba(255,255,255,0.7); border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.03); margin: 10px 0;">
        <svg viewBox="0 0 500 500" width="100%" style="max-width: 400px; filter: drop-shadow(0px 10px 15px rgba(0,0,0,0.1));">
            <defs>
                <style>
                    .br-region {{ transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); stroke: #ffffff; stroke-width: 3; stroke-linejoin: round; cursor: pointer; }}
                    .br-region:hover {{ filter: brightness(1.15); transform: scale(1.03); stroke-width: 2; }}
                    .reg-norte {{ fill: {cor_norte}; transform-origin: 150px 150px; }}
                    .reg-nordeste {{ fill: {cor_nordeste}; transform-origin: 350px 150px; }}
                    .reg-centro {{ fill: {cor_centro}; transform-origin: 260px 280px; }}
                    .reg-sul {{ fill: {cor_sul}; transform-origin: 250px 420px; }}
                    .reg-litoral {{ fill: {cor_litoral}; stroke-width: 4; transform-origin: 400px 250px; opacity: 0.95; }}
                </style>
            </defs>
            <!-- Norte -->
            <path class="br-region reg-norte" d="M 40,200 L 140,60 L 250,60 L 280,180 L 240,260 L 150,260 Z"><title>Região Norte</title></path>
            <!-- Nordeste -->
            <path class="br-region reg-nordeste" d="M 250,60 L 410,100 L 430,150 L 370,240 L 280,180 Z"><title>Região Nordeste</title></path>
            <!-- Centro -->
            <path class="br-region reg-centro" d="M 150,260 L 240,260 L 280,180 L 370,240 L 340,360 L 220,360 Z"><title>Região Centro-Oeste/Sudeste</title></path>
            <!-- Sul -->
            <path class="br-region reg-sul" d="M 220,360 L 300,360 L 280,470 L 230,470 Z"><title>Região Sul</title></path>
            <!-- Litoral -->
            <path class="br-region reg-litoral" d="M 410,100 L 440,110 L 460,160 L 400,280 L 340,380 L 300,360 L 340,340 L 370,240 L 430,150 Z"><title>Faixa Litorânea</title></path>
        </svg>
    </div>
    """
    return svg_html

# ================= 2. CARREGAMENTO, LIMPEZA E INTEGRAÇÃO DE DADOS =================
from supabase import create_client, Client

@st.cache_resource
def obter_cliente_supabase() -> Client:
    try:
        url = st.secrets["connections"]["supabase"]["SUPABASE_URL"]
        key = st.secrets["connections"]["supabase"]["SUPABASE_KEY"]
    except Exception:
        url = st.secrets.get("SUPABASE_URL")
        key = st.secrets.get("SUPABASE_KEY")
        
    if not url or not key:
        st.error("Erro: Credenciais do Supabase não configuradas no secrets.toml.")
        st.stop()
        
    return create_client(url, key)

@st.cache_data(ttl=600)
def carregar_dados():
    try:
        supabase = obter_cliente_supabase()
        
        # Carregamento paginado de todos os registros da tabela clima_registros
        all_data = []
        chunk_size = 1000
        start = 0
        while True:
            res = supabase.table("clima_registros").select("*").range(start, start + chunk_size - 1).execute()
            data = res.data
            if not data:
                break
            all_data.extend(data)
            if len(data) < chunk_size:
                break
            start += chunk_size
            
        if not all_data:
            raise ValueError("Nenhum dado encontrado no Supabase (tabela clima_registros).")
            
        df_all = pd.DataFrame(all_data)
        
        # Mapeamento de colunas para manter compatibilidade absoluta com o código existente do app
        df_all['DATA EXIBIÇÃO'] = pd.to_datetime(df_all['data_exibicao']).dt.date
        df_all['DATA CARTA_LIMPA'] = pd.to_datetime(df_all['data_exibicao'])
        df_all['REGIÃO'] = df_all['regiao']
        df_all['MASSA DE AR'] = df_all['massa_de_ar_final']  # A base principal do app usa a Massa Corrigida/Validada!
        df_all['MASSA DE AR IA'] = df_all['massa_de_ar_ia']
        df_all['STATUS DA INFORMAÇÃO'] = df_all['status_informacao']
        df_all['DESCRIÇÃO'] = df_all['descricao'].fillna('')
        df_all['ESTAÇÃO'] = df_all['estacao']
        
        # Metadados de tempo
        df_all['ANO'] = df_all['DATA CARTA_LIMPA'].dt.year
        df_all['MÊS_NUM'] = df_all['DATA CARTA_LIMPA'].dt.month
        df_all['MÊS_NOME'] = df_all['DATA CARTA_LIMPA'].dt.strftime('%B')
        
        meses_pt = {
            'January': 'Janeiro', 'February': 'Fevereiro', 'March': 'Março',
            'April': 'Abril', 'May': 'Maio', 'June': 'Junho',
            'July': 'Julho', 'August': 'Agosto', 'September': 'Setembro',
            'October': 'Outubro', 'November': 'Novembro', 'December': 'Dezembro'
        }
        df_all['MÊS_PT'] = df_all['MÊS_NOME'].map(meses_pt)
        
        return df_all
    except Exception as e:
        raise RuntimeError(f"Erro ao carregar dados do Supabase: {e}")

try:
    df = carregar_dados()
except Exception as e:
    st.error(f"Erro crítico ao processar planilhas de dados: {e}")
    st.stop()

# ================= 3. INICIALIZAÇÃO DE ESTADOS DOS FILTROS E CONFIGS =================
if 'f_anos' not in st.session_state: st.session_state.f_anos = sorted(df['ANO'].unique())
if 'f_regioes' not in st.session_state: st.session_state.f_regioes = sorted(df['REGIÃO'].unique())
if 'f_estacoes' not in st.session_state: st.session_state.f_estacoes = sorted(df['ESTAÇÃO'].unique())
if 'f_massas' not in st.session_state: st.session_state.f_massas = sorted(df['MASSA DE AR'].unique())
if 'f_status' not in st.session_state: st.session_state.f_status = sorted(df['STATUS DA INFORMAÇÃO'].unique())

# Valores iniciais para caminhos do laboratório
app_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(app_dir)

# Valores iniciais para caminhos do laboratório
if 'dir_cartas' not in st.session_state: st.session_state.dir_cartas = os.path.join(parent_dir, "cartas")
if 'dir_gabarito' not in st.session_state: st.session_state.dir_gabarito = os.path.join(parent_dir, "resultado_debug_inmet.jpg")

# ================= 4. BARRA LATERAL (MENU E FILTROS) =================
st.sidebar.markdown("<h2>⚙️ Configurações</h2>", unsafe_allow_html=True)
with st.sidebar.expander("📂 Caminhos dos Arquivos locais (Imagens)", expanded=False):
    st.session_state.dir_cartas = st.text_input("Diretório de Cartas Sinóticas", st.session_state.dir_cartas)
    st.session_state.dir_gabarito = st.text_input("Gabarito de Debug IA", st.session_state.dir_gabarito)
    st.caption("Ajuste os caminhos acima se estiver rodando em outro computador ou HD externo.")

st.sidebar.markdown("---")
st.sidebar.markdown("<h2>🔍 Filtros de Análise</h2>", unsafe_allow_html=True)

col_b1, col_b2 = st.sidebar.columns(2)
with col_b1:
    if st.sidebar.button("🔄 Resetar"):
        st.session_state.f_anos = sorted(df['ANO'].unique())
        st.session_state.f_regioes = sorted(df['REGIÃO'].unique())
        st.session_state.f_estacoes = sorted(df['ESTAÇÃO'].unique())
        st.session_state.f_massas = sorted(df['MASSA DE AR'].unique())
        st.session_state.f_status = sorted(df['STATUS DA INFORMAÇÃO'].unique())
        st.rerun()
with col_b2:
    if st.sidebar.button("🧹 Limpar"):
        st.session_state.f_anos = []
        st.session_state.f_regioes = []
        st.session_state.f_estacoes = []
        st.session_state.f_massas = []
        st.session_state.f_status = []
        st.rerun()

anos_selecionados = st.sidebar.multiselect("Ano(s):", options=sorted(df['ANO'].unique()), key="f_anos")
regioes_selecionadas = st.sidebar.multiselect("Região(ões):", options=sorted(df['REGIÃO'].unique()), key="f_regioes")
estacoes_selecionadas = st.sidebar.multiselect("Estação(ões):", options=sorted(df['ESTAÇÃO'].unique()), key="f_estacoes")
massas_selecionadas = st.sidebar.multiselect("Massa(s) de Ar:", options=sorted(df['MASSA DE AR'].unique()), key="f_massas")

st.sidebar.markdown("### 🚦 Qualidade dos Dados")
status_selecionados = st.sidebar.multiselect(
    "Filtrar por Status da IA/Validação:",
    options=sorted(df['STATUS DA INFORMAÇÃO'].unique()),
    key="f_status"
)

busca_rapida = st.sidebar.text_input("🔍 Busca textual nas cartas:", "")

st.sidebar.markdown("---")
st.sidebar.markdown(
    "<div style='text-align: center; padding: 10px 0; color: var(--faded-text-color); font-size: 0.85rem;'>"
    "Criado e desenvolvido por<br><strong style='color: var(--text-color); font-size: 1rem;'>Rafael Guedes</strong> & <strong>LCGEA</strong> 🌍"
    "</div>", 
    unsafe_allow_html=True
)

# Monitor de Memória RAM
process = psutil.Process(os.getpid())
mem_mb = process.memory_info().rss / (1024 ** 2)
st.sidebar.markdown("---")
st.sidebar.metric(label="💻 Consumo de Memória (RAM)", value=f"{mem_mb:.1f} MB", help="Monitor de performance em tempo real do servidor. Atualiza a cada clique/interação.")

# Aplicação dinâmica
df_filtrado = df.copy()
if anos_selecionados: df_filtrado = df_filtrado[df_filtrado['ANO'].isin(anos_selecionados)]
if regioes_selecionadas: df_filtrado = df_filtrado[df_filtrado['REGIÃO'].isin(regioes_selecionadas)]
if estacoes_selecionadas: df_filtrado = df_filtrado[df_filtrado['ESTAÇÃO'].isin(estacoes_selecionadas)]
if massas_selecionadas: df_filtrado = df_filtrado[df_filtrado['MASSA DE AR'].isin(massas_selecionadas)]
if status_selecionados: df_filtrado = df_filtrado[df_filtrado['STATUS DA INFORMAÇÃO'].isin(status_selecionados)]
if busca_rapida: df_filtrado = df_filtrado[df_filtrado['DESCRIÇÃO'].str.contains(busca_rapida, case=False, na=False)]

if df_filtrado.empty:
    st.title("⛈️ Painel de Análise de Massas de Ar no Brasil")
    st.warning("⚠️ Nenhum registro encontrado para os filtros aplicados.")
    st.stop()

# ================= 5. CABEÇALHO DO DASHBOARD =================
st.title("⛈️ Painel Climatológico PIBIC")
st.markdown("Plataforma acadêmica avançada de análise sinótica, distribuição climatológica e auditoria de modelos de IA preditivos.")
st.markdown("---")

# ================= 6. MÉTRICAS EM DESTAQUE =================
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric(label="Total de Registros Analisados", value=f"{len(df_filtrado):,}".replace(",", "."), help="Considerando os filtros aplicados na barra lateral")

with col2:
    massa_dominante = df_filtrado['MASSA DE AR'].mode()[0] if not df_filtrado.empty else "N/A"
    pct_massa = (len(df_filtrado[df_filtrado['MASSA DE AR'] == massa_dominante]) / len(df_filtrado)) * 100 if len(df_filtrado) > 0 else 0
    st.metric(label="Massa Dominante (Real/Corrigida)", value=f"{massa_dominante}", delta=f"{pct_massa:.1f}% do tempo")

with col3:
    auditados = len(df_filtrado[df_filtrado['STATUS DA INFORMAÇÃO'] != '100% IA (Não Validado)'])
    pct_auditados = (auditados / len(df_filtrado)) * 100 if len(df_filtrado) > 0 else 0
    st.metric(label="Dados Humanos Auditados", value=f"{auditados}", delta=f"{pct_auditados:.1f}% da base", delta_color="normal")

with col4:
    erros = len(df_filtrado[df_filtrado['STATUS DA INFORMAÇÃO'] == 'Corrigido Humano (IA Errou)'])
    st.metric(label="Correções da IA (Divergências)", value=f"{erros} ocorrências", delta="Melhoria no banco de dados", delta_color="inverse")

st.markdown("---")

# ================= 7. ABAS PRINCIPAIS =================
aba1, aba2, aba3, aba4, aba5, aba6 = st.tabs([
    "📊 Distribuição Espacial", 
    "📈 Sazonalidade", 
    "🔍 Relatório Interativo Diário",
    "📖 Guia de Massas de Ar",
    "🔬 Laboratório PyGWalker",
    "🎯 Dashboard de Performance da IA"
])

# ----------------- ABA 1: DISTRIBUIÇÃO CLIMATOLÓGICA E MAPA -----------------
with aba1:
    st.subheader("Análise Espacial das Massas de Ar")
    
    col_g1, col_g2 = st.columns([1.2, 0.8])
    with col_g1:
        # Treemap por região (usando a MASSA DE AR Real/Corrigida)
        df_tree = df_filtrado.groupby(['REGIÃO', 'MASSA DE AR']).size().reset_index(name='Dias')
        fig_tree = px.treemap(
            df_tree, path=[px.Constant("Brasil"), 'REGIÃO', 'MASSA DE AR'], values='Dias',
            color='MASSA DE AR', color_discrete_map={k: v['cor'] for k, v in GLOSSARIO.items()},
            title="Distribuição Proporcional por Região"
        )
        fig_tree.update_layout(margin={"r":0,"t":40,"l":0,"b":0})
        st.plotly_chart(fig_tree, use_container_width=True)
        
    with col_g2:
        st.markdown("**Representação Geográfica Simplificada**")
        st.markdown("<small>Massa predominante no filtro atual, ou visão do conjunto:</small>", unsafe_allow_html=True)
        # Identificar massa de ar mais frequente por região no recorte atual para pintar o mapa
        massa_por_regiao = {}
        for regiao in df_filtrado['REGIÃO'].unique():
            df_reg = df_filtrado[df_filtrado['REGIÃO'] == regiao]
            if not df_reg.empty:
                massa_freq = df_reg['MASSA DE AR'].mode()[0]
                massa_por_regiao[regiao] = massa_freq
                
        st.markdown(renderizar_mapa_svg(massa_por_regiao), unsafe_allow_html=True)

# ----------------- ABA 2: EVOLUÇÃO E SAZONALIDADE -----------------
with aba2:
    st.subheader("Comportamento ao Longo do Tempo")
    
    # 1. Gráfico de Área Empilhada (Evolução Mensal no Tempo)
    df_filtrado['ANO_MES'] = pd.to_datetime(df_filtrado['DATA CARTA_LIMPA']).dt.to_period('M').astype(str)
    df_tempo = df_filtrado.groupby(['ANO_MES', 'MASSA DE AR']).size().reset_index(name='Dias')
    
    fig_area = px.area(
        df_tempo, x="ANO_MES", y="Dias", color="MASSA DE AR",
        title="Histórico Mensal de Atuação das Massas de Ar",
        labels={"ANO_MES": "Mês/Ano", "Dias": "Quantidade de Dias", "MASSA DE AR": "Massa de Ar"},
        color_discrete_map={k: v['cor'] for k, v in GLOSSARIO.items()}, template="plotly_white"
    )
    fig_area.update_xaxes(tickangle=45)
    st.plotly_chart(fig_area, use_container_width=True)
    
    col_tempo1, col_tempo2 = st.columns(2)
    
    with col_tempo1:
        # Heatmap Mensal de Ocorrências
        st.subheader("Intensidade Mensal (Sazonalidade)")
        df_heat = df_filtrado.groupby(['MÊS_PT', 'MÊS_NUM', 'MASSA DE AR']).size().reset_index(name='Dias')
        df_heat = df_heat.sort_values('MÊS_NUM')
        
        pivot_df = df_heat.pivot(index='MASSA DE AR', columns='MÊS_PT', values='Dias').fillna(0)
        meses_ordenados = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
        meses_atuais = [m for m in meses_ordenados if m in pivot_df.columns]
        
        if meses_atuais:
            pivot_df = pivot_df[meses_atuais]
            fig_heat = px.imshow(
                pivot_df, labels=dict(x="Mês do Ano", y="Massa de Ar", color="Dias"),
                x=meses_atuais, y=pivot_df.index,
                title="Calendário de Atuação Médio (Dias acumulados por Mês)",
                color_continuous_scale="Blues", template="plotly_white", aspect="auto"
            )
            st.plotly_chart(fig_heat, use_container_width=True)
        else:
            st.info("Filtros atuais impedem a geração do Heatmap mensal.")
            
    with col_tempo2:
        st.subheader("Frequência de Massas por Estação do Ano")
        st.markdown("<small>Estações do ano inferidas astronomicamente.</small>", unsafe_allow_html=True)
        df_estacao_valido = df_filtrado[df_filtrado['ESTAÇÃO'] != "Não Informada"]
        if not df_estacao_valido.empty:
            fig_estacao = px.histogram(
                df_estacao_valido, x="ESTAÇÃO", color="MASSA DE AR", barnorm="percent",
                title="Proporção Relativa (%) em cada Estação",
                category_orders={"ESTAÇÃO": ["Verão", "Outono", "Inverno", "Primavera"]},
                color_discrete_map={k: v['cor'] for k, v in GLOSSARIO.items()}, template="plotly_white"
            )
            st.plotly_chart(fig_estacao, use_container_width=True)
        else:
            st.info("Não há estações detectadas no filtro.")

# ----------------- ABA 3: DETALHAMENTO & BUSCA -----------------
with aba3:
    st.subheader("Laboratório Sinótico Diário")
    
    col_tabela, col_mapa = st.columns([2.2, 1.5])
    
    with col_tabela:
        st.info("💡 **Dica:** Clique na caixa de seleção de uma data na tabela abaixo. O mapa do Brasil à direita se ajustará para exibir exatamente a condição sinótica daquele dia!")
        
        # Reconstrói a base original ignorando as correções da auditoria
        df_original = df_filtrado.copy()
        if 'MASSA_IA_ORIGINAL' in df_original.columns:
            mask_revert = df_original['MASSA_IA_ORIGINAL'].notna()
            df_original.loc[mask_revert, 'MASSA DE AR'] = df_original.loc[mask_revert, 'MASSA_IA_ORIGINAL']
            df_original.loc[mask_revert, 'STATUS DA INFORMAÇÃO'] = "100% IA (Revertido)"
            
        modo_visualizacao = st.radio("🔎 Selecione a versão da tabela para visualizar:", ["Base Validada (Correções Humanas)", "Base Original (Apenas IA)"], horizontal=True)
        
        col_down1, col_down2 = st.columns(2)
        with col_down1:
            csv_corrigido = df_filtrado.to_csv(index=False).encode('utf-8')
            st.download_button("📥 Baixar Base (Com Validações)", data=csv_corrigido, file_name='clima_dados_validados.csv', mime='text/csv', use_container_width=True)
            
        with col_down2:
            # Remove as colunas de controle para entregar a planilha pura no download
            df_original_download = df_original.drop(columns=['Massa_Real', 'IA_Acertou', 'STATUS DA INFORMAÇÃO', 'MASSA_IA_ORIGINAL', 'Região_Clean', 'DataStr'], errors='ignore')
            csv_original = df_original_download.to_csv(index=False).encode('utf-8')
            st.download_button("📥 Baixar Base (Original IA)", data=csv_original, file_name='clima_dados_originais.csv', mime='text/csv', use_container_width=True)

        if modo_visualizacao == "Base Original (Apenas IA)":
            df_tabela = df_original.copy()
        else:
            df_tabela = df_filtrado.copy()
            
        event = st.dataframe(
            df_tabela[['DATA EXIBIÇÃO', 'REGIÃO', 'MASSA DE AR', 'ESTAÇÃO', 'STATUS DA INFORMAÇÃO', 'DESCRIÇÃO']],
            on_select="rerun", selection_mode="single-row", use_container_width=True, hide_index=True, height=600
        )
        
        selected_row_idx = None
        if event and isinstance(event, dict) and "selection" in event and "rows" in event["selection"] and event["selection"]["rows"]:
            selected_row_idx = event["selection"]["rows"][0]
        elif event and hasattr(event, "selection") and hasattr(event.selection, "rows") and event.selection.rows:
            selected_row_idx = event.selection.rows[0]

    with col_mapa:
        if selected_row_idx is not None and selected_row_idx < len(df_tabela):
            row_data = df_tabela.iloc[selected_row_idx]
            data_sel = row_data['DATA EXIBIÇÃO']
            
            st.markdown(f"### 📅 Brasil: {data_sel}")
            
            # Painel de Avisos sobre Validação deste dia específico
            df_dia_original = df_filtrado[df_filtrado['DATA EXIBIÇÃO'] == data_sel]
            qtd_regioes = len(df_dia_original)
            mask_auditado = ~df_dia_original['STATUS DA INFORMAÇÃO'].str.contains("100% IA")
            qtd_auditadas = mask_auditado.sum()
            
            if qtd_auditadas > 0 and qtd_auditadas < qtd_regioes:
                regioes_faltantes = df_dia_original.loc[~mask_auditado, 'REGIÃO'].tolist()
                faltantes_str = ", ".join(regioes_faltantes)
                st.warning(f"⚠️ **Auditoria Incompleta:** Você validou {qtd_auditadas} das {qtd_regioes} regiões detectadas para este dia. Restam auditar: **{faltantes_str}**")
            elif qtd_auditadas == qtd_regioes:
                st.success("✅ **Análise Completa:** Todas as regiões deste dia já foram rigorosamente auditadas por você.")
            
            # Usamos df_tabela para que o mapa respeite se o usuário escolheu ver a Base Original ou Validada
            df_dia_completo = df_tabela[df_tabela['DATA EXIBIÇÃO'] == data_sel]
            mapa_dict = dict(zip(df_dia_completo['REGIÃO'], df_dia_completo['MASSA DE AR']))
            
            st.markdown(renderizar_mapa_svg(mapa_dict), unsafe_allow_html=True)
            
            legenda_text = "<div style='font-size:0.9rem; margin-top: 10px;'>"
            for r, m in mapa_dict.items():
                cor_m = GLOSSARIO.get(m, GLOSSARIO['Não Informada'])['cor']
                legenda_text += f"<span style='display:inline-block; margin-right:10px;'><span style='color:{cor_m}; font-size:1.2rem;'>●</span> {r}: <strong>{m}</strong></span>"
            legenda_text += "</div>"
            st.markdown(legenda_text, unsafe_allow_html=True)
            
            info_massa = GLOSSARIO.get(row_data['MASSA DE AR'], GLOSSARIO['Não Informada'])
            cor_badge = "#10b981" if "Humano" in row_data['STATUS DA INFORMAÇÃO'] else "#94a3b8"
            
            st.markdown(f"""
            <div style="background-color: {info_massa['cor']}10; border-left: 4px solid {info_massa['cor']}; padding: 15px; border-radius: 8px; margin-top: 15px;">
                <h5 style="margin-top:0;">{row_data['REGIÃO']} (Selecionada na Tabela)</h5>
                <p style="margin-bottom: 5px;"><strong>Massa de Ar:</strong> {row_data['MASSA DE AR']}</p>
                <p style="margin-bottom: 10px;">🛡️ <span style="color: {cor_badge}; font-weight: 600;">{row_data['STATUS DA INFORMAÇÃO']}</span></p>
                <div style="font-size: 0.95rem; color: var(--text-color); background: rgba(128,128,128,0.1); padding: 10px; border-radius: 6px;">
                    {row_data['DESCRIÇÃO']}
                </div>
            </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown("### 🗺️ Mapa do Brasil")
            st.markdown("<p style='color: var(--faded-text-color);'>Selecione uma linha na tabela ao lado para visualizar a distribuição nacional das massas de ar neste mapa.</p>", unsafe_allow_html=True)
            st.markdown(renderizar_mapa_svg({}), unsafe_allow_html=True)

# ----------------- ABA 4: GUIA DE MASSAS DE AR (GLOSSÁRIO GRID) -----------------
with aba4:
    st.subheader("📚 Glossário de Massas de Ar no Brasil")
    st.caption("Clique em 'Ler explicação detalhada' nos cartões abaixo para expandir e entender como cada massa atua no clima do país.")
    
    st.markdown("""
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
    """, unsafe_allow_html=True)
    
    # Criar um grid bonito para cada massa
    cols_gloss = st.columns(3)
    for i, (sigla, info) in enumerate(GLOSSARIO.items()):
        if sigla == "Não Informada": continue
        with cols_gloss[i % 3]:
            html_card = f"""
<div class="glossary-card" style="border-left: 6px solid {info['cor']};">
<h2 style="color: {info['cor']}; margin: 0 0 10px 0; font-size: 1.5rem;">{sigla}</h2>
<strong style="font-size: 1.1rem; color: var(--text-color);">{info['nome']}</strong>
<p style="margin: 10px 0 5px 0; color: var(--faded-text-color); font-size: 0.95rem;">📍 <strong>Origem:</strong> {info['origem']}</p>
<p style="margin: 0 0 10px 0; color: var(--faded-text-color); font-size: 0.95rem;">🌡️ <strong>Clima:</strong> {info['carac']}</p>
<details style="padding-top: 10px; border-top: 1px solid rgba(128,128,128,0.2);">
<summary style="cursor: pointer; font-weight: 600; color: {info['cor']}; list-style-position: inside;">📖 Ler explicação detalhada</summary>
<p style="margin-top: 12px; line-height: 1.6; color: var(--text-color); font-size: 0.95rem; background-color: rgba(128,128,128,0.05); padding: 12px; border-radius: 8px;">
<strong>Atuação:</strong><br>{info['atuacao']}
</p>
</details>
</div>
"""
            st.markdown(html_card, unsafe_allow_html=True)

# ----------------- ABA 5: LABORATÓRIO DE DADOS (PYGWALKER) -----------------
with aba5:
    st.subheader("🔬 Laboratório de Dados (PyGWalker)")
    with st.spinner("Iniciando ambiente PyGWalker..."):
        try:
            df_pyg = df_filtrado.copy()
            for col in df_pyg.select_dtypes(include=['datetime64[ns]', 'period[M]']).columns:
                df_pyg[col] = df_pyg[col].astype(str)
            pyg_html = pyg.to_html(df_pyg)
            components.html(pyg_html, height=1000, scrolling=True)
        except Exception as e:
            st.error(f"Erro ao carregar o PyGWalker: {e}")

# ----------------- ABA 6: DASHBOARD DE PERFORMANCE DA IA -----------------
with aba6:
    st.subheader("🎯 Auditoria Humana e Performance do Modelo de IA")
    st.markdown("Valide o diagnóstico gerado pela IA utilizando as imagens originais do INMET. O feedback alimenta diretamente todos os painéis e gráficos analíticos do dashboard (como você pode ver nas outras abas).")
    
    aba_validacao, aba_metricas = st.tabs(["📝 Módulo de Validação", "📊 Estatísticas da IA"])
    
    with aba_validacao:
        st.markdown("### 📋 To-Do List (Auditorias Incompletas)")
        
        # Lógica para achar dias com análises pela metade
        df_filtrado_safe = df_filtrado.copy()
        df_filtrado_safe['Is_Auditado'] = ~df_filtrado_safe['STATUS DA INFORMAÇÃO'].str.contains("100% IA")
        
        def resumo_auditoria(group):
            total = len(group)
            auditados = group['Is_Auditado'].sum()
            faltantes = group.loc[~group['Is_Auditado'], 'REGIÃO'].tolist()
            return pd.Series({
                'Total': total,
                'Auditados': auditados,
                'Faltantes': ", ".join(faltantes)
            })
            
        df_audit_status = df_filtrado_safe.groupby('DATA EXIBIÇÃO').apply(resumo_auditoria).reset_index()
        
        dias_incompletos = df_audit_status[(df_audit_status['Auditados'] > 0) & (df_audit_status['Auditados'] < df_audit_status['Total'])]
        
        if not dias_incompletos.empty:
            st.warning(f"⚠️ Atenção! Você iniciou a auditoria de **{len(dias_incompletos)} dia(s)**, mas esqueceu de validar todas as regiões neles. Para garantir a qualidade dos dados, selecione e finalize as datas abaixo:")
            cols_pend = st.columns(4)
            for i, row in enumerate(dias_incompletos.itertuples()):
                if i < 12:
                    with cols_pend[i % 4]:
                        st.markdown(f"<div style='margin-bottom: 10px;'>🗓️ <strong>{row._1}</strong> ({row.Auditados}/{row.Total})<br><small style='color: var(--faded-text-color);'>Falta: {row.Faltantes}</small></div>", unsafe_allow_html=True)
            if len(dias_incompletos) > 12:
                st.caption(f"...e mais {len(dias_incompletos) - 12} dias parcialmente concluídos não exibidos.")
        else:
            st.success("✅ Excelente trabalho! Você não deixou nenhum dia com auditorias incompletas ou pela metade no banco de dados atual.")
            
        st.markdown("---")
        
        col_img, col_form = st.columns([1.2, 1])
        
        # Recuperar auditorias do Supabase
        def carregar_auditoria():
            try:
                supabase = obter_cliente_supabase()
                res = supabase.table("clima_registros").select("*").neq("status_informacao", "100% IA (Não Validado)").execute()
                data = res.data
                if not data:
                    return pd.DataFrame(columns=['Data', 'Região', 'Massa_IA', 'IA_Acertou', 'Massa_Real', 'Data_Verificacao'])
                
                df_audit = pd.DataFrame(data)
                df_audit['Data'] = df_audit['data_exibicao']
                df_audit['Região'] = df_audit['regiao']
                df_audit['Massa_IA'] = df_audit['massa_de_ar_ia']
                df_audit['Massa_Real'] = df_audit['massa_de_ar_final']
                df_audit['Data_Verificacao'] = df_audit['data_verificacao']
                df_audit['IA_Acertou'] = df_audit.apply(
                    lambda r: 'Sim' if r['massa_de_ar_ia'] == r['massa_de_ar_final'] else 'Não',
                    axis=1
                )
                return df_audit[['Data', 'Região', 'Massa_IA', 'IA_Acertou', 'Massa_Real', 'Data_Verificacao']]
            except Exception as e:
                st.error(f"Erro ao carregar logs de auditoria do Supabase: {e}")
                return pd.DataFrame(columns=['Data', 'Região', 'Massa_IA', 'IA_Acertou', 'Massa_Real', 'Data_Verificacao'])

        datas_disponiveis = sorted(df_filtrado['DATA EXIBIÇÃO'].astype(str).unique())
        
        with col_form:
            st.markdown("### Selecionar Relatório Diário")
            if not datas_disponiveis:
                st.warning("Nenhum dado disponível.")
            else:
                data_sel = st.selectbox("Data da Carta Sinótica:", datas_disponiveis)
                df_data = df_filtrado[df_filtrado['DATA EXIBIÇÃO'].astype(str) == data_sel]
                regiao_sel = st.selectbox("Região a ser Avaliada:", sorted(df_data['REGIÃO'].unique()))
                
                if regiao_sel:
                    registro = df_data[df_data['REGIÃO'] == regiao_sel].iloc[0]
                    # Importante: Como o dashboard já funde os dados de auditoria, temos a MASSA DE AR IA guardada e a MASSA REAL
                    massa_original_ia = registro.get('MASSA DE AR IA', registro['MASSA DE AR'])
                    status_atual = registro.get('STATUS DA INFORMAÇÃO', '100% IA (Não Validado)')
                    
                    st.info(f"🤖 **Diagnóstico Inicial da IA:** {massa_original_ia}\n\n🛡️ **Status Atual:** {status_atual}")
                    
                    with st.container(border=True):
                        st.markdown("**Validar Inteligência Artificial:**")
                        ia_acertou = st.radio("A classificação original da IA estava correta?", ["Sim", "Não"], horizontal=True)
                        massa_final = massa_original_ia
                        if ia_acertou == "Não":
                            massa_real_sel = st.selectbox("Indique a verdadeira Massa de Ar atuante:", list(GLOSSARIO.keys()), index=0)
                            massa_final = massa_real_sel
                            
                        if st.button("Salvar Validação no Banco de Dados", type="primary", use_container_width=True):
                            status_val = 'Validado Humano (IA Acertou)' if ia_acertou == "Sim" else 'Corrigido Humano (IA Errou)'
                            data_verif = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                            
                            try:
                                supabase = obter_cliente_supabase()
                                supabase.table("clima_registros").update({
                                    "massa_de_ar_final": massa_final,
                                    "status_informacao": status_val,
                                    "data_verificacao": data_verif
                                }).match({
                                    "data_exibicao": data_sel,
                                    "regiao": regiao_sel
                                }).execute()
                                
                                carregar_dados.clear() # Limpa o cache
                                st.success("✅ Validação salva no Supabase! O Dashboard inteiro será recarregado.")
                                st.rerun()
                            except Exception as e:
                                st.error(f"Erro ao salvar validação no Supabase: {e}")

        with col_img:
            st.markdown("### Cartas e Gabaritos (Consultas Externas)")
            # Busca de imagens nas pastas configuradas (st.session_state)
            dir_cartas = st.session_state.dir_cartas
            caminho_gabarito = st.session_state.dir_gabarito
            
            if not datas_disponiveis: pass
            else:
                data_formatada = str(data_sel).replace("-", "")
                if os.path.exists(dir_cartas):
                    padrao = os.path.join(dir_cartas, "**", f"*{data_formatada}*.*")
                    imagens = [f for f in glob.glob(padrao, recursive=True) if any(f.lower().endswith(e) for e in ['.png', '.jpg', '.jpeg'])]
                    if imagens:
                        st.image(imagens[0], caption=f"Carta Sinótica Oficial (INMET) - {data_sel}", use_container_width=True)
                    else:
                        st.warning(f"⚠️ Imagem para o dia {data_sel} não encontrada em {dir_cartas}")
                else:
                    st.error(f"⚠️ Pasta de imagens não encontrada no sistema (Caminho configurado: {dir_cartas}). Acesse 'Configurações' na barra lateral.")
                
                with st.expander("Ver Bounding Boxes / Gabarito da IA"):
                    if not os.path.exists(caminho_gabarito):
                        # Fallback inteligente (busca na raiz do projeto independente de onde esteja)
                        caminho_gabarito = os.path.join(parent_dir, "resultado_debug_inmet.jpg")
                    
                    if os.path.exists(caminho_gabarito):
                        st.image(caminho_gabarito, use_container_width=True)
                    else: 
                        st.warning(f"Gabarito não encontrado em: {caminho_gabarito}")

    with aba_metricas:
        df_auditoria_view = carregar_auditoria()
        if df_auditoria_view.empty:
            st.info("Ainda não há dados validados por especialistas humanos. Realize auditorias para popular as métricas da IA.")
        else:
            total_audit = len(df_auditoria_view)
            acertos = len(df_auditoria_view[df_auditoria_view['IA_Acertou'] == 'Sim'])
            acuracia = (acertos / total_audit) * 100
            
            c1, c2, c3 = st.columns(3)
            c1.metric("Dias Avaliados", total_audit)
            c2.metric("Acurácia Geral do Modelo", f"{acuracia:.1f}%")
            c3.metric("Falsos Positivos/Erros Críticos", total_audit - acertos)
            
            st.markdown("---")
            col_m1, col_m2 = st.columns(2)
            
            with col_m1:
                st.markdown("#### Matriz de Confusão (Previsão vs. Realidade)")
                st.caption("Revela exatamente quais massas de ar a IA está confundindo.")
                cm = pd.crosstab(df_auditoria_view['Massa_Real'], df_auditoria_view['Massa_IA'], rownames=['Correto (Real)'], colnames=['Previsto (IA)'])
                fig_cm = px.imshow(cm, text_auto=True, color_continuous_scale='Blues', aspect="auto")
                st.plotly_chart(fig_cm, use_container_width=True)
                
            with col_m2:
                st.markdown("#### Distribuição de Acertos por Região")
                df_reg_acc = df_auditoria_view.groupby(['Região', 'IA_Acertou']).size().reset_index(name='Qtd')
                fig_bar_acc = px.bar(df_reg_acc, x="Região", y="Qtd", color="IA_Acertou", barmode="group",
                                    color_discrete_map={"Sim": "#10b981", "Não": "#ef4444"})
                st.plotly_chart(fig_bar_acc, use_container_width=True)
                
            st.markdown("#### Histórico de Classificações e Divergências")
            
            modo_edicao = st.toggle("✏️ Ativar Modo de Edição", value=False, help="Habilite para poder editar e deletar registros históricos. Desabilitado por segurança para evitar toques acidentais.")
            
            if modo_edicao:
                st.caption("Modo de Edição Ativo: Você pode **editar** valores (clique duplo na célula) ou **apagar linhas** (selecione a linha à esquerda e pressione Delete).")
            else:
                st.caption("Tabela bloqueada. Ative o 'Modo de Edição' acima caso precise alterar ou apagar algo.")
            
            opcoes_massas = list(GLOSSARIO.keys())
            opcoes_regioes = ['Norte', 'Nordeste', 'Centro', 'Sul', 'Litoral']
            
            edited_df = st.data_editor(
                df_auditoria_view.sort_values(by="Data_Verificacao", ascending=False),
                num_rows="dynamic" if modo_edicao else "fixed",
                disabled=not modo_edicao,
                use_container_width=True,
                key="editor_auditoria",
                column_config={
                    "Região": st.column_config.SelectboxColumn("Região", options=opcoes_regioes, required=True),
                    "Massa_IA": st.column_config.SelectboxColumn("Massa_IA", options=opcoes_massas, required=True),
                    "Massa_Real": st.column_config.SelectboxColumn("Massa_Real", options=opcoes_massas, required=True),
                    "IA_Acertou": st.column_config.SelectboxColumn("IA_Acertou", options=["Sim", "Não"], required=True)
                }
            )
            
            c_save, c_down = st.columns([1, 1])
            with c_save:
                if modo_edicao:
                    if st.button("💾 Salvar Alterações na Tabela", type="primary"):
                        try:
                            original_keys = set(zip(df_auditoria_view['Data'], df_auditoria_view['Região']))
                            edited_keys = set(zip(edited_df['Data'], edited_df['Região']))
                            deleted_keys = original_keys - edited_keys
                            
                            supabase = obter_cliente_supabase()
                            
                            # 1. Resetar auditorias excluídas
                            for d_date, d_reg in deleted_keys:
                                res = supabase.table("clima_registros").select("massa_de_ar_ia").match({
                                    "data_exibicao": d_date,
                                    "regiao": d_reg
                                }).execute()
                                if res.data:
                                    m_ia = res.data[0]['massa_de_ar_ia']
                                    supabase.table("clima_registros").update({
                                        "massa_de_ar_final": m_ia,
                                        "status_informacao": "100% IA (Não Validado)",
                                        "data_verificacao": None
                                    }).match({
                                        "data_exibicao": d_date,
                                        "regiao": d_reg
                                    }).execute()
                                    
                            # 2. Atualizar auditorias alteradas/existentes
                            for _, row in edited_df.iterrows():
                                orig_row = df_auditoria_view[(df_auditoria_view['Data'] == row['Data']) & (df_auditoria_view['Região'] == row['Região'])]
                                ia_correct = 'Sim' if row['Massa_IA'] == row['Massa_Real'] else 'Não'
                                status_val = 'Validado Humano (IA Acertou)' if ia_correct == "Sim" else 'Corrigido Humano (IA Errou)'
                                
                                should_update = True
                                if not orig_row.empty:
                                    orig_val = orig_row.iloc[0]
                                    if (orig_val['Massa_Real'] == row['Massa_Real'] and 
                                        orig_val['Massa_IA'] == row['Massa_IA']):
                                        should_update = False
                                        
                                if should_update:
                                    supabase.table("clima_registros").update({
                                        "massa_de_ar_final": row['Massa_Real'],
                                        "status_informacao": status_val,
                                        "data_verificacao": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                                    }).match({
                                        "data_exibicao": row['Data'],
                                        "regiao": row['Região']
                                    }).execute()
                                    
                            carregar_dados.clear() # Limpa o cache
                            st.success("Tabela atualizada com sucesso no Supabase! As alterações já estão valendo.")
                            st.rerun()
                        except Exception as e:
                            st.error(f"Erro ao salvar no Supabase: {e}")
            with c_down:
                st.download_button("📥 Exportar Logs de Auditoria de IA", edited_df.to_csv(index=False).encode('utf-8'), "logs_auditoria.csv", "text/csv")
            
            st.markdown("---")
            if "confirmar_limpeza" not in st.session_state:
                st.session_state.confirmar_limpeza = False
                
            if not st.session_state.confirmar_limpeza:
                if st.button("🗑️ Limpar Histórico de Correções no Banco de Dados"):
                    st.session_state.confirmar_limpeza = True
                    st.rerun()
            else:
                st.warning("⚠️ Atenção: Isso irá resetar permanentemente todas as correções validadas para o padrão da IA no Supabase. Tem certeza?")
                c_conf, c_canc = st.columns([1, 1])
                with c_conf:
                    if st.button("✔️ Sim, resetar todas as validações", type="primary"):
                        try:
                            supabase = obter_cliente_supabase()
                            res = supabase.table("clima_registros").select("data_exibicao, regiao, massa_de_ar_ia").neq("status_informacao", "100% IA (Não Validado)").execute()
                            if res.data:
                                reset_records = []
                                for r in res.data:
                                    reset_records.append({
                                        "data_exibicao": r['data_exibicao'],
                                        "regiao": r['regiao'],
                                        "massa_de_ar_ia": r['massa_de_ar_ia'],
                                        "massa_de_ar_final": r['massa_de_ar_ia'],
                                        "status_informacao": "100% IA (Não Validado)",
                                        "data_verificacao": None
                                    })
                                # Bulk upsert
                                supabase.table("clima_registros").upsert(reset_records).execute()
                            st.session_state.confirmar_limpeza = False
                            carregar_dados.clear() # Limpa o cache
                            st.success("Histórico de auditoria resetado com sucesso no Supabase!")
                            st.rerun()
                        except Exception as e:
                            st.error(f"Erro ao resetar auditoria no Supabase: {e}")
                with c_canc:
                    if st.button("❌ Cancelar"):
                        st.session_state.confirmar_limpeza = False
                        st.rerun()

# ================= 8. RODAPÉ (ASSINATURA) =================
st.markdown("---")
st.markdown(
    """
    <div style='text-align: center; padding: 20px 0; color: var(--faded-text-color); font-size: 0.95rem; font-family: "Outfit", sans-serif;'>
        Projeto PIBIC © 2026<br>
        Plataforma desenvolvida com excelência por <strong style='color: var(--text-color); font-size: 1.1rem;'>Rafael Guedes</strong> e o laboratório <strong style='color: var(--text-color); font-size: 1.1rem;'>LCGEA</strong>.
    </div>
    """, 
    unsafe_allow_html=True
)

# Rodapé institucional
st.markdown("---")
st.markdown(
    "<div style='text-align: center; color: #64748b; font-size: 0.9rem; padding: 15px;'>"
    "<strong>Painel Climatológico PIBIC</strong><br>Desenvolvido para facilitar a auditoria de massas de ar preditas por Inteligência Artificial."
    "</div>", unsafe_allow_html=True
)