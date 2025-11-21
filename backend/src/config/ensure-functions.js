// Helper para garantir que as funções PostgreSQL existam
const { pool } = require('./database');

async function ensureDatabaseFunctions() {
  console.log('🔧 Verificando funções do banco de dados...');

  const functions = [
    {
      name: 'cleanup_old_sonarcloud_metrics',
      sql: `
        CREATE OR REPLACE FUNCTION cleanup_old_sonarcloud_metrics(
          p_project_key VARCHAR,
          p_keep_count INTEGER
        ) RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          WITH to_delete AS (
            SELECT id
            FROM sonarcloud_metrics
            WHERE project_key = p_project_key
            ORDER BY timestamp DESC
            OFFSET p_keep_count
          )
          DELETE FROM sonarcloud_metrics
          WHERE id IN (SELECT id FROM to_delete);

          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql;
      `
    },
    {
      name: 'cleanup_old_deployments',
      sql: `
        CREATE OR REPLACE FUNCTION cleanup_old_deployments(
          p_project_key VARCHAR,
          p_keep_count INTEGER
        ) RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          WITH to_delete AS (
            SELECT id
            FROM dora_deployments
            WHERE project_key = p_project_key
            ORDER BY deployment_timestamp DESC
            OFFSET p_keep_count
          )
          DELETE FROM dora_deployments
          WHERE id IN (SELECT id FROM to_delete);

          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql;
      `
    }
  ];

  let createdCount = 0;
  let existingCount = 0;

  for (const func of functions) {
    try {
      await pool.query(func.sql);
      createdCount++;
      console.log(`  ✓ ${func.name}`);
    } catch (err) {
      // Se já existe ou erro de permissão, está OK
      if (err.code === '42710' || err.code === '42501') {
        existingCount++;
      } else {
        console.warn(`  ⚠️  ${func.name}: ${err.message}`);
      }
    }
  }

  console.log(`✅ Funções verificadas: ${createdCount} criadas, ${existingCount} já existentes\n`);
}

module.exports = { ensureDatabaseFunctions };
