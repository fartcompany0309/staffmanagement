import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

async function testConnection() {
  try {
    console.log('接続を試みています...');
    await sql.connect(config);
    console.log('✅ 接続成功!');
    const result = await sql.query`SELECT GETDATE() AS currentTime`;
    console.log('サーバー時刻:', result.recordset[0].currentTime);
    await sql.close();
  } catch (err) {
    console.error('❌ 接続エラー:', err.message);
  }
}

testConnection();