# pages/developerView.py
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from utils import display_sidebar, get_latest_metrics, render_no_data, is_numeric_value

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
    st.metric("Novos Bugs", new_code.get('bugs', '*'), delta_color="inverse")
with col2:
    st.metric("Novas Vulnerabilidades", new_code.get('vulnerabilities', '*'), delta_color="inverse")
with col3:
    st.metric("Novos Code Smells", new_code.get('codeSmells', '*'), delta_color="inverse")

# Tabela de Problemas (mock)
st.subheader("Tabela de Problemas em Código Novo")
st.info("*")

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
st.info("*")

# --- Qualidade dos Testes ---
st.header("Qualidade e Cobertura de Testes", divider='orange')
coverage = latest_data.get('coverage', {})

col1, col2 = st.columns(2)
with col1:
    # Gráfico de Rosca para Cobertura
    st.subheader("Cobertura de Testes")
    overall_coverage = coverage.get('overall', '*')

    # Verificar se o valor é numérico
    if not is_numeric_value(overall_coverage):
        st.info("📊 Dados de cobertura não disponíveis no SonarCloud.\n\nConfigure a análise de cobertura no seu projeto para ver métricas detalhadas.")
    else:
        # Converter para número
        coverage_numeric = float(overall_coverage)

        fig_donut = go.Figure(go.Indicator(
            mode="gauge+number+delta",
            value=coverage_numeric,
            title={'text': "Cobertura Geral (%)"},
            domain={'x': [0, 1], 'y': [0, 1]},
            gauge={
                'axis': {'range': [0, 100]},
                'bar': {'color': '#10B981'},
                'steps': [
                    {'range': [0, 50], 'color': '#F87171'},
                    {'range': [50, 80], 'color': '#FBBF24'},
                    {'range': [80, 100], 'color': '#D1FAE5'}
                ],
                'threshold': {
                    'line': {'color': "red", 'width': 4},
                    'thickness': 0.75,
                    'value': 80
                }
            }
        ))
        fig_donut.update_layout(height=400)
        st.plotly_chart(fig_donut, use_container_width=True)

with col2:
    # Linhas não cobertas (mock)
    st.subheader("Linhas Não Cobertas por Testes")
    st.metric("Linhas a cobrir", "*", help="Número total de linhas de código que não estão cobertas por testes.")
    st.info("*")
