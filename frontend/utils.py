# frontend/utils.py
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
import requests
import os
from datetime import datetime, timedelta

API_URL = os.getenv("BACKEND_API_URL", "https://recebe-dados-sonarcloud.onrender.com/api")

@st.cache_data(ttl=300)
def get_projects():
    """Busca os projetos disponíveis na API."""
    try:
        response = requests.get(f"{API_URL}/projects")
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        st.error(f"Erro ao conectar com o backend: {e}")
        return None

@st.cache_data(ttl=300)
def get_latest_metrics(project_id):
    """Busca as métricas mais recentes de um projeto."""
    if not project_id:
        return None
    try:
        response = requests.get(f"{API_URL}/metrics/latest", params={'project': project_id})
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException:
        return None # Retorna None para que a UI possa lidar com isso

@st.cache_data(ttl=300)
def get_metrics_history(project_id, hours=168): # 7 dias
    """Busca o histórico de métricas de um projeto."""
    if not project_id:
        return []
    try:
        response = requests.get(f"{API_URL}/metrics/history", params={'project': project_id, 'hours': hours})
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException:
        return []

@st.cache_data(ttl=300)
def get_dora_metrics(project_id, days=30):
    """Busca as métricas DORA de um projeto."""
    if not project_id:
        return None
    try:
        response = requests.get(f"{API_URL}/dora/metrics", params={'project': project_id, 'days': days})
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException:
        return None

def format_rating(rating):
    """Formata o rating para exibição (A, B, C, D, E)."""
    rating_map = {1.0: 'A', 2.0: 'B', 3.0: 'C', 4.0: 'D', 5.0: 'E'}
    try:
        rating_float = float(rating)
        return rating_map.get(rating_float, rating)
    except (ValueError, TypeError):
        return rating

def get_rating_color(rating):
    """Retorna uma cor baseada no rating."""
    rating_map = {'A': 'green', 'B': 'orange', 'C': 'orange', 'D': 'red', 'E': 'red'}
    return rating_map.get(format_rating(rating), 'grey')

def display_sidebar():
    """Exibe a sidebar com seleção de projeto e navegação."""
    st.sidebar.title("🔍 Quality Lens")
    st.sidebar.markdown("Dashboard de Dívida Técnica")

    projects_data = get_projects()
    project_id = None
    if projects_data and projects_data.get('projects'):
        project_names = {p['id']: p['name'] for p in projects_data['projects']}

        # Tenta manter o projeto selecionado através da session_state
        if 'selected_project_id' not in st.session_state:
            st.session_state.selected_project_id = projects_data.get('default')

        # Encontrar o índice do projeto atualmente selecionado
        project_keys = list(project_names.keys())
        current_index = 0
        if st.session_state.selected_project_id in project_keys:
            current_index = project_keys.index(st.session_state.selected_project_id)

        selected_project_id = st.sidebar.selectbox(
            "Selecione o Projeto",
            options=project_keys,
            format_func=lambda x: project_names[x],
            index=current_index
        )

        # Atualizar o session_state apenas se o usuário mudou o projeto
        if selected_project_id != st.session_state.selected_project_id:
            st.session_state.selected_project_id = selected_project_id

        project_id = selected_project_id
        st.sidebar.info(f"Analisando: **{project_names[project_id]}**")
    else:
        st.sidebar.error("Backend não disponível ou sem projetos.")

    st.sidebar.markdown("---")
    st.sidebar.header("Navegação")
    st.sidebar.page_link("app.py", label="Visão Geral", icon="🏠")
    st.sidebar.page_link("pages/managerView.py", label="Visão Gerencial", icon="👨‍💼")
    st.sidebar.page_link("pages/developerView.py", label="Visão do Desenvolvedor", icon="👩‍💻")
    
    st.sidebar.markdown("---")
    st.sidebar.markdown(
        """
        <div style="text-align: center;">
            <small>Desenvolvido para PIVIC/TCC</small>
        </div>
        """,
        unsafe_allow_html=True
    )
    return project_id

def render_no_data():
    """Renderiza uma mensagem de 'sem dados'."""
    st.warning("Não foi possível carregar os dados do projeto. Verifique se o backend está rodando e se há dados disponíveis.", icon="⚠️")

def minutes_to_days(minutes):
    """Converte minutos em uma string formatada de dias/horas/minutos."""
    if not minutes or minutes < 0:
        return "0d"
    days = minutes // (24 * 60)
    hours = (minutes % (24 * 60)) // 60
    if days > 0:
        return f"{days}d {hours}h"
    return f"{hours}h"

def format_coverage(coverage_value):
    """Formata valores de cobertura para exibição."""
    if coverage_value == '*' or coverage_value is None:
        return '*'
    try:
        return f"{float(coverage_value):.1f}%"
    except (ValueError, TypeError):
        return '*'

def is_numeric_value(value):
    """Verifica se um valor é numérico (não é '*' ou None)."""
    if value == '*' or value is None:
        return False
    try:
        float(value)
        return True
    except (ValueError, TypeError):
        return False

def format_lead_time(minutes):
    """Formata lead time em formato legível."""
    if minutes is None or minutes < 0:
        return '*'

    if minutes < 1:
        seconds = int(minutes * 60)
        return f"{seconds}s"
    elif minutes < 60:
        return f"{int(minutes)}min"
    elif minutes < 1440:  # menos de 1 dia
        hours = minutes / 60
        return f"{hours:.1f}h"
    else:
        days = minutes / 1440
        return f"{days:.1f}d"
@st.cache_data(ttl=300)
def get_new_code_issues(project_id):
    """Busca issues (bugs, vulnerabilities, code smells) em código novo."""
    if not project_id:
        return None
    try:
        response = requests.get(
            f"{API_URL}/sonarcloud/new-code-issues",
            params={'project': project_id}
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException:
        return None

@st.cache_data(ttl=300)
def get_complexity_data(project_id):
    """Busca complexidade por componente (arquivo)."""
    if not project_id:
        return None
    try:
        response = requests.get(
            f"{API_URL}/sonarcloud/complexity",
            params={'project': project_id}
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException:
        return None

@st.cache_data(ttl=300)
def get_coverage_by_file(project_id):
    """Busca cobertura de testes por arquivo."""
    if not project_id:
        return None
    try:
        response = requests.get(
            f"{API_URL}/sonarcloud/coverage-by-file",
            params={'project': project_id}
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException:
        return None

def rating_to_score(rating):
    """Converte rating (A-E ou 1-5) para escala 0-100."""
    # Mapear rating para score (A=100, B=75, C=50, D=25, E=0)
    rating_map = {
        'A': 100, 'B': 75, 'C': 50, 'D': 25, 'E': 0,
        '1': 100, '1.0': 100,
        '2': 75, '2.0': 75,
        '3': 50, '3.0': 50,
        '4': 25, '4.0': 25,
        '5': 0, '5.0': 0
    }

    if rating is None or rating == '*':
        return 50  # Valor neutro se não houver dados

    # Converter para string para buscar no mapa
    rating_str = str(rating)

    # Tentar converter rating numérico para letra
    try:
        rating_float = float(rating)
        if rating_float == 1.0:
            return 100
        elif rating_float == 2.0:
            return 75
        elif rating_float == 3.0:
            return 50
        elif rating_float == 4.0:
            return 25
        elif rating_float == 5.0:
            return 0
    except (ValueError, TypeError):
        pass

    return rating_map.get(rating_str, 50)

def prepare_radar_data(metrics_data):
    """Prepara dados para o gráfico de radar com 5 dimensões."""
    if not metrics_data:
        return None

    # 1. Reliability (baseado em bugs e rating)
    reliability_rating = metrics_data.get('reliability', {}).get('rating', '*')
    reliability_score = rating_to_score(reliability_rating)

    # 2. Security (baseado em vulnerabilidades e rating)
    security_rating = metrics_data.get('security', {}).get('rating', '*')
    security_score = rating_to_score(security_rating)

    # 3. Maintainability (baseado em code smells e rating)
    maintainability_rating = metrics_data.get('maintainability', {}).get('rating', '*')
    maintainability_score = rating_to_score(maintainability_rating)

    # 4. Test Coverage (já está em porcentagem)
    coverage_value = metrics_data.get('coverage', {}).get('overall', '*')
    if is_numeric_value(coverage_value):
        coverage_score = float(coverage_value)
    else:
        coverage_score = 0

    # 5. Code Quality (inverso da complexidade normalizada)
    # Vamos usar densidade de duplicação invertida como proxy de qualidade
    duplication = metrics_data.get('duplication', {}).get('density', 0)
    if is_numeric_value(duplication):
        duplication_value = float(duplication)
        # Inverter: 0% duplicação = 100 score, 100% duplicação = 0 score
        code_quality_score = max(0, 100 - duplication_value)
    else:
        code_quality_score = 50

    return {
        'dimensions': ['Confiabilidade', 'Segurança', 'Manutenibilidade', 'Cobertura de Testes', 'Qualidade do Código'],
        'scores': [reliability_score, security_score, maintainability_score, coverage_score, code_quality_score],
        'ratings': {
            'reliability': format_rating(reliability_rating),
            'security': format_rating(security_rating),
            'maintainability': format_rating(maintainability_rating),
            'coverage': f"{coverage_score:.1f}%" if coverage_score > 0 else 'N/A',
            'codeQuality': f"{code_quality_score:.1f}"
        }
    }
