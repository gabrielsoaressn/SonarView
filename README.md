# SonarView (Quality Lens)

Sistema de monitoramento e visualização de dívida técnica que integra métricas de qualidade de código do SonarCloud com dados de versionamento do GitHub, fornecendo dashboards diferenciados por perfil de usuário (desenvolvedor e gestor).

## Sobre o Projeto

O **Quality Lens** (SonarView) é um artefato desenvolvido seguindo a metodologia *Design Science Research* para resolver o problema de fragmentação de dados de dívida técnica entre diferentes ferramentas. O sistema oferece visualizações interativas que permitem:

- **Para Desenvolvedores:** Visão detalhada de issues, hotspots de complexidade, cobertura de testes, com foco em métricas do *leak period* (código novo)
- **Para Gestores:** KPIs executivos, métricas DORA, tendências de débito técnico e composição de esforço

## Demo Online

Acesse a demonstração pública do sistema: [https://sonarview-rr9djyeriqbyjfg8syrgsj.streamlit.app/](https://sonarview-rr9djyeriqbyjfg8syrgsj.streamlit.app/)

## Arquitetura do Sistema

O sistema é organizado em três camadas principais:

1. **Camada de Integração:** Coleta automatizada de dados via APIs do GitHub e SonarCloud com cache otimizado
2. **Camada de Processamento:** Agregação, normalização e correlação de métricas heterogêneas armazenadas em PostgreSQL
3. **Camada de Apresentação:** Visualizações interativas com Streamlit e Plotly

```
Frontend (Streamlit)
    ↓
Backend API (Node.js/Express)
    ↓
PostgreSQL Database
    ↓
SonarCloud API + GitHub API
```

## Tecnologias Utilizadas

### Frontend
- **Python 3.9+**
- **Streamlit** - Framework de visualização interativa
- **Plotly** - Gráficos interativos (radar, linha, barra, gauge)
- **Requests** - Cliente HTTP para APIs

### Backend
- **Node.js 16+**
- **Express.js** - Servidor API REST
- **PostgreSQL** - Banco de dados relacional
- **node-cron** - Agendamento de coleta automática de métricas
- **axios** - Cliente HTTP para SonarCloud API

## Pré-requisitos

- Python 3.9 ou superior
- Node.js 16 ou superior
- PostgreSQL 13 ou superior
- Conta no SonarCloud (gratuita para projetos open source)
- Token de acesso do SonarCloud
- Token de acesso do GitHub (opcional, mas recomendado para evitar rate limits)

## Instalação e Configuração

### 1. Clone o repositório

```bash
git clone https://github.com/gabrielsoaressn/SonarView.git
cd SonarView
```

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto baseado no exemplo `.env.example`:

```bash
# Backend (Node.js)
DATABASE_URL=postgresql://usuario:senha@host:5432/nome_do_banco
SONAR_TOKEN=seu_token_sonarcloud
SONAR_HOST=https://sonarcloud.io

# Frontend (Python/Streamlit)
API_BASE_URL=http://localhost:3001
```

### 3. Configure o banco de dados PostgreSQL

```bash
# Execute o script de inicialização do banco
cd backend
DATABASE_URL='postgresql://usuario:senha@host:5432/nome_do_banco' node src/config/init-db.js
```

### 4. Instale as dependências do backend

```bash
cd backend
npm install
```

### 5. Instale as dependências do frontend

```bash
cd frontend
pip install -r requirements.txt
```

### 6. Inicie o backend

```bash
cd backend
node server-postgres.js
```

O servidor iniciará na porta 3001 e começará a coletar métricas automaticamente a cada 10 minutos.

### 7. Inicie o frontend

Em outro terminal:

```bash
cd frontend
streamlit run app.py
```

O dashboard estará disponível em `http://localhost:8501`

## Estrutura do Projeto

```
SonarView/
├── frontend/
│   ├── app.py                    # Página inicial (Home)
│   ├── utils.py                  # Funções utilitárias e cliente API
│   └── pages/
│       ├── developerView.py      # Tela de desenvolvedor
│       └── managerView.py        # Tela de gestor
├── backend/
│   ├── server-postgres.js        # Servidor Express principal
│   └── src/
│       ├── config/
│       │   ├── database.js       # Configuração PostgreSQL
│       │   └── init-db.js        # Script de inicialização
│       ├── models/
│       │   ├── sonarcloud.js     # Model de métricas SonarCloud
│       │   └── dora.js           # Model de métricas DORA
│       └── services/
│           └── sonarcloud-details.js  # Serviço de integração SonarCloud
├── LICENSE                        # Licença MIT
├── README.md                      # Este arquivo
└── .env.example                   # Exemplo de configuração
```

## Funcionalidades Principais

### Tela Inicial (Home)
- Limiar de qualidade com classificações de Reliability, Security e Maintainability
- Gráfico de radar com 5 dimensões de qualidade
- Resumo de métricas de código novo

### Tela de Desenvolvedor (Developer View)
- Listagem detalhada de issues (bugs, vulnerabilidades, code smells)
- Top 10 hotspots de complexidade ciclomática por arquivo
- Tabela de cobertura de testes por arquivo

### Tela de Gestor (Manager View)
- KPIs executivos (Technical Debt Ratio, Maintainability Rating)
- Métricas DORA (Deployment Frequency, Lead Time, Change Failure Rate, MTTR)
- Gráficos de tendências de débito técnico
- Visualização de composição de esforço

## Métricas Coletadas

O sistema coleta e apresenta **22 métricas** do SonarCloud organizadas em 4 dimensões do modelo SQALE:

- **Manutenibilidade:** sqale_debt_ratio, sqale_index, sqale_rating, code_smells, new_code_smells
- **Confiabilidade:** reliability_rating, bugs, new_bugs
- **Segurança:** security_rating, vulnerabilities, new_vulnerabilities, security_hotspots
- **Cobertura:** coverage, new_coverage, uncovered_lines, line_coverage_by_file

## API Endpoints

O backend expõe 13+ endpoints REST:

- `GET /api/health` - Status do servidor
- `GET /api/projects` - Lista de projetos
- `GET /api/metrics/latest` - Métricas mais recentes
- `GET /api/metrics/history?days=30` - Histórico de métricas
- `POST /api/metrics/collect` - Dispara coleta manual
- `POST /api/dora/deployment` - Registra deployment
- `GET /api/dora/metrics?project=X&days=30` - Métricas DORA calculadas
- `GET /api/sonarcloud/new-code-issues?project=X` - Detalhes de issues
- `GET /api/sonarcloud/complexity?project=X` - Complexidade por arquivo
- `GET /api/sonarcloud/coverage-by-file?project=X` - Cobertura por arquivo

## Configuração para Outros Projetos

### Projetos Python (como o estudo de caso fklearn)

1. Configure o projeto no SonarCloud
2. Adicione a chave do projeto (`projectKey`) no backend
3. Execute a coleta inicial: `POST /api/metrics/collect`

### Projetos em Outras Linguagens

O sistema suporta todas as linguagens do SonarCloud (Java, JavaScript, C#, Go, etc.):

1. As métricas SQALE são agnósticas à linguagem
2. Apenas ajuste o `projectKey` para o projeto desejado
3. A visualização permanece a mesma

### Substituição de Ferramentas

**GitHub → GitLab/Bitbucket:**
- Modifique o módulo de integração em `backend/src/services/`
- Adapte chamadas de API para a plataforma escolhida

**SonarCloud → SonarQube (self-hosted):**
- Altere `SONAR_HOST` no `.env` para sua instância
- Ajuste autenticação se necessário

## Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Reportando Problemas

Encontrou um bug ou tem uma sugestão? Abra uma [issue no GitHub](https://github.com/gabrielsoaressn/SonarView/issues) detalhando:

- Descrição do problema/sugestão
- Passos para reproduzir (se aplicável)
- Comportamento esperado vs. comportamento atual
- Screenshots (se relevante)

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Citação Acadêmica

Se você utilizar este projeto em pesquisa acadêmica, por favor cite:

```bibtex
@misc{sonarview2025,
  author = {Soares, Gabriel},
  title = {Quality Lens: Sistema de Monitoramento de Dívida Técnica},
  year = {2025},
  publisher = {GitHub},
  journal = {GitHub repository},
  howpublished = {\url{https://github.com/gabrielsoaressn/SonarView}}
}
```

## Contato

Gabriel Soares - [@gabrielsoaressn](https://github.com/gabrielsoaressn)

Link do Projeto: [https://github.com/gabrielsoaressn/SonarView](https://github.com/gabrielsoaressn/SonarView)

---

Desenvolvido como parte de pesquisa em Design Science Research para Engenharia de Software.
