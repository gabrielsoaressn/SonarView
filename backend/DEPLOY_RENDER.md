# 🚀 Deploy no Render - Migração PostgreSQL

## ✅ Status: TUDO PRONTO PARA DEPLOY!

Os testes locais confirmaram que:
- ✅ Conexão com PostgreSQL funcionando
- ✅ Métricas SonarCloud sendo salvas no banco
- ✅ Schema compatível com o código
- ✅ Conversão de dados funcionando perfeitamente

---

## 📦 O que Está Pronto

### Arquivos Novos/Modificados:
1. **`src/config/database.js`** - Pool PostgreSQL com SSL
2. **`src/models/sonarcloud.js`** - Model com conversão de dados
3. **`src/models/dora.js`** - Model DORA completo
4. **`server-postgres.js`** - Servidor usando PostgreSQL

### Database URL Correta:
```
postgresql://metricsuser:ltvrU6kkn8dGGXMEKHbJFFiJ7FVFkWgR@dpg-d3r4mmu3jp1c7391pac0-a.oregon-postgres.render.com/metricsdb_f75l
```

---

## 🎯 Passos para Deploy (FAÇA NESSA ORDEM)

### Passo 1: Backup do Código Atual
```bash
cd backend
git add .
git commit -m "backup: salvar versão com JSON antes de migrar"
git push
```

### Passo 2: Configurar Variável no Render

1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Clique no seu serviço web (backend)
3. Vá em **Environment**
4. Adicione/atualize:
   ```
   DATABASE_URL=postgresql://metricsuser:ltvrU6kkn8dGGXMEKHbJFFiJ7FVFkWgR@dpg-d3r4mmu3jp1c7391pac0-a.oregon-postgres.render.com/metricsdb_f75l
   ```
5. Clique em **Save Changes**

### Passo 3: Substituir o server.js

```bash
cd backend

# Fazer backup do server.js antigo
mv server.js server-json-backup.js

# Usar a versão PostgreSQL como principal
cp server-postgres.js server.js

# Commit
git add .
git commit -m "feat: migrar para PostgreSQL com persistência permanente"
git push
```

### Passo 4: Verificar o Deploy

Após o push, o Render vai fazer deploy automaticamente.

1. Acesse **Logs** no Render Dashboard
2. Procure por:
   ```
   ✅ Conectado ao PostgreSQL
   📊 Coletando métricas do SonarCloud...
   ✓ fklearn salvo em...
   ✓ commons-lang salvo em...
   ✨ Quality Lens Backend rodando em...
   ```

3. Se ver essas mensagens: **SUCESSO! ✅**

### Passo 5: Testar os Endpoints

```bash
# Health check (deve retornar database: "connected")
curl https://recebe-dados-sonarcloud.onrender.com/api/health

# Métricas mais recentes
curl https://recebe-dados-sonarcloud.onrender.com/api/metrics/latest?project=fklearn

# Métricas DORA
curl https://recebe-dados-sonarcloud.onrender.com/api/dora/metrics?project=fklearn&days=30
```

---

## 🧪 Teste do DORA

Registre um deployment de teste:

```bash
curl -X POST https://recebe-dados-sonarcloud.onrender.com/api/dora/deployment \
  -H "Content-Type: application/json" \
  -d '{
    "projectKey": "gabrielsoaressn_fklearn",
    "commitSha": "test-postgres-123",
    "commitTimestamp": "2025-10-20T15:00:00Z",
    "deploymentTimestamp": "2025-10-20T15:05:00Z",
    "environment": "production",
    "status": "success",
    "branch": "main"
  }'
```

Depois busque:
```bash
curl https://recebe-dados-sonarcloud.onrender.com/api/dora/metrics?project=fklearn&days=30
```

Deve retornar métricas calculadas! 🎉

---

## 🔥 Diferenças Chave

| Item | Antes (JSON) | Depois (PostgreSQL) |
|------|-------------|---------------------|
| **Arquivo principal** | `server.js` | `server.js` (era `server-postgres.js`) |
| **Persistência** | Temporária | Permanente ✅ |
| **Métricas DORA** | Perdidas em reinícios | Preservadas ✅ |
| **Performance** | Limitada | Otimizada com índices ✅ |
| **Backup** | Manual | Automático (Render) ✅ |

---

## ⚠️ Pontos de Atenção

### 1. GitHub Actions Continuam Funcionando
O endpoint `/api/dora/deployment` **não mudou**. Seus workflows GitHub Actions vão continuar funcionando normalmente!

### 2. Frontend Não Precisa Mudar
A API retorna o mesmo formato. O frontend continua funcionando sem alterações.

### 3. Dados Antigos
Os dados em JSON **não serão migrados** automaticamente. Isso é OK porque:
- Métricas SonarCloud serão coletadas novamente a cada 10 minutos
- Métricas DORA virão dos próximos deploys via GitHub Actions

### 4. Rollback (se necessário)
Se algo der errado, você pode voltar:
```bash
cd backend
mv server.js server-postgres-broken.js
mv server-json-backup.js server.js
git commit -am "rollback: voltar para JSON temporariamente"
git push
```

---

## 📊 Verificando se Funcionou

### ✅ Sinais de Sucesso:

1. **Logs mostram:**
   ```
   ✅ Conectado ao PostgreSQL
   ✓ fklearn salvo em...
   ```

2. **Health endpoint:**
   ```json
   {
     "status": "healthy",
     "database": "connected"
   }
   ```

3. **Dados persistem após reinício do Render**

### ❌ Sinais de Problema:

1. **Logs mostram:**
   ```
   ❌ Erro ao conectar no PostgreSQL
   ```
   **Solução:** Verifique DATABASE_URL no Environment

2. **Erro: "relation does not exist"**
   **Solução:** Schema está OK (você já criou)

3. **Erro: "value too long for type"**
   **Solução:** Já corrigido no código!

---

## 🎉 Após Deploy Bem-Sucedido

1. **Monitore o primeiro ciclo de coleta** (primeiros 10 minutos)
2. **Faça um deploy via GitHub Actions** para testar métricas DORA
3. **Verifique no banco** (opcional):
   ```sql
   SELECT COUNT(*) FROM sonarcloud_metrics;
   SELECT COUNT(*) FROM dora_deployments;
   ```

---

## 📈 Próximos Passos (Futuro)

Depois que tudo estiver estável:

1. **Limpar código antigo:**
   ```bash
   rm server-json-backup.js
   rm -rf data/  # JSON files não são mais necessários
   ```

2. **Documentar:**
   - Atualizar README com nova arquitetura
   - Documentar schema do banco

3. **Monitoramento:**
   - Configurar alertas no Render
   - Adicionar logs estruturados

---

## 🆘 Se Algo Der Errado

1. **Verifique os logs do Render** primeiro
2. **Teste a conexão com o banco** via render CLI:
   ```bash
   render psql dpg-d3r4mmu3jp1c7391pac0-a
   ```
3. **Confirme que DATABASE_URL está configurada**
4. **Se necessário, faça rollback** (instruções acima)

---

## ✨ Resumo Final

### O que vai acontecer:
1. ✅ Servidor conecta no PostgreSQL
2. ✅ Coleta métricas SonarCloud automaticamente
3. ✅ Salva no banco (permanente)
4. ✅ Recebe deploys via GitHub Actions
5. ✅ Calcula métricas DORA corretamente
6. ✅ Tudo continua funcionando mesmo após reinícios

### Tempo estimado:
- Deploy: ~3-5 minutos
- Primeira coleta de métricas: ~2 minutos
- Teste completo: ~10 minutos

---

## 🚀 Está Pronto para Deploy!

Siga os **5 passos** acima nessa ordem e tudo vai funcionar!

**Boa sorte! 🎯**

Se precisar de ajuda, consulte os logs do Render e os outros guias:
- `SETUP_COMPLETO.md` - Troubleshooting detalhado
- `POSTGRES_MIGRATION_GUIDE.md` - Guia técnico completo
