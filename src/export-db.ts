import 'reflect-metadata';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function exportDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:@Cluster08@localhost:5432/mini-banking',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesResult.rows.map((r: any) => r.table_name);
    console.log(`Found ${tables.length} tables: ${tables.join(', ')}`);

    let sql = `-- Mini Banking Platform Database Export
-- Exported: ${new Date().toISOString()}
-- Database: mini-banking

`;

    // Export schema
    for (const table of tables) {
      const schemaResult = await client.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [table]);

      sql += `\n-- Table: ${table}\n`;
      sql += `DROP TABLE IF EXISTS "${table}" CASCADE;\n\n`;

      // Build CREATE TABLE statement from schema
      const columns = schemaResult.rows.map((col: any) => {
        let def = `"${col.column_name}" ${col.data_type}`;
        if (col.character_maximum_length) def += `(${col.character_maximum_length})`;
        if (col.is_nullable === 'NO') def += ' NOT NULL';
        if (col.column_default) def += ` DEFAULT ${col.column_default}`;
        return def;
      });

      // Get primary keys and constraints
      const pkResult = await client.query(`
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = $1::regclass AND i.indisprimary;
      `, [table]);

      const pkCols = pkResult.rows.map((r: any) => r.attname);
      if (pkCols.length > 0) {
        columns.push(`PRIMARY KEY (${pkCols.map((c: string) => `"${c}"`).join(', ')})`);
      }

      sql += `CREATE TABLE "${table}" (\n  ${columns.join(',\n  ')}\n);\n\n`;

      // Export data
      const dataResult = await client.query(`SELECT * FROM "${table}"`);
      if (dataResult.rows.length > 0) {
        sql += `-- Data for ${table}\n`;
        for (const row of dataResult.rows) {
          const columns = Object.keys(row);
          const values = columns.map((col) => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (typeof val === 'boolean') return val ? 'true' : 'false';
            return String(val);
          });
          sql += `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        sql += '\n';
      }
    }

    const outputFile = path.join(process.cwd(), 'db-export.sql');
    fs.writeFileSync(outputFile, sql, 'utf8');
    console.log(`✓ Database exported to ${outputFile}`);
    console.log(`  File size: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);

    await client.end();
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }
}

exportDatabase();

