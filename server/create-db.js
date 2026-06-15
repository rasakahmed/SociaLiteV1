const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDB() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    console.log('Database created');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
createDB();
