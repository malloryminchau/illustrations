const pg = require("pg");
require('dotenv').config({ path: '/home/mallory/lighthouse/illustrations/api/.env' });

let dbParams = {};

console.log("env", process.env.PGUSER)

if (process.env.DATABASE_URL) {
  dbParams = {
    connectionString: process.env.DATABASE_URL || ""
  }
} else {
  dbParams = {
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE
  }
}


console.log(dbParams)

const client = new pg.Client(dbParams);




client
  .connect()
  .then(() => console.log('Database connected'))
  .catch(e => console.log(`Error connecting to Postgres server:\n${e}`));

// console.log(client)

module.exports = client;
