# 📊 Configuração de Métricas DORA

Este guia explica como configurar o rastreamento de métricas DORA (DevOps Research and Assessment) no Quality Lens usando GitHub Actions.

## 🎯 Métricas Implementadas

1. **Lead Time para Mudanças**: Tempo médio desde o commit até o deploy em produção
2. **Change Failure Rate**: Percentual de deploys que resultam em falhas
3. **Deployment Frequency**: Frequência de deploys (deploys por dia)

## 📋 Passo a Passo de Configuração

### Passo 1: Configurar Secrets no GitHub

Acesse as configurações do repositório:
1. Vá em `Settings` → `Secrets and variables` → `Actions`
2. Clique em `New repository secret`
3. Adicione os seguintes secrets:

| Nome | Valor | Descrição |
|------|-------|-----------|
| `BACKEND_API_URL` | `https://recebe-dados-sonarcloud.onrender.com` | URL da API do backend |
| `SONAR_PROJECT_KEY` | `gabrielsoaressn_fklearn` | Chave do projeto no SonarCloud |

**Nota**: Se você já tem esses valores configurados, não precisa adicioná-los novamente.

### Passo 2: Entender o Workflow

O workflow `.github/workflows/track-deployment.yml` será executado automaticamente:

#### Quando é executado?
- **Automaticamente**: A cada push na branch `main` (após merge de PR)
- **Manualmente**: Via GitHub Actions UI (para registrar deploys manuais)

#### O que ele faz?
1. Captura informações do commit (SHA, timestamp, branch)
2. Registra o timestamp do deployment
3. Calcula o Lead Time (tempo entre commit e deploy)
4. Envia os dados para o backend via API REST

### Passo 3: Registrar um Deploy Manual (Opcional)

Para testar ou registrar um deploy manual:

1. Vá em `Actions` no GitHub
2. Selecione o workflow `Track Deployment Metrics`
3. Clique em `Run workflow`
4. Escolha:
   - Branch: `main`
   - Status: `success` ou `failure`
5. Clique em `Run workflow`

### Passo 4: Registrar Falhas em Deploys

Para registrar que um deploy falhou:

**Opção A - Workflow Manual:**
1. Vá em `Actions` → `Track Deployment Metrics`
2. Execute com status `failure`

**Opção B - Integrar com seu pipeline de CI/CD:**
```yaml
# Em outro workflow seu, adicione ao final:
- name: Report deployment failure
  if: failure()
  run: |
    curl -X POST "${{ secrets.BACKEND_API_URL }}/api/dora/deployment" \
      -H "Content-Type: application/json" \
      -d '{
        "projectKey": "${{ secrets.SONAR_PROJECT_KEY }}",
        "commitSha": "${{ github.sha }}",
        "commitTimestamp": "$(git show -s --format=%cI)",
        "deploymentTimestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
        "environment": "production",
        "status": "failure",
        "branch": "${{ github.ref_name }}"
      }'
```

### Passo 5: Visualizar as Métricas

Após alguns deploys serem registrados:

1. Acesse o frontend do Quality Lens
2. Vá em **Visão Executiva** (👨‍💼)
3. As métricas DORA aparecerão nos KPIs Principais:
   - **Lead Time para Mudanças**: Tempo médio (em minutos/horas/dias)
   - **Change Failure Rate**: Percentual de falhas (0-100%)

## 🔧 Estrutura de Dados

### Request para registrar deployment:
```json
POST /api/dora/deployment
{
  "projectKey": "gabrielsoaressn_fklearn",
  "commitSha": "abc123...",
  "commitTimestamp": "2025-10-19T10:30:00Z",
  "deploymentTimestamp": "2025-10-19T10:35:00Z",
  "environment": "production",
  "status": "success",
  "branch": "main"
}
```

### Response com métricas calculadas:
```json
GET /api/dora/metrics?project=fklearn&days=30
{
  "projectKey": "gabrielsoaressn_fklearn",
  "period": "30 days",
  "leadTimeMinutes": 45,
  "changeFailureRate": 5,
  "deploymentFrequency": 2.5,
  "totalDeployments": 75,
  "successfulDeployments": 71,
  "failedDeployments": 4
}
```

## 📊 Interpretação das Métricas

### Lead Time para Mudanças
- **Elite**: < 1 hora
- **Alto**: < 1 dia
- **Médio**: < 1 semana
- **Baixo**: > 1 semana

### Change Failure Rate
- **Elite**: 0-15%
- **Alto**: 16-30%
- **Médio**: 31-45%
- **Baixo**: > 45%

### Deployment Frequency
- **Elite**: Múltiplos deploys por dia
- **Alto**: Entre 1 por dia e 1 por semana
- **Médio**: Entre 1 por semana e 1 por mês
- **Baixo**: < 1 por mês

## 🎯 Próximos Passos

1. **Fazer o primeiro push na branch main** para testar o workflow
2. **Verificar os logs** em Actions para confirmar que os dados foram enviados
3. **Acessar o dashboard** para ver as métricas
4. **Ajustar o workflow** conforme suas necessidades específicas

## 🐛 Troubleshooting

### As métricas aparecem como "*"
- Certifique-se de que pelo menos 1 deploy foi registrado
- Verifique os logs do GitHub Actions
- Verifique se o backend está acessível

### O workflow não executa
- Confirme que o arquivo está em `.github/workflows/`
- Verifique se você tem permissão para executar Actions
- Revise as configurações de Actions no repositório

### Erro 400 ao enviar métricas
- Verifique se todos os campos obrigatórios estão sendo enviados
- Confirme que o `SONAR_PROJECT_KEY` está correto

## 📚 Referências

- [DORA Metrics](https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [State of DevOps Report](https://dora.dev/)
