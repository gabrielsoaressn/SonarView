# pages/developerView.py
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from utils import display_sidebar, get_latest_metrics, render_no_data

st.set_page_config(page_title="Visão do Desenvolvedor", page_icon="👩‍💻", layout="wide")

# Título e descrição
st.title("👩‍💻 Visão do Desenvolvedor")
st.markdown("Métricas detalhadas para apoiar as atividades diárias de desenvolvimento e refatoração.")

# Sidebar e seleção de projeto
project_id = display_sidebar()

if not project_id:
    st.info("Selecione um projeto na barra lateral para visualizar os dados.")
    st.stop()

# Carregar dados
latest_data = get_latest_metrics(project_id)

if not latest_data:
    render_no_data()
    st.stop()

# --- Foco em Código Novo ---
st.header("Ações Imediatas em Código Novo", divider='orange')
new_code = latest_data.get('newCode', {})

col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Novos Bugs", new_code.get('bugs', 0), delta_color="inverse")
with col2:
    st.metric("Novas Vulnerabilidades", new_code.get('vulnerabilities', 0), delta_color="inverse")
with col3:
    st.metric("Novos Code Smells", new_code.get('codeSmells', 0), delta_color="inverse")

# Tabela de Problemas (mock)
st.subheader("Tabela de Problemas em Código Novo")
st.info("Esta seção listaria os problemas específicos encontrados no código novo, permitindo navegação direta para o SonarCloud. (Funcionalidade em desenvolvimento)")

# --- Hotspots de Código ---
st.header("Hotspots de Código para Refatoração", divider='orange')
size = latest_data.get('size', {})
duplication = latest_data.get('duplication', {})

col1, col2 = st.columns(2)
with col1:
    st.metric("Complexidade Ciclomática Total", size.get('complexity', 0))
with col2:
    st.metric("Densidade de Duplicação", f"{duplication.get('density', 0)}%")

# Sunburst de Complexidade (mock)
st.subheader("Complexidade por Módulo/Classe")
mock_sunburst_data = {
    'ids': ["Projeto", "Modulo A", "Modulo B", "Modulo A.1", "Modulo A.2", "Modulo B.1"],
    'parents': ["", "Projeto", "Projeto", "Modulo A", "Modulo A", "Modulo B"],
    'values': [60, 35, 25, 15, 20, 25]
}
fig_sunburst = px.sunburst(
    mock_sunburst_data,
    ids='ids',
    parents='parents',
    values='values',
    title="Distribuição de Complexidade Ciclomática"
)
fig_sunburst.update_layout(height=450)
st.plotly_chart(fig_sunburst, use_container_width=True)

# --- Qualidade dos Testes ---
st.header("Qualidade e Cobertura de Testes", divider='orange')
coverage = latest_data.get('coverage', {})

col1, col2 = st.columns(2)
with col1:
    # Gráfico de Rosca para Cobertura
    st.subheader("Cobertura de Testes")
    overall_coverage = coverage.get('overall', 0)
    fig_donut = go.Figure(go.Indicator(
        mode="gauge+number",
        value=overall_coverage,
        title={'text': "Cobertura Geral"},
        gauge={
            'axis': {'range': [0, 100]},
            'bar': {'color': '#10B981'},
            'steps': [
                {'range': [0, 50], 'color': '#F87171'},
                {'range': [50, 80], 'color': '#FBBF24'},
            ],
        }
    ))
    fig_donut.update_layout(height=400)
    st.plotly_chart(fig_donut, use_container_width=True)

with col2:
    # Linhas não cobertas (mock)
    st.subheader("Linhas Não Cobertas por Testes")
    st.metric("Linhas a cobrir", "125", help="Número total de linhas de código que não estão cobertas por testes.")
    st.info("Uma tabela detalhada com os arquivos e linhas específicas seria exibida aqui.")
