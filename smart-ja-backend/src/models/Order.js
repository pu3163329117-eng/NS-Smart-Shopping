import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';
import Service from './Service.js';

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  buyer_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  service_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Service,
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('paid', 'processing', 'completed', 'cancelled'),
    defaultValue: 'paid'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

// Relationships
User.hasMany(Order, { foreignKey: 'buyer_id' });
Order.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyer' });

Service.hasMany(Order, { foreignKey: 'service_id' });
Order.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });

export default Order;
