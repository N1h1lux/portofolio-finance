import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '..', '..', 'data', 'database.sqlite');

async function initializeDb() {
  const dataDir = path.dirname(dbPath);
  await fs.mkdir(dataDir, { recursive: true });
  
  // Utilisation directe de better-sqlite3 (plus robuste)
  const db = new Database(dbPath);

  // Activation de WAL pour de meilleures performances en lecture/écriture
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      longName TEXT,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      quantity REAL DEFAULT 1,
      purchasePrice REAL, 
      sector TEXT,
      country TEXT,
      purchaseDate DATE
    );
  `);
  
  // L'ajout de colonne est géré par une simple vérification
  try {
    db.exec('ALTER TABLE assets ADD COLUMN purchaseDate DATE');
  } catch (e) {
    // La colonne existe déjà, on ignore l'erreur
  }

  console.log('Database initialized successfully at:', dbPath);
  return db;
}

// Nous exportons une promesse qui se résout avec l'instance de la base de données
export const dbPromise = initializeDb();