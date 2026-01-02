const { Pool } = require('pg')
const dotenv = require('dotenv')
dotenv.config()

const cfg = {
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  user: process.env.PGUSER,
  database: process.env.PGDATABASE
}

if (typeof process.env.PGPASSWORD !== 'undefined') {
  // coerce to string to avoid pg SASL errors when a non-string sneaks in
  cfg.password = String(process.env.PGPASSWORD)
}

if (!cfg.user) {
  console.warn('Postgres user not set (PGUSER). Connection may fail.')
}

const pool = new Pool(cfg)

module.exports = { pool }
