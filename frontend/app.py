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
    
    /* Info box para Quality Gate */
    .qg-info {
        background-color: rgba(37, 117, 252, 0.1);
        border-left: 4px solid #2575FC;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 2rem;
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
    
    /* Estilos para badges de status */
    .status-badge {
        display: inline-block;
        padding: 0.5rem 1.5rem;
        border-radius: 20px;
        font-weight: bold;
        font-size: 1.2rem;
    }
    
    .status-passed {
        background-color: rgba(40, 167, 69, 0.2);
        color: #28a745;
        border: 2px solid #28a745;
    }
    
    .status-warning {
        background-color: rgba(255, 193, 7, 0.2);
        color: #ffc107;
        border: 2px solid #ffc107;
    }
    
    .status-failed {
        background-color: rgba(220, 53, 69, 0.2);
        color: #dc3545;
        border: 2px solid #dc3545;
    }
    
    .status-critical {
        background-color: rgba(139, 0, 0, 0.2);
        color: #8b0000;
        border: 2px solid #8b0000;
    }
</style>
""", unsafe_allow_html=True)

# ==========================================
# FUNÇÕES AUXILIARES PARA QUALITY GATE
# ==========================================

def letter_to_numeric(rating):
    """
    Converte rating de letra (A-E) para numérico (5.0-1.0)
    Baseado no modelo SQALE do SonarQube
    """
    if rating == '*' or not rating:
        return 0
    rating_map = {'A': 5.0, 'B': 4.0, 'C': 3.0, 'D': 2.0, 'E': 1.0}
    return rating_map.get(str(rating).upper(), 0)

def evaluate_quality_gate(data):
    """
    Avalia o Quality Gate baseado em múltiplas condições.
    
    Baseado na documentação do SonarQube:
    - PASSED: Ratings A ou B em todas as dimensões críticas
    - WARNING: Rating C em alguma dimensão ou problemas moderados
    - FAILED: Rating D ou E, ou presença de bugs/vulnerabilidades em código novo
    - CRITICAL: Rating crítico (1.0 ou E) em manutenibilidade
    
    Referências:
    - SonarQube Documentation (2025)
    - Avgeriou et al. (2020) - Comparative analysis of technical debt tools
    """
    # Extrai ratings
    maintainability_rating = data.get('maintainability', {}).get('rating', 'E')
    reliability_rating = data.get('reliability', {}).get('rating', 'E')
    security_rating = data.get('security', {}).get('rating', 'E')
    
    # Converte para numérico
    maint_numeric = letter_to_numeric(maintainability_rating)
    reliability_numeric = letter_to_numeric(reliability_rating)
    security_numeric = letter_to_numeric(security_rating)
    
    # Verifica código novo (Leak Period)
    new_code = data.get('newCode', {})
    new_bugs = new_code.get('bugs', 0)
    new_vulnerabilities = new_code.get('vulnerabilities', 0)
    new_code_smells = new_code.get('codeSmells', 0)
    
    # Verifica Technical Debt Ratio
    debt_ratio = data.get('maintainability', {}).get('debtRatio', 0)
    
    # Lógica de avaliação
    # CRÍTICO: Manutenibilidade crítica (1.0 ou E)
    if maint_numeric <= 1.5:
        return {
            'status': 'CRITICAL',
            'label': 'CRÍTICO',
            'icon': '🚨',
            'color': 'critical',
            'message': 'Projeto apresenta problemas graves que exigem ação imediata'
        }
    
    # REPROVADO: Bugs ou vulnerabilidades em código novo
    if new_bugs > 0 or new_vulnerabilities > 0:
        return {
            'status': 'FAILED',
            'label': 'REPROVADO',
            'icon': '❌',
            'color': 'failed',
            'message': 'Código novo introduz bugs ou vulnerabilidades'
        }
    
    # REPROVADO: Múltiplas dimensões com rating ruim (D ou E)
    poor_ratings = sum([
        1 for r in [maint_numeric, reliability_numeric, security_numeric] 
        if r <= 2.5
    ])
    if poor_ratings >= 2:
        return {
            'status': 'FAILED',
            'label': 'REPROVADO',
            'icon': '❌',
            'color': 'failed',
            'message': 'Projeto não atende aos critérios mínimos de qualidade'
        }
    
    # ATENÇÃO: Rating C em alguma dimensão ou debt ratio alto
    if (maint_numeric == 3.0 or reliability_numeric == 3.0 or 
        security_numeric == 3.0 or debt_ratio > 5.0):
        return {
            'status': 'WARNING',
            'label': 'ATENÇÃO',
            'icon': '⚠️',
            'color': 'warning',
            'message': 'Projeto apresenta problemas que devem ser monitorados'
        }
    
    # APROVADO: Ratings A ou B em todas as dimensões
    return {
        'status': 'PASSED',
        'label': 'APROVADO',
        'icon': '✅',
        'color': 'passed',
        'message': 'Projeto atende aos critérios de qualidade'
    }

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
    
    # ==========================================
    # SEÇÃO DE QUALITY GATE
    # ==========================================
    st.header("🚦 Quality Gate", divider='rainbow')
    
    # Avalia Quality Gate
    qg_result = evaluate_quality_gate(data)
    
    # Exibe status geral
    st.markdown(f"""
        <div style="text-align: center; margin: 2rem 0;">
            <div class="status-badge status-{qg_result['color']}">
                {qg_result['icon']} {qg_result['label']}
            </div>
            <p style="margin-top: 1rem; font-size: 1.1rem;">
                {qg_result['message']}
            </p>
        </div>
    """, unsafe_allow_html=True)
    
    # Métricas por dimensão
    st.subheader("📊 Avaliação por Dimensão")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        maint_rating = data.get('maintainability', {}).get('rating', '*')
        debt_ratio = data.get('maintainability', {}).get('debtRatio', 0)
        st.metric(
            label="Manutenibilidade",
            value=format_rating(maint_rating),
            help=f"Baseado na Taxa de Dívida Técnica de {debt_ratio}%"
        )
    
    with col2:
        rel_rating = data.get('reliability', {}).get('rating', '*')
        bugs = data.get('reliability', {}).get('bugs', 0)
        st.metric(
            label="Confiabilidade",
            value=format_rating(rel_rating),
            help=f"{bugs} bugs encontrados."
        )
    
    with col3:
        sec_rating = data.get('security', {}).get('rating', '*')
        vulns = data.get('security', {}).get('vulnerabilities', 0)
        st.metric(
            label="Segurança",
            value=format_rating(sec_rating),
            help=f"{vulns} vulnerabilidades encontradas."
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
    
    # ==========================================
    # SEÇÃO LEAK PERIOD (CÓDIGO NOVO)
    # ==========================================
    st.header("🔍 Foco no Código Novo (Leak Period)", divider='rainbow')
    
    st.info("""
        O **Leak Period** foca em prevenir que nova dívida técnica seja introduzida, 
        monitorando exclusivamente as alterações recentes no código.
    """, icon="💡")
    
    new_code = data.get('newCode', {})
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        new_bugs = new_code.get('bugs', 0)
        st.metric(
            "Novos Bugs", 
            value=new_bugs,
            delta=None if new_bugs == 0 else "Ação necessária!",
            delta_color="inverse"
        )
        if new_bugs > 0:
            st.error(f"⚠️ {new_bugs} bug(s) em código novo")
    
    with col2:
        new_vulns = new_code.get('vulnerabilities', 0)
        st.metric(
            "Novas Vulnerabilidades", 
            value=new_vulns,
            delta=None if new_vulns == 0 else "Ação necessária!",
            delta_color="inverse"
        )
        if new_vulns > 0:
            st.error(f"⚠️ {new_vulns} vulnerabilidade(s) em código novo")
    
    with col3:
        new_smells = new_code.get('codeSmells', 0)
        st.metric(
            "Novos Code Smells", 
            value=new_smells,
            delta_color="inverse"
        )
        if new_smells > 10:
            st.warning(f"⚠️ Volume elevado de code smells")
    
    # Resumo do Leak Period
    if new_bugs == 0 and new_vulns == 0 and new_smells < 5:
        st.success("✅ Código novo está limpo! Continue mantendo essa qualidade.")
    elif new_bugs > 0 or new_vulns > 0:
        st.error("❌ Código novo contém problemas críticos que devem ser corrigidos antes do merge.")
    else:
        st.warning("⚠️ Código novo apresenta alguns problemas que devem ser revisados.")
    
    # ==========================================
    # NAVEGAÇÃO
    # ==========================================
    st.divider()
    st.info("👈 Use os links na barra de navegação para explorar as visões detalhadas.", icon="ℹ️")

# ==========================================
# EXECUÇÃO
# ==========================================
if __name__ == "__main__":
    main()