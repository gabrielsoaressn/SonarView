// config/database.js
const { Pool } = require('pg');

// Configuração do pool de conexões
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessário para Render
  },

  // Configurações do pool
  max: 20, // Máximo de conexões no pool
  idleTimeoutMillis: 30000, // Tempo antes de fechar conexão idle
  connectionTimeoutMillis: 10000, // Timeout para nova conexão
});

// Tratamento de erros do pool
pool.on('error', (err, client) => {
  console.error('❌ Erro inesperado no pool do PostgreSQL:', err);
  process.exit(-1);
});

// Função para testar a conexão
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Conectado ao PostgreSQL:', result.rows[0].now);
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Erro ao conectar no PostgreSQL:', err.message);
    return false;
  }
};

// Função helper para executar queries com retry
const queryWithRetry = async (text, params, maxRetries = 3) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (err) {
      lastError = err;
      console.warn(`⚠️  Tentativa ${i + 1}/${maxRetries} falhou:`, err.message);
      
      // Aguarda antes de tentar novamente (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError;
};

// Função para fechar todas as conexões
const closePool = async () => {
  try {
    await pool.end();
    console.log('✅ Pool do PostgreSQL fechado');
  } catch (err) {
    console.error('❌ Erro ao fechar pool:', err);
  }
};

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  queryWithRetry,
  testConnection,
  closePool
};