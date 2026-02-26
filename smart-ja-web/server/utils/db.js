const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../db');

if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync(DB_PATH, { recursive: true });
}

const sqlitePath = path.join(DB_PATH, 'data.sqlite');
const db = new Database(sqlitePath);

db.exec(`
  CREATE TABLE IF NOT EXISTS store (
    collection TEXT PRIMARY KEY,
    data TEXT
  )
`);

const readJSON = (file) => {
  const row = db.prepare('SELECT data FROM store WHERE collection = ?').get(file);
  if (row) {
    try {
      return JSON.parse(row.data);
    } catch (error) {
      console.error(`Error parsing JSON for collection ${file}:`, error.message);
      return [];
    }
  }

  // Fallback to legacy JSON file migration if table is empty
  const filePath = path.join(DB_PATH, `${file}.json`);
  if (!fs.existsSync(filePath)) return [];
  try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const parsedData = JSON.parse(rawData);
    // Auto-migrate to SQLite
    writeJSON(file, parsedData);
    return parsedData;
  } catch (error) {
    console.error(`Error reading legacy ${file}.json:`, error.message);
    return [];
  }
};

const writeJSON = (file, data) => {
  db.prepare('INSERT INTO store (collection, data) VALUES (?, ?) ON CONFLICT(collection) DO UPDATE SET data=excluded.data').run(file, JSON.stringify(data));
  // Optional: Keep writing legacy json file for debugging or backward compatibility during transition
  // fs.writeFileSync(path.join(DB_PATH, `${file}.json`), JSON.stringify(data, null, 2));
};

module.exports = {
  readJSON,
  writeJSON
};
