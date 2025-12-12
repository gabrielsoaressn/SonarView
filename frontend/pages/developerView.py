# pages/developerView.py
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from utils import (
    display_sidebar, get_latest_metrics, render_no_data,
    is_numeric_value,
    get_new_code_issues,
    get_complexity_data,
    get_coverage_by_file
)
st.set_page_config(page_title="Visão do Desenvolvedor", page_icon="👩‍💻", layout="wide")

# Título e descrição
st.title("👩‍💻 Visão do Desenvolvedor")

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
st.header("Código Novo", divider='orange')
new_code = latest_data.get('newCode', {})

col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Novos Bugs", new_code.get('bugs', '*'), delta_color="inverse")
with col2:
    st.metric("Novas Vulnerabilidades", new_code.get('vulnerabilities', '*'), delta_color="inverse")
with col3:
    st.metric("Novos Code Smells", new_code.get('codeSmells', '*'), delta_color="inverse")

# Tabela de Problemas em Código Novo
st.subheader("Tabela de Problemas em Código Novo")

issues_data = get_new_code_issues(project_id)

if issues_data and issues_data.get('total', 0) > 0:
    issues = issues_data['issues']

    # Criar abas para cada tipo
    tab1, tab2, tab3 = st.tabs([
        f"🐛 Bugs ({len(issues['bugs'])})",
        f"🔐 Vulnerabilidades ({len(issues['vulnerabilities'])})",
        f"💡 Code Smells ({len(issues['codeSmells'])})"
    ])

    with tab1:
        if issues['bugs']:
            df_bugs = pd.DataFrame(issues['bugs'])
            st.dataframe(
                df_bugs[['severity', 'component', 'message', 'line', 'effort']],
                use_container_width=True,
                hide_index=True
            )
        else:
            st.success("✅ Nenhum bug em código novo!")

    with tab2:
        if issues['vulnerabilities']:
            df_vuln = pd.DataFrame(issues['vulnerabilities'])
            st.dataframe(
                df_vuln[['severity', 'component', 'message', 'line', 'effort']],
                use_container_width=True,
                hide_index=True
            )
        else:
            st.success("✅ Nenhuma vulnerabilidade em código novo!")

    with tab3:
        if issues['codeSmells']:
            df_smells = pd.DataFrame(issues['codeSmells'])
            st.dataframe(
                df_smells[['severity', 'component', 'message', 'line', 'effort']],
                use_container_width=True,
                hide_index=True
            )
        else:
            st.success("✅ Nenhum code smell em código novo!")
else:
    st.success("✅ Nenhum problema encontrado em código novo!")

# --- Pontos de Atenção no Código ---
st.header("Pontos de Atenção no Código para Refatoração", divider='orange')
size = latest_data.get('size', {})
duplication = latest_data.get('duplication', {})

col1, col2 = st.columns(2)
with col1:
    st.metric("Complexidade Ciclomática Total", size.get('complexity', 0))
with col2:
    st.metric("Densidade de Duplicação", f"{duplication.get('density', 0)}%")

# Complexidade por Módulo/Classe
st.subheader("Complexidade por Módulo/Classe")

complexity_data = get_complexity_data(project_id)

if complexity_data and complexity_data.get('stats'):
    stats = complexity_data['stats']
    hotspots = stats['hotspots'][:10]  # Top 10 mais complexos

    # Métricas resumidas
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total de Arquivos", stats['totalComponents'])
    with col2:
        st.metric("Complexidade Média", stats['avgComplexity'])
    with col3:
        st.metric("Complexidade Máxima", stats['maxComplexity'])

    # Tabela dos top 10 mais complexos
    if hotspots:
        st.subheader("⚠️ Top 10 Arquivos Mais Complexos")
        df_complexity = pd.DataFrame(hotspots)

        # Criar gráfico de barras
        fig = px.bar(
            df_complexity,
            x='complexity',
            y='name',
            orientation='h',
            title='Complexidade por Arquivo',
            labels={'complexity': 'Complexidade Ciclomática', 'name': 'Arquivo'},
            color='complexity',
            color_continuous_scale='Reds'
        )
        fig.update_layout(
            height=400,
            showlegend=False,
            font=dict(size=14),
            title_font_size=18,
            xaxis=dict(title_font_size=16),
            yaxis=dict(title_font_size=16, tickfont=dict(size=13))
        )
        st.plotly_chart(fig, use_container_width=True)

        # Tabela detalhada
        st.dataframe(
            df_complexity[['name', 'complexity', 'cognitiveComplexity', 'linesOfCode']],
            use_container_width=True,
            hide_index=True
        )
    else:
        st.info("Nenhum dado de complexidade disponível")
else:
    st.info("Dados de complexidade não disponíveis")

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
    # Linhas Não Cobertas por Testes
    st.subheader("Linhas Não Cobertas por Testes")

    coverage_data = get_coverage_by_file(project_id)

    if coverage_data and coverage_data.get('worstCoverage'):
        worst = coverage_data['worstCoverage'][:10]  # Top 10 com pior cobertura

        if worst:
            df_coverage = pd.DataFrame(worst)
            total_uncovered = df_coverage['uncoveredLines'].sum()

            st.metric(
                "Total de Linhas Não Cobertas",
                f"{int(total_uncovered):,}",
                help="Número total de linhas sem cobertura de testes"
            )

            # Gráfico de barras
            fig = px.bar(
                df_coverage,
                x='uncoveredLines',
                y='name',
                orientation='h',
                title='Top 10 Arquivos com Mais Linhas Não Cobertas',
                labels={'uncoveredLines': 'Linhas Não Cobertas', 'name': 'Arquivo'},
                color='coverage',
                color_continuous_scale='RdYlGn'
            )
            fig.update_layout(
                height=400,
                font=dict(size=14),
                title_font_size=18,
                xaxis=dict(title_font_size=16),
                yaxis=dict(title_font_size=16, tickfont=dict(size=13))
            )
            st.plotly_chart(fig, use_container_width=True)

            # Tabela
            st.dataframe(
                df_coverage[['name', 'coverage', 'uncoveredLines', 'linesToCover']],
                use_container_width=True,
                hide_index=True
            )
        else:
            st.success("✅ Cobertura de testes excelente!")
    else:
        st.info("📊 Dados de cobertura não disponíveis no SonarCloud.\n\nConfigure a análise de cobertura no seu projeto.")
