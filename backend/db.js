import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgis_db',
  password: '123-M-456',
  port: 5432,
});

export default pool;