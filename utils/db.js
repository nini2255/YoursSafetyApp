import * as SQLite from 'expo-sqlite';

let dbInstance = null;
let initPromise = null;

const _initialize = async () => {
  try {
    const db = await SQLite.openDatabaseAsync('gallery.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY NOT NULL, 
        localUri TEXT NOT NULL, 
        type TEXT NOT NULL, 
        createdAt TEXT NOT NULL, 
        journalId TEXT, 
        journalTitle TEXT
      );
    `);
    console.log('Gallery DB initialized');
    return db;
  } catch (error) {
    console.error('Fatal DB Init Error:', error);
    throw error;
  }
};

export const getDB = async () => {
  if (dbInstance) return dbInstance;
  if (!initPromise) initPromise = _initialize();
  dbInstance = await initPromise;
  return dbInstance;
};

export const initDB = async () => { await getDB(); };

export const insertMedia = async (localUri, type, journalId = null, journalTitle = null, createdDate = null) => {
  try {
    const db = await getDB();
    const dateToSave = createdDate ? createdDate : new Date().toISOString();
    const result = await db.runAsync(
      'INSERT INTO media (localUri, type, createdAt, journalId, journalTitle) VALUES (?, ?, ?, ?, ?)',
      localUri, type, dateToSave, journalId, journalTitle
    );
    return result;
  } catch (error) {
    console.error('Error inserting media:', error);
    return null;
  }
};

// NEW: Delete media record
export const deleteMedia = async (id) => {
  try {
    const db = await getDB();
    await db.runAsync('DELETE FROM media WHERE id = ?', id);
  } catch (error) {
    console.error('Error deleting media from DB:', error);
  }
};

export const getGalleryMedia = async () => {
  try {
    const db = await getDB();
    return await db.getAllAsync('SELECT * FROM media ORDER BY createdAt DESC');
  } catch (error) {
    console.error('Error fetching gallery media:', error);
    return [];
  }
};