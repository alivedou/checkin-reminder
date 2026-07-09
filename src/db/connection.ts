import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';

let _db: any;
const DB_PATH = path.resolve(config.dbPath);
let _saveDirty = false;

function autoSave() {
  if (!_saveDirty) return;
  _saveDirty = false;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export async function initDb() {
  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    _db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _db = new SQL.Database();
  }

  _db.run('PRAGMA journal_mode = DELETE');
  _db.run('PRAGMA foreign_keys = ON');
}

// Thin wrapper matching better-sqlite3 sync API
const db = {
  prepare(sql: string) {
    return {
      run(...params: any[]) {
        _db.run(sql, params);
        _saveDirty = true;
        autoSave();
        return { changes: 1 };
      },
      get(...params: any[]) {
        const stmt = _db.prepare(sql);
        if (params.length) stmt.bind(params);
        const row = stmt.step() ? stmt.getAsObject() : undefined;
        stmt.free();
        return row;
      },
      all(...params: any[]) {
        const stmt = _db.prepare(sql);
        if (params.length) stmt.bind(params);
        const rows: any[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      }
    };
  },
  exec(sql: string) {
    _db.run(sql);
    _saveDirty = true;
    autoSave();
  },
  pragma(sql: string) {
    _db.run(sql);
  }
};

export default db;
