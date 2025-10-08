const Sequelize = require('sequelize');
const mysql2 = require('mysql2');

// Define your database connection parameters
const dbConfig = {
  username: process.env.DBUSER,
  password: process.env.DBPASSWORD,
  database: process.env.DBDATABASE,
  host: process.env.DBHOST,
  port: process.env.DBPORT,
  dialect: 'mysql',
};

// Create Sequelize instance
export const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    port: dbConfig.port,
    dialectModule: mysql2,
    timezone: '+00:00', // Use UTC
    dialectOptions: {
      timezone: 'Z', // This is for reading from the database
    },
  }
);

// Define a generic function for executing SQL queries
export const query = async (sql, values, callback) => {
  try {
    const rows = await sequelize.query(sql, {
      replacements: values,
      type: Sequelize.QueryTypes.SELECT,
    });
    callback(null, rows);
  } catch (error) {
    callback(error);
  }
};

const db = {
  query,
  sequelize,
};

export default db;
