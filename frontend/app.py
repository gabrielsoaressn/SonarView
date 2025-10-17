import streamlit as st
from utils import display_sidebar, get_latest_metrics, render_no_data, format_rating, get_rating_color, minutes_to_days, format_coverage, is_numeric_value

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

    /* Estilos para Quality Gate Info */
    .qg-info {
        background: linear-gradient(135deg, rgba(37, 117, 252, 0.1), rgba(255, 176, 0, 0.1));
        border-left: 4px solid #2575FC;
        padding: 1.5rem;
        border-radius: 8px;
        margin: 1rem 0 2rem 0;
    }

    .qg-info h4 {
        margin-top: 0;
        color: #2575FC;
    }

    .qg-info p {
        line-height: 1.6;
        margin: 0.5rem 0;
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

    # Explicação sobre Quality Gate
    st.markdown("""
        <div class="qg-info">
            <h4>📖 O que é um Quality Gate?</h4>
            <p>
                Um <strong>Quality Gate</strong> é um mecanismo de garantia de qualidade que funciona como um
                <em>checkpoint</em> no ciclo de desenvolvimento de software. Ele avalia o código através de
                condições predefinidas sobre métricas de qualidade (confiabilidade, segurança, manutenibilidade
                e cobertura de testes), respondendo à questão fundamental: <strong>"Este projeto está pronto
                para release?"</strong>
            </p>
            <p style="margin-bottom: 0;">
                <small>Baseado no modelo SQALE e documentação oficial do SonarQube (2025)</small>
            </p>
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

    # Avalia Quality Gate baseado nos ratings disponíveis
    maintainability_rating = data.get('maintainability', {}).get('rating', '*')
    reliability_rating = data.get('reliability', {}).get('rating', '*')
    security_rating = data.get('security', {}).get('rating', '*')

    # Lista de ratings válidos (ignora '*')
    valid_ratings = [r for r in [maintainability_rating, reliability_rating, security_rating] if r != '*' and r is not None]

    # Lógica simplificada: APROVADO se todos os ratings válidos forem A ou B
    if not valid_ratings:
        qg_status = "SEM DADOS"
        qg_color = "orange"
        qg_icon = "❓"
    elif all(r in ['A', 'B'] for r in valid_ratings):
        qg_status = "APROVADO"
        qg_color = "green"
        qg_icon = "✅"
    elif any(r == 'C' for r in valid_ratings):
        qg_status = "ATENÇÃO"
        qg_color = "orange"
        qg_icon = "⚠️"
    else:
        qg_status = "REPROVADO"
        qg_color = "red"
        qg_icon = "❌"

    st.markdown(f"### {qg_icon} Status Geral: <span style='color:{qg_color};'>{qg_status}</span>", unsafe_allow_html=True)
    
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
        coverage_value = data.get('coverage', {}).get('overall', '*')
        new_coverage = data.get('coverage', {}).get('new', '*')

        # Formatar valores de cobertura
        coverage_display = format_coverage(coverage_value) if is_numeric_value(coverage_value) else '*'
        delta_display = f"{new_coverage}% em código novo" if is_numeric_value(new_coverage) else None

        st.metric(
            label="Cobertura de Testes",
            value=coverage_display,
            delta=delta_display,
            help="Porcentagem de código coberto por testes automatizados"
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