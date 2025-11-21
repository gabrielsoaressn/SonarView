import streamlit as st
import plotly.graph_objects as go
from utils import display_sidebar, get_latest_metrics, render_no_data, format_rating, get_rating_color, minutes_to_days, format_coverage, is_numeric_value, prepare_radar_data

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

    # Seção de Gráfico de Radar
    st.header("📊 Dimensões de Qualidade", divider='rainbow')

    radar_data = prepare_radar_data(data)

    if radar_data:
        col_radar, col_legend = st.columns([2, 1])

        with col_radar:
            # Criar gráfico de radar
            fig_radar = go.Figure()

            fig_radar.add_trace(go.Scatterpolar(
                r=radar_data['scores'],
                theta=radar_data['dimensions'],
                fill='toself',
                name='Score Atual',
                line=dict(color='#2575FC', width=2),
                fillcolor='rgba(37, 117, 252, 0.3)'
            ))

            # Adicionar linha de referência (ideal = 100)
            fig_radar.add_trace(go.Scatterpolar(
                r=[100, 100, 100, 100, 100],
                theta=radar_data['dimensions'],
                fill='toself',
                name='Meta Ideal',
                line=dict(color='#10B981', width=1, dash='dash'),
                fillcolor='rgba(16, 185, 129, 0.1)'
            ))

            fig_radar.update_layout(
                polar=dict(
                    radialaxis=dict(
                        visible=True,
                        range=[0, 100],
                        tickmode='linear',
                        tick0=0,
                        dtick=25,
                        showticklabels=True,
                        ticks='outside'
                    )
                ),
                showlegend=True,
                legend=dict(
                    orientation="h",
                    yanchor="bottom",
                    y=-0.2,
                    xanchor="center",
                    x=0.5
                ),
                height=500,
                title=dict(
                    text="Análise de Qualidade do Software",
                    font=dict(size=18)
                )
            )

            st.plotly_chart(fig_radar, use_container_width=True)

        with col_legend:
            st.subheader("Detalhes das Dimensões")

            # Confiabilidade
            st.markdown(f"**🔧 Confiabilidade**")
            st.markdown(f"Rating: `{radar_data['ratings']['reliability']}` | Score: `{radar_data['scores'][0]:.0f}/100`")
            st.caption("Baseado em bugs e rating de confiabilidade")

            # Segurança
            st.markdown(f"**🔒 Segurança**")
            st.markdown(f"Rating: `{radar_data['ratings']['security']}` | Score: `{radar_data['scores'][1]:.0f}/100`")
            st.caption("Baseado em vulnerabilidades e rating de segurança")

            # Manutenibilidade
            st.markdown(f"**🔨 Manutenibilidade**")
            st.markdown(f"Rating: `{radar_data['ratings']['maintainability']}` | Score: `{radar_data['scores'][2]:.0f}/100`")
            st.caption("Baseado em code smells e dívida técnica")

            # Cobertura de Testes
            st.markdown(f"**🧪 Cobertura de Testes**")
            st.markdown(f"Cobertura: `{radar_data['ratings']['coverage']}` | Score: `{radar_data['scores'][3]:.0f}/100`")
            st.caption("Porcentagem de código coberto por testes")

            # Qualidade do Código
            st.markdown(f"**✨ Qualidade do Código**")
            st.markdown(f"Score: `{radar_data['scores'][4]:.0f}/100`")
            st.caption("Baseado em duplicação de código (invertido)")
    else:
        st.info("Dados insuficientes para gerar o gráfico de radar.")

    st.header("🔍 Foco no Código Novo", divider='rainbow')
    
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