const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('student', 'admin'), defaultValue: 'student' },
}, { tableName: 'users' });

const Equipment = sequelize.define('Equipment', {
  name: { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT },
  category: { type: DataTypes.STRING(50), allowNull: false },
  brand: { type: DataTypes.STRING(80) },
  location: { type: DataTypes.STRING(100) },
  image: { type: DataTypes.STRING(255) },
  available: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'equipment' });

const Reservation = sequelize.define('Reservation', {
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  equipment_id: { type: DataTypes.INTEGER, allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('active', 'cancelled'), defaultValue: 'active' },
}, { tableName: 'reservations' });

User.hasMany(Reservation, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Reservation.belongsTo(User, { foreignKey: 'user_id' });
Equipment.hasMany(Reservation, { foreignKey: 'equipment_id', onDelete: 'CASCADE' });
Reservation.belongsTo(Equipment, { foreignKey: 'equipment_id' });

module.exports = { sequelize, User, Equipment, Reservation };