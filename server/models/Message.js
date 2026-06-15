const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  receiver_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  encrypted_content: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
  encrypted_key: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
  sender_encrypted_key: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  iv: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'messages',
  timestamps: true,
});

module.exports = Message;
