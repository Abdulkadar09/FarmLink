// db.js
// This file creates a reusable connection pool to MySQL.
// A "pool" means Node keeps a few connections ready instead of
// opening/closing a new one for every single query - faster and safer.

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,   // max simultaneous connections
  queueLimit: 0
});

// .promise() lets us use async/await instead of callback functions
const promisePool = pool.promise();

module.exports = promisePool;
