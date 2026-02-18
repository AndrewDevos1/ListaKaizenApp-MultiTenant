const { Client } = require('pg');

const oldDB = {
  host: 'metro.proxy.rlwy.net',
  port: 56395,
  user: 'postgres',
  password: 'FNwBgBZSkQZCoeEZwlUFSlnMyoGsqUBg',
  database: 'railway'
};

async function checkAllSchemas() {
  const client = new Client(oldDB);
  await client.connect();
  
  try {
    // Get all schemas
    const schemas = await client.query(`
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `);
    
    console.log('🔍 SCHEMAS ENCONTRADOS:\n');
    
    for (const schema of schemas.rows) {
      const name = schema.schema_name;
      console.log(`\n📦 Schema: "${name}"`);
      
      // Get tables in this schema
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1
        ORDER BY table_name
      `, [name]);
      
      if (tables.rows.length === 0) {
        console.log('   (sem tabelas)');
      } else {
        for (const table of tables.rows) {
          const tableName = table.table_name;
          
          // Get columns
          const cols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = $1 AND table_name = $2
          `, [name, tableName]);
          
          // Count rows
          const count = await client.query(
            `SELECT COUNT(*) FROM "${name}"."${tableName}"`
          );
          
          console.log(`   📋 ${tableName} (${count.rows[0].count} linhas)`);
          cols.rows.forEach(col => {
            console.log(`       - ${col.column_name}: ${col.data_type}`);
          });
        }
      }
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await client.end();
  }
}

checkAllSchemas();
