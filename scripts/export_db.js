const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'architect_erp',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

async function exportDatabase() {
  console.log('Connecting to database...');
  await client.connect();
  console.log('Connected successfully!');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportDir = path.resolve(__dirname, 'database_exports', `export_${timestamp}`);
  const csvDir = path.join(exportDir, 'csv');

  fs.mkdirSync(csvDir, { recursive: true });

  // 1. Get all public tables
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tables = tablesRes.rows.map(r => r.table_name);
  console.log(`Found ${tables.length} tables:`, tables.join(', '));

  const fullData = {};
  let sqlDump = `-- SSA Database Export\n-- Generated on: ${new Date().toISOString()}\n-- Database: ${process.env.DB_DATABASE}\n\n`;

  for (const table of tables) {
    console.log(`Exporting table: "${table}"...`);
    const dataRes = await client.query(`SELECT * FROM "${table}"`);
    const rows = dataRes.rows;
    fullData[table] = rows;

    console.log(`  -> ${rows.length} rows`);

    // Write CSV
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      const csvLines = [headers.join(',')];

      for (const row of rows) {
        const line = headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          if (val instanceof Date) return `"${val.toISOString()}"`;
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        }).join(',');
        csvLines.push(line);
      }

      fs.writeFileSync(path.join(csvDir, `${table}.csv`), csvLines.join('\n'), 'utf8');

      // Generate SQL INSERT statements
      sqlDump += `-- Table: ${table}\n`;
      for (const row of rows) {
        const cols = Object.keys(row).map(c => `"${c}"`).join(', ');
        const vals = Object.values(row).map(v => {
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'boolean' || typeof v === 'number') return v;
          if (v instanceof Date) return `'${v.toISOString()}'`;
          if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
          return `'${String(v).replace(/'/g, "''")}'`;
        }).join(', ');
        sqlDump += `INSERT INTO "${table}" (${cols}) VALUES (${vals});\n`;
      }
      sqlDump += '\n';
    } else {
      fs.writeFileSync(path.join(csvDir, `${table}.csv`), '', 'utf8');
    }
  }

  // Write full JSON
  const jsonPath = path.join(exportDir, 'database_export.json');
  fs.writeFileSync(jsonPath, JSON.stringify(fullData, null, 2), 'utf8');

  // Write SQL Dump
  const sqlPath = path.join(exportDir, 'database_dump.sql');
  fs.writeFileSync(sqlPath, sqlDump, 'utf8');

  // Also write a latest summary JSON directly in database_exports
  fs.writeFileSync(path.resolve(__dirname, 'database_exports', 'latest_export.json'), JSON.stringify(fullData, null, 2), 'utf8');

  console.log('\n================ EXPORT COMPLETE ================');
  console.log(`Directory: ${exportDir}`);
  console.log(`1. JSON Export: ${jsonPath}`);
  console.log(`2. SQL Dump:    ${sqlPath}`);
  console.log(`3. CSV Files:   ${csvDir}`);
  console.log('=================================================\n');

  await client.end();
}

exportDatabase().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
