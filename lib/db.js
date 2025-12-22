// lib/db.js

import { Pool } from 'pg';

// const pool = new Pool({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'diabetes_tracker',
//   password: '12345678',
//   port: 5432,
// });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export default pool;