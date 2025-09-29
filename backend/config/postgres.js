const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.PG_DATABASE,
  process.env.PG_USER,
  process.env.PG_PASSWORD,
  {
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    dialect: 'postgres',
    logging: false
  }
);

module.exports = async function pgConnect() {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected');
  } catch (err) {
    console.error('PostgreSQL connection error:', err);
    throw err;
  }
};

module.exports.sequelize = sequelize;
