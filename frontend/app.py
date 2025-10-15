import streamlit as st
from utils import display_sidebar, get_latest_metrics, render_no_data, format_rating, get_rating_color, minutes_to_days

# ==========================================
# CONFIGURAÇÃO DA PÁGINA
# ==========================================
st.set_page_config(
    page_title="Quality Lens - Início",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ==========================================
# CSS PERSONALIZADO
# ==========================================
st.markdown("""
<style>
    /* Estilos gerais e de métricas */
    .main-header {
        text-align: center;
        padding: 2rem;
        margin-bottom: 2rem;
    }
    
    .main-header h1 {
        font-size: 3.5rem;
        font-weight: bold;
    }
    
    /* CORREÇÃO: Removido background-color fixo e ajustado para tema responsivo */
    .stMetric {
        border-left: 5px solid #2575FC;
        padding: 1.2rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    /* Remove qualquer background branco forçado */
    div[data-testid="stMetricValue"] {
        background-color: transparent !important;
    }
    
    div[data-testid="metric-container"] {
        background-color: transparent !important;
    }
</style>
""", unsafe_allow_html=True)

# ==========================================
# INTERFACE PRINCIPAL
# ==========================================
def main():
    # Sidebar
    project_id = display_sidebar()
    
    # Header
    st.markdown("""
        <div class="main-header">
            <h1>🔍 Quality Lens</h1>
            <p>Um dashboard unificado para monitoramento de dívida técnica.</p>
        </div>
    """, unsafe_allow_html=True)
    
    if not project_id:
        st.info("Selecione um projeto na barra lateral para começar a análise.")
        return
    
    # Carregar dados
    data = get_latest_metrics(project_id)
    
    if not data:
        render_no_data()
        return
    
    # Seção de Quality Gate
    st.header("🚦 Quality Gate", divider='rainbow')
    
    qg_status = "Aprovado" if data.get('overallRating') == 'A' else "Reprovado"
    qg_color = "green" if qg_status == "Aprovado" else "red"
    
    st.markdown(f"### Status Geral: <span style='color:{qg_color};'>{qg_status}</span>", unsafe_allow_html=True)
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            label="Manutenibilidade",
            value=format_rating(data.get('maintainability', {}).get('rating')),
            help=f"Baseado na Taxa de Dívida Técnica de {data.get('maintainability', {}).get('debtRatio', 0)}%"
        )
    
    with col2:
        st.metric(
            label="Confiabilidade",
            value=format_rating(data.get('reliability', {}).get('rating')),
            help=f"{data.get('reliability', {}).get('bugs', 0)} bugs encontrados."
        )
    
    with col3:
        st.metric(
            label="Segurança",
            value=format_rating(data.get('security', {}).get('rating')),
            help=f"{data.get('security', {}).get('vulnerabilities', 0)} vulnerabilidades encontradas."
        )
    
    with col4:
        st.metric(
            label="Cobertura de Testes",
            value=f"{data.get('coverage', {}).get('overall', 0)}%",
            delta=f"{data.get('coverage', {}).get('new', 0)}% em código novo"
        )
    
    st.header("🔍 Foco no Código Novo (Leak Period)", divider='rainbow')
    
    new_code = data.get('newCode', {})
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Novos Bugs", value=new_code.get('bugs', 0), delta_color="inverse")
    
    with col2:
        st.metric("Novas Vulnerabilidades", value=new_code.get('vulnerabilities', 0), delta_color="inverse")
    
    with col3:
        st.metric("Novos Code Smells", value=new_code.get('codeSmells', 0), delta_color="inverse")
    
    st.info("Use os links na barra de navegação para explorar as visões detalhadas.", icon="👈")

# ==========================================
# EXECUÇÃO
# ==========================================
if __name__ == "__main__":
    main()