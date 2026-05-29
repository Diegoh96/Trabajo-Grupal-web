import { database } from './patterns/creational/DatabaseSingleton.js';

export const pool = database.pool;
export const query = (sql, params = []) => database.query(sql, params);
export const connect = () => database.connect();
export const closeDatabase = () => database.end();
