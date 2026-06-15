const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PostMedia = sequelize.define('PostMedia', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  post_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'posts', key: 'id' },
  },
  media_url: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  media_type: {
    type: DataTypes.ENUM('image', 'video'),
    allowNull: false,
    defaultValue: 'image',
  },
  display_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'post_media',
  indexes: [
    { fields: ['post_id'] },
  ],
});

module.exports = PostMedia;
