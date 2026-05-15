const sequelize = require('./config/database');
require('./models'); // Loads all models so they reflect the latest definitions

async function syncDB() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected.');
    await sequelize.sync({ alter: true });
    console.log('✅ Database models altered to match schema.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Sync error:', err);
    process.exit(1);
  }
}

syncDB();
