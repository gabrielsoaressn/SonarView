import requests
import streamlit as st

class MetricsAPI:
    def __init__(self, base_url="http://localhost:3001/api"):
        self.base_url = base_url
    
    def get_latest_metrics(self, project=None):
        """Buscar métricas mais recentes"""
        try:
            url = f"{self.base_url}/metrics/latest"
            if project:
                url += f"?project={project}"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                return response.json()
            else:
                st.error(f"API retornou status {response.status_code}")
                return None
        except requests.exceptions.ConnectionError:
            st.error("Backend não está rodando. Execute: `cd backend && npm run dev`")
            return None
        except Exception as e:
            st.error(f"Erro ao conectar com a API: {str(e)}")
            return None
    
    def get_metrics_history(self, time_range="24h", project=None):
        """Buscar histórico de métricas"""
        try:
            hours_map = {"6h": 6, "12h": 12, "24h": 24, "3d": 72, "7d": 168}
            hours = hours_map.get(time_range, 24)
            
            url = f"{self.base_url}/metrics/history?hours={hours}"
            if project:
                url += f"&project={project}"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                return response.json()
            else:
                return []
        except Exception as e:
            st.error(f"Erro ao buscar histórico: {str(e)}")
            return []
    
    def get_projects(self):
        """Buscar lista de projetos disponíveis"""
        try:
            response = requests.get(f"{self.base_url}/projects", timeout=5)
            if response.status_code == 200:
                return response.json()
            else:
                return {"projects": [], "default": "clone-fklearn"}
        except Exception as e:
            st.error(f"Erro ao buscar projetos: {str(e)}")
            return {"projects": [], "default": "clone-fklearn"}