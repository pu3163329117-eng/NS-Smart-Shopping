import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';

const Service = sequelize.define('Service', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  provider_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('course', '3d_print', 'custom'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'pending', 'offline'),
    defaultValue: 'pending'
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  sales: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// Define Relationship
User.hasMany(Service, { foreignKey: 'provider_id' });
Service.belongsTo(User, { foreignKey: 'provider_id', as: 'provider' });

export default Service;
