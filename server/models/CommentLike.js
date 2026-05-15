const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CommentLike = sequelize.define('CommentLike', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  comment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'comments', key: 'id' },
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
}, {
  tableName: 'comment_likes',
  indexes: [
    { unique: true, fields: ['comment_id', 'user_id'] },
  ],
});

module.exports = CommentLike;
