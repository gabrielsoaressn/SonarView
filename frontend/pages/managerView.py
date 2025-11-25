# pages/managerView.py
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from utils import display_sidebar, get_latest_metrics, get_metrics_history, get_dora_metrics, render_no_data, minutes_to_days, format_rating, format_lead_time

st.set_page_config(page_title="Visão Gerencial", page_icon="👨‍💼", layout="wide")

# Título e descrição
st.title("👨‍💼 Visão Gerencial")
st.markdown("Métricas e KPIs para gestores acompanharem a saúde do projeto e tomarem decisões estratégicas.")

# Sidebar e seleção de projeto
project_id = display_sidebar()

if not project_id:
    st.info("Selecione um projeto na barra lateral para visualizar os dados.")
    st.stop()

# Carregar dados
latest_data = get_latest_metrics(project_id)
history_data = get_metrics_history(project_id)
dora_data = get_dora_metrics(project_id, days=30)

if not latest_data:
    render_no_data()
    st.stop()

# --- Métricas Chave ---
st.header("KPIs Principais", divider='blue')
maintainability = latest_data.get('maintainability', {})

col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric(
        label="Taxa de Dívida Técnica",
        value=f"{maintainability.get('debtRatio', '*' )}%",
        help="Proporção do esforço de refatoração necessário em relação ao custo de desenvolvimento."
    )
with col2:
    st.metric(
        label="Rating de Manutenibilidade",
        value=format_rating(maintainability.get('rating')),
        help="Avaliação da manutenibilidade do código (A-E)."
    )
with col3:
    lead_time_value = "*"
    total_deploys = 0
    if dora_data:
        # Handle new nested structure from API
        lead_time_data = dora_data.get('leadTime', {})
        if lead_time_data.get('average') is not None:
            lead_time_value = format_lead_time(lead_time_data['average'])

        # Get total deployments from deployment frequency
        deploy_freq = dora_data.get('deploymentFrequency', {})
        total_deploys = deploy_freq.get('total', 0)

    st.metric(
        label="⏱️ Lead Time para Mudanças",
        value=lead_time_value,
        help=f"📊 Métrica DORA\n\nTempo médio desde o commit até a produção (deploy).\n\n🎯 Classificação:\n• Elite: < 1 hora\n• Alto: < 1 dia\n• Médio: 1 dia - 1 semana\n• Baixo: > 1 semana\n\n{'📈 Baseado em ' + str(total_deploys) + ' deploys nos últimos 30 dias.' if dora_data else '⚠️ Nenhum deploy registrado ainda.'}"
    )
with col4:
    cfr_value = "*"
    if dora_data:
        # Handle new nested structure from API
        cfr_data = dora_data.get('changeFailureRate', {})
        if cfr_data.get('rate') is not None:
            cfr_value = f"{cfr_data['rate']}%"

    st.metric(
        label="🚨 Change Failure Rate",
        value=cfr_value,
        help=f"📊 Métrica DORA\n\nPercentual de deploys que causam falhas em produção (requerem hotfix, rollback ou patch).\n\n🎯 Classificação:\n• Elite: 0-15%\n• Alto: 16-30%\n• Médio: 31-45%\n• Baixo: > 45%\n\n{'📈 Baseado em ' + str(total_deploys) + ' deploys nos últimos 30 dias.' if dora_data else '⚠️ Nenhum deploy registrado ainda.'}"
    )

# --- Limiar de Qualidade para Código Novo ---
st.subheader("Limiar de Qualidade em Código Novo")
new_code = latest_data.get('newCode', {})

col1, col2 = st.columns(2)
with col1:
    st.metric("Novos Bugs", new_code.get('bugs', '*'), delta_color="inverse")
with col2:
    st.metric("Novas Vulnerabilidades", new_code.get('vulnerabilities', '*'), delta_color="inverse")

# --- Visualizações ---
st.header("Análise Visual", divider='blue')

col1, col2 = st.columns(2)

with col1:
    # Gráfico de Pizza: Dívida Técnica vs. Esforço Total
    st.subheader("Composição do Esforço")
    debt_ratio = maintainability.get('debtRatio', 0)
    esforco_produtivo = 100 - debt_ratio
    
    fig_pie = go.Figure(data=[go.Pie(
        labels=['Esforço Produtivo', 'Pagamento de Dívida'],
        values=[esforco_produtivo, debt_ratio],
        hole=.4,
        marker_colors=['#2575FC', '#FFB000'],
        textfont=dict(size=16)
    )])
    fig_pie.update_layout(
        legend_title_text='Tipo de Esforço',
        height=400,
        font=dict(size=14),
        legend=dict(font=dict(size=14))
    )
    st.plotly_chart(fig_pie, use_container_width=True)

with col2:
    # Gráfico de Linha: Tendência da Dívida Técnica
    st.subheader("Tendência da Dívida Técnica Acumulada")
    if history_data:
        df_history = pd.DataFrame(history_data)
        df_history['timestamp'] = pd.to_datetime(df_history['timestamp'])
        df_history['technicalDebtHours'] = df_history['technicalDebtMinutes'] / 60

        fig_line = px.line(
            df_history,
            x='timestamp',
            y='technicalDebtHours',
            title="Evolução da Dívida Técnica (em horas)",
            labels={'timestamp': 'Data', 'technicalDebtHours': 'Dívida (horas)'},
            markers=True
        )
        fig_line.update_layout(
            height=400,
            font=dict(size=14),
            title_font_size=18,
            xaxis=dict(title_font_size=16, tickfont=dict(size=13)),
            yaxis=dict(title_font_size=16, tickfont=dict(size=13))
        )
        st.plotly_chart(fig_line, use_container_width=True)
    else:
        st.info("Dados históricos insuficientes para gerar o gráfico de tendência.")
