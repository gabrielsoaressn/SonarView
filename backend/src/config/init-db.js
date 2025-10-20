#!/usr/bin/env node
// Script para inicializar o banco de dados PostgreSQL
const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('./database');

async function initializeDatabase() {
  console.log('🚀 Inicializando banco de dados PostgreSQL...\n');

  // Testa conexão
  console.log('📡 Testando conexão...');
  const connected = await testConnection();

  if (!connected) {
    console.error('❌ Não foi possível conectar ao banco de dados');
    console.error('Verifique se a variável DATABASE_URL está configurada corretamente');
    process.exit(1);
  }

  // Lê o schema SQL
  console.log('\n📄 Lendo arquivo de schema...');
  const schemaPath = path.join(__dirname, 'schema.sql');

  let schemaSql;
  try {
    schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('✅ Schema carregado');
  } catch (err) {
    console.error('❌ Erro ao ler schema.sql:', err.message);
    process.exit(1);
  }

  // Executa o schema
  console.log('\n🔧 Criando tabelas e funções...');
  try {
    await pool.query(schemaSql);
    console.log('✅ Schema aplicado com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao aplicar schema:', err.message);
    console.error(err);
    process.exit(1);
  }

  // Verifica tabelas criadas
  console.log('\n🔍 Verificando tabelas criadas...');
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('\n📊 Tabelas disponíveis:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Verifica funções criadas
    const functionsResult = await pool.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
      ORDER BY routine_name
    `);

    console.log('\n⚙️  Funções disponíveis:');
    functionsResult.rows.forEach(row => {
      console.log(`  ✓ ${row.routine_name}`);
    });

  } catch (err) {
    console.error('❌ Erro ao verificar tabelas:', err.message);
  }

  // Estatísticas do banco
  console.log('\n📈 Estatísticas iniciais:');
  try {
    const metricsCount = await pool.query('SELECT COUNT(*) FROM sonarcloud_metrics');
    const deploymentsCount = await pool.query('SELECT COUNT(*) FROM dora_deployments');

    console.log(`  • Métricas SonarCloud: ${metricsCount.rows[0].count}`);
    console.log(`  • Deployments DORA: ${deploymentsCount.rows[0].count}`);
  } catch (err) {
    console.error('❌ Erro ao buscar estatísticas:', err.message);
  }

  console.log('\n✨ Banco de dados inicializado com sucesso!');
  console.log('🎯 Pronto para receber dados\n');

  await pool.end();
  process.exit(0);
}

// Executar se chamado diretamente
if (require.main === module) {
  initializeDatabase().catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  });
}

module.exports = { initializeDatabase };
