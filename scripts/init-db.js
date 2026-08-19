const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'pulse_finance';

  console.log(`Connecting to MySQL server at ${host}:${port} as ${user}...`);

  try {
    const connection = await mysql.createConnection({ host, port, user, password });
    console.log(`Creating database '${dbName}' if it does not exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.query(`USE \`${dbName}\`;`);

    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // Split SQL statements by semicolon
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.toUpperCase().startsWith('CREATE DATABASE') && !s.toUpperCase().startsWith('USE'));

    for (const statement of statements) {
      await connection.query(statement);
    }

    // Migration: add is_paid column if not existing
    try {
      await connection.query(`ALTER TABLE transactions ADD COLUMN is_paid TINYINT(1) DEFAULT 0`);
    } catch (e) {
      // Column might already exist, ignore error
    }

    console.log('Database initialization completed successfully!');

    await connection.end();
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
}

initDatabase();
