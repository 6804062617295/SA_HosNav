const { Pool } = require('pg');
require('dotenv').config();

// ใช้ DATABASE_URL แบบบรรทัดเดียวจบ (เช่น จาก Supabase)
// หรือจะใช้แบบแยกค่า (Local) ก็ยังรองรับอยู่
const pool = new Pool(
    process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'hosnav',
        password: process.env.DB_PASSWORD || 'postgres',
        port: process.env.DB_PORT || 5432,
    }
);

module.exports = {
    query: (text, params) => pool.query(text, params),
};
