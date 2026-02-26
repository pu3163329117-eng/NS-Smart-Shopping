// The Core of our Mock Backend
// Simulates a database with tables for Users, Services, Orders

const STORAGE_KEY = 'ns_mock_db_v1';

const initialData = {
  users: [
    { id: 'u1', name: 'Tony Stark', role: 'admin', balance: 1000000 },
    { id: 'u2', name: 'Student A', role: 'student', balance: 500 },
    { 
      id: 'u3', 
      name: 'Teen Maker X', 
      role: 'maker', 
      balance: 150,
      makerProfile: {
        level: 2,
        exp: 350,
        nextLevelExp: 500,
        reputation: 4.8,
        badges: ['初出茅庐', '3D打印小能手'],
        skills: ['Python', '3D Modeling']
      }
    }
  ],
  services: [
    { id: 's1', providerId: 'u3', name: 'Python 零基础入门', price: 99, type: 'course', status: 'active', sales: 45, image: 'https://api.dicebear.com/7.x/shapes/svg?seed=Python' },
    { id: 's2', providerId: 'u3', name: '3D 打印代工', price: 50, type: '3d_print', status: 'active', sales: 12, image: 'https://api.dicebear.com/7.x/shapes/svg?seed=3DPrint' }
  ],
  orders: []
};

class MockDatabase {
  constructor() {
    this.data = this.load();
  }

  load() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(initialData));
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  // --- Generic CRUD ---
  
  findAll(collection) {
    return this.data[collection] || [];
  }

  findById(collection, id) {
    return (this.data[collection] || []).find(item => item.id === id);
  }

  insert(collection, item) {
    if (!this.data[collection]) this.data[collection] = [];
    const newItem = { 
      id: collection.slice(0,1) + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
      ...item 
    };
    this.data[collection].unshift(newItem);
    this.save();
    return newItem;
  }

  update(collection, id, updates) {
    const index = (this.data[collection] || []).findIndex(item => item.id === id);
    if (index > -1) {
      this.data[collection][index] = { ...this.data[collection][index], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.data[collection][index];
    }
    return null;
  }

  delete(collection, id) {
    const index = (this.data[collection] || []).findIndex(item => item.id === id);
    if (index > -1) {
      this.data[collection].splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }
}

export const db = new MockDatabase();
