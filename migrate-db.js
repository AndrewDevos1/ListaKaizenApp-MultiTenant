const { Client } = require('pg');

const oldDB = {
  host: 'metro.proxy.rlwy.net',
  port: 56395,
  user: 'postgres',
  password: 'FNwBgBZSkQZCoeEZwlUFSlnMyoGsqUBg',
  database: 'railway'
};

async function migrateDatabase() {
  console.log('📊 Analisando banco antigo...\n');
  
  const oldClient = new Client(oldDB);
  await oldClient.connect();
  
  try {
    // Get all tables
    const result = await oldClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`✅ Encontradas ${result.rows.length} tabelas:\n`);
    
    if (result.rows.length === 0) {
      console.log('⚠️  Banco antigo está vazio! Nenhuma tabela encontrada.');
      console.log('\nOpções:');
      console.log('1. Se o banco antigo tem dados, verifique o schema correto');
      console.log('2. Se está vazio, começamos do zero com o novo schema');
    } else {
      for (const row of result.rows) {
        console.log(`  - ${row.table_name}`);
        
        // Show columns
        const cols = await oldClient.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
        `, [row.table_name]);
        
        cols.rows.forEach(col => {
          console.log(`      ${col.column_name}: ${col.data_type}`);
        });
        
        // Count rows
        const count = await oldClient.query(`SELECT COUNT(*) FROM "${row.table_name}"`);
        console.log(`      (${count.rows[0].count} registros)\n`);
      }
    }
  } finally {
    await oldClient.end();
  }
}

migrateDatabase().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
