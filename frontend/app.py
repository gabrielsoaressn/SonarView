import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json

# ==========================================
# CONFIGURAÇÃO DA PÁGINA
# ==========================================
st.set_page_config(
    page_title="Aurora View - Dashboard de Dívida Técnica",
    page_icon="🌅",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ==========================================
# CSS PERSONALIZADO
# ==========================================
st.markdown("""
<style>
    body {
        background-color: #f0f2f6;
    }
    .main-header {
        background: linear-gradient(90deg, #6A11CB 0%, #2575FC 100%);
        padding: 2rem 0;
        margin-bottom: 2.5rem;
        border-radius: 15px;
        text-align: center;
        color: white;
        box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    }
    .main-header h1 {
        font-size: 3rem;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .metric-card {
        background: #ffffff;
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 6px 12px rgba(0,0,0,0.1);
        border-left: 6px solid #6A11CB;
        margin-bottom: 1rem;
        transition: all 0.3s ease;
    }
    .metric-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.15);
    }
    .quality-gate-passed {
        background: #E6F7F0;
        color: #004D2C;
        border: 1px solid #B3E6D1;
        border-radius: 12px;
        padding: 1.5rem;
        text-align: center;
        margin: 1.5rem 0;
    }
    .quality-gate-failed {
        background: #FFF0F1;
        color: #7A000B;
        border: 1px solid #FFCCD1;
        border-radius: 12px;
        padding: 1.5rem;
        text-align: center;
        margin: 1.5rem 0;
    }
    .leak-period {
        background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%);
        color: white;
        border-radius: 12px;
        padding: 2rem;
        margin: 1.5rem 0;
        box-shadow: 0 6px 12px rgba(0,0,0,0.1);
    }
    .stMetric {
        background-color: #ffffff;
        border: 1px solid #e0e0e0;
        border-left: 5px solid #2575FC;
        padding: 1.2rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .stMetric > label {
        color: #555555;
    }
    .stMetric > div[data-testid="stMetricValue"] {
        font-size: 2.2rem;
        font-weight: bold;
        color: #1E3A8A;
    }
    .stMetric > div[data-testid="stMetricDelta"] {
        color: #555555;
    }
</style>
""", unsafe_allow_html=True)

# ==========================================
# FUNÇÕES DE DADOS
# ==========================================
@st.cache_data(ttl=300)
def get_mock_data():
    """Retorna dados simulados baseados no projeto Aurora View"""
    
    # Dados do projeto baseados no relatório PIVIC
    project_data = {
        "project_info": {
            "name": "gabrielsoaressn_clone-fklearn",
            "lines_of_code": 3713,
            "last_analysis": "27/08/2024"
        },
        "quality_gate": {
            "status": "FAILED",
            "overall_rating": 1.0,
            "reliability": {
                "rating": "C",
                "bugs": 12,
                "effort_minutes": 360
            },
            "security": {
                "rating": "B", 
                "vulnerabilities": 4,
                "effort_minutes": 120
            },
            "maintainability": {
                "rating": 1.0,
                "code_smells": 64,
                "debt_ratio": 0.5,
                "technical_debt_hours": 8.6
            },
            "coverage": {
                "rating": "A",
                "percentage": 94.4
            }
        },
        "leak_period": {
            "new_bugs": 2,
            "new_vulnerabilities": 1,
            "new_code_smells": 8
        },
        "trends": {
            "dates": pd.date_range(start="2024-08-01", end="2024-08-27", freq="D"),
            "technical_debt": [8.2, 8.3, 8.4, 8.1, 8.0, 8.2, 8.3, 8.4, 8.5, 8.6, 8.4, 8.3, 8.2, 8.1, 8.0, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.5, 8.4, 8.3, 8.2, 8.4, 8.6],
            "coverage": [94.1, 94.2, 94.0, 94.3, 94.4, 94.2, 94.1, 94.3, 94.4, 94.4, 94.5, 94.3, 94.2, 94.4, 94.5, 94.3, 94.2, 94.1, 94.3, 94.4, 94.2, 94.3, 94.4, 94.5, 94.4, 94.3, 94.4]
        }
    }
    
    return project_data

def create_quality_gate_component(data):
    """Cria o componente Quality Gate"""
    quality_gate = data["quality_gate"]
    
    # Determinar status geral
    status = "REPROVADO" if quality_gate["status"] == "FAILED" else "APROVADO"
    status_class = "quality-gate-failed" if status == "REPROVADO" else "quality-gate-passed"
    status_emoji = "❌" if status == "REPROVADO" else "✅"
    
    st.markdown(f"""
    <div class="{status_class}">
        <h2>{status_emoji} Quality Gate: {status} (Rating {quality_gate["overall_rating"]})</h2>
        <p><strong>Projeto:</strong> {data["project_info"]["name"]} | <strong>Última análise:</strong> {data["project_info"]["last_analysis"]}</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Cards de métricas
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown("### 🛡️ Confiabilidade")
        st.metric(
            label=f"Rating {quality_gate['reliability']['rating']}", 
            value=f"{quality_gate['reliability']['bugs']} bugs",
            delta=f"{quality_gate['reliability']['effort_minutes']} min esforço"
        )
    
    with col2:
        st.markdown("### 🔒 Segurança") 
        st.metric(
            label=f"Rating {quality_gate['security']['rating']}", 
            value=f"{quality_gate['security']['vulnerabilities']} vulnerabilidades",
            delta=f"{quality_gate['security']['effort_minutes']} min esforço"
        )
    
    with col3:
        st.markdown("### 🛠️ Manutenibilidade")
        st.metric(
            label=f"Rating {quality_gate['maintainability']['rating']}", 
            value=f"{quality_gate['maintainability']['code_smells']} code smells",
            delta=f"{quality_gate['maintainability']['debt_ratio']}% taxa de dívida"
        )
    
    with col4:
        st.markdown("### 🎯 Cobertura")
        st.metric(
            label=f"Rating {quality_gate['coverage']['rating']}", 
            value=f"{quality_gate['coverage']['percentage']}%",
            delta="Cobertura excelente ✅"
        )

def create_leak_period_section(data):
    """Cria a seção Foco no Leak Period"""
    leak = data["leak_period"]
    
    st.markdown("""
    <div class="leak-period">
        <h2>🔍 Foco no Leak Period (Código Novo)</h2>
        <p><strong>Estratégia:</strong> priorizar novos problemas ao invés de dívida legada</p>
    </div>
    """, unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(
            "🐛 Novos Bugs", 
            leak["new_bugs"], 
            delta="↑ AÇÃO NECESSÁRIA",
            delta_color="inverse"
        )
    
    with col2:
        st.metric(
            "🔒 Novas Vulnerabilidades", 
            leak["new_vulnerabilities"], 
            delta="↑ AÇÃO NECESSÁRIA",
            delta_color="inverse"
        )
    
    with col3:
        st.metric(
            "🛠️ Novos Code Smells", 
            leak["new_code_smells"], 
            delta=f"+{leak['new_code_smells']}",
            delta_color="inverse"
        )

def create_main_metrics_section(data):
    """Cria a seção de métricas principais"""
    st.header("📊 Métricas Principais")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("⭐ Rating Geral", data["quality_gate"]["overall_rating"])
    
    with col2:
        st.metric("⏱️ Dívida Técnica", f"{data['quality_gate']['maintainability']['technical_debt_hours']}h")
    
    with col3:
        st.metric("📝 Linhas de Código", f"{data['project_info']['lines_of_code']:,}")
    
    with col4:
        st.metric("🎯 Cobertura", f"{data['quality_gate']['coverage']['percentage']}%")

def create_trend_charts(data):
    """Cria os gráficos de tendência"""
    st.header("📈 Análise Temporal")
    
    # Preparar dados para gráficos
    dates = data["trends"]["dates"]
    debt_values = data["trends"]["technical_debt"]
    coverage_values = data["trends"]["coverage"]
    
    trend_df = pd.DataFrame({
        'Data': dates,
        'Dívida Técnica (Horas)': debt_values,
        'Cobertura (%)': coverage_values
    })
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Gráfico de linha da dívida técnica
        fig_debt = px.line(
            trend_df, 
            x='Data', 
            y='Dívida Técnica (Horas)',
            title="📈 Tendência da Dívida Técnica",
            color_discrete_sequence=['#ef4444']
        )
        fig_debt.update_layout(
            height=400,
            plot_bgcolor='rgba(0,0,0,0)',
            paper_bgcolor='rgba(0,0,0,0)',
        )
        fig_debt.update_traces(line=dict(width=3))
        st.plotly_chart(fig_debt, use_container_width=True)
    
    with col2:
        # Gauge da dívida técnica
        current_debt = data["quality_gate"]["maintainability"]["technical_debt_hours"]
        
        fig_gauge = go.Figure(go.Indicator(
            mode = "gauge+number+delta",
            value = current_debt,
            domain = {'x': [0, 1], 'y': [0, 1]},
            title = {'text': "🎯 Taxa de Dívida Técnica (Horas)"},
            delta = {'reference': 8.0},
            gauge = {
                'axis': {'range': [None, 20]},
                'bar': {'color': "#3b82f6"},
                'steps': [
                    {'range': [0, 5], 'color': "#d1fae5"},
                    {'range': [5, 10], 'color': "#fed7aa"},
                    {'range': [10, 20], 'color': "#fecaca"}
                ],
                'threshold': {
                    'line': {'color': "#ef4444", 'width': 4},
                    'thickness': 0.75,
                    'value': 10
                }
            }
        ))
        fig_gauge.update_layout(height=400)
        st.plotly_chart(fig_gauge, use_container_width=True)

def create_category_analysis(data):
    """Cria a análise por categoria"""
    st.header("🔍 Análise por Categoria")
    
    col1, col2, col3 = st.columns(3)
    
    reliability = data["quality_gate"]["reliability"]
    security = data["quality_gate"]["security"] 
    maintainability = data["quality_gate"]["maintainability"]
    
    with col1:
        st.markdown("### 🛡️ Confiabilidade")
        st.metric("Rating", reliability["rating"])
        st.metric("Bugs", reliability["bugs"])
        st.metric("Esforço (min)", reliability["effort_minutes"])
    
    with col2:
        st.markdown("### 🔒 Segurança")
        st.metric("Rating", security["rating"])
        st.metric("Vulnerabilidades", security["vulnerabilities"])
        st.metric("Esforço (min)", security["effort_minutes"])
    
    with col3:
        st.markdown("### 🛠️ Manutenibilidade")
        st.metric("Rating", str(maintainability["rating"]))
        st.metric("Code Smells", maintainability["code_smells"])
        st.metric("Taxa de Dívida", f"{maintainability['debt_ratio']}%")

# ==========================================
# INTERFACE PRINCIPAL
# ==========================================
def main():
    # Header principal
    st.markdown("""
    <div class="main-header">
        <h1>🌅 Aurora View</h1>
        <p>Dashboard de Monitoramento de Dívida Técnica</p>
        <small>Integração GitHub & SonarCloud para PIVIC/TCC</small>
    </div>
    """, unsafe_allow_html=True)
    
    # Sidebar
    with st.sidebar:
        st.header("⚙️ Configurações")
        
        auto_refresh = st.checkbox("🔄 Atualização automática", value=False)
        if auto_refresh:
            refresh_interval = st.slider("Intervalo (min)", 1, 30, 5)
        
        st.markdown("---")
        st.markdown("### 📋 Informações do Projeto")
        st.info("""
        **Projeto:** Aurora View  
        **Tipo:** PIVIC/TCC  
        **Tecnologias:** GitHub + SonarCloud  
        **Objetivo:** Visualização de Dívida Técnica
        """)
        
        st.markdown("---")
        st.markdown("### 📖 Sobre")
        st.markdown("""
        Dashboard desenvolvido como parte do projeto de pesquisa **Aurora View**, 
        focado na coleta, unificação e visualização de métricas de dívida técnica 
        em projetos de software.
        """)
    
    # Carregar dados
    data = get_mock_data()
    
    # Componentes principais
    create_quality_gate_component(data)
    
    st.markdown("---")
    create_leak_period_section(data)
    
    st.markdown("---")
    create_main_metrics_section(data)
    
    st.markdown("---")
    create_trend_charts(data)
    
    st.markdown("---")
    create_category_analysis(data)
    
    # Informações do projeto
    st.markdown("---")
    st.header("ℹ️ Informações do Projeto")
    
    col1, col2 = st.columns(2)
    with col1:
        st.code(f"Projeto: {data['project_info']['name']}")
        st.code(f"Linhas de Código: {data['project_info']['lines_of_code']:,}")
    
    with col2:
        st.code(f"Última Análise: {data['project_info']['last_analysis']}")
        st.code(f"Dívida Técnica: {data['quality_gate']['maintainability']['technical_debt_hours']}h")
    
    # Footer
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666; padding: 2rem;">
        <h3>🌅 Aurora View</h3>
        <p><strong>Dashboard de Monitoramento de Dívida Técnica</strong></p>
        <p>Desenvolvido para PIVIC/TCC - Design Science Research (DSR)</p>
        <p><em>Integração GitHub & SonarCloud para análise unificada de métricas</em></p>
    </div>
    """, unsafe_allow_html=True)
    
    # Auto-refresh
    if auto_refresh:
        import time
        time.sleep(refresh_interval * 60)
        st.rerun()

# ==========================================
# EXECUÇÃO
# ==========================================
if __name__ == "__main__":
    main()