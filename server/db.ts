import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_FILE || path.join(__dirname, "data.db");

let dbInstance: SqlJsDatabase | null = null;

export interface PreparedStatement {
  run(...params: any[]): any;
  get(...params: any[]): any;
  all(...params: any[]): any[];
}

export interface DatabaseWrapper {
  prepare(sql: string): PreparedStatement;
  exec(sql: string): void;
  transaction(fn: (items: any[]) => void): (items: any[]) => void;
}

// Create a wrapper that mimics better-sqlite3 API
function createStatementWrapper(db: SqlJsDatabase, sql: string): PreparedStatement {
  return {
    run(...params: any[]): any {
      try {
        db.run(sql, params);
        return { changes: db.getRowsModified() };
      } catch (err) {
        throw err;
      }
    },
    get(...params: any[]): any {
      try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      } catch (err) {
        throw err;
      }
    },
    all(...params: any[]): any[] {
      try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results: any[] = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      } catch (err) {
        throw err;
      }
    },
  };
}

function createDbWrapper(sqlDb: SqlJsDatabase): DatabaseWrapper {
  return {
    prepare(sql: string): PreparedStatement {
      return createStatementWrapper(sqlDb, sql);
    },
    exec(sql: string): void {
      sqlDb.run(sql);
    },
    transaction(fn: (items: any[]) => void) {
      return (items: any[]) => {
        sqlDb.run("BEGIN TRANSACTION");
        try {
          fn(items);
          sqlDb.run("COMMIT");
        } catch (err) {
          sqlDb.run("ROLLBACK");
          throw err;
        }
      };
    },
  };
}

async function initializeDatabaseImpl(): Promise<DatabaseWrapper | null> {
  try {
    const SQL = await initSqlJs();

    let sqlDb: SqlJsDatabase;

    // Try to load existing database
    if (fs.existsSync(DB_FILE)) {
      try {
        const data = fs.readFileSync(DB_FILE);
        sqlDb = new SQL.Database(data);
      } catch (err) {
        console.warn("Could not load existing database, creating new one");
        sqlDb = new SQL.Database();
      }
    } else {
      sqlDb = new SQL.Database();
    }

    dbInstance = sqlDb;
    return createDbWrapper(sqlDb);
  } catch (err: any) {
    console.error("Warning: Could not initialize SQLite database:", err.message);
    return null;
  }
}

let initPromise: Promise<DatabaseWrapper | null> | null = null;

export async function ensureDbInitialized(): Promise<DatabaseWrapper | null> {
  if (!initPromise) {
    initPromise = initializeDatabaseImpl();
  }
  return initPromise;
}

export async function getDb(): Promise<DatabaseWrapper> {
  const db = await ensureDbInitialized();
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

// For routes that expect synchronous db access, provide a lazy proxy
export const db = new Proxy(
  {},
  {
    get(_, prop: string | symbol) {
      return (...args: any[]) => {
        if (!dbInstance) {
          throw new Error("Database not initialized");
        }
        const wrapper = createDbWrapper(dbInstance);
        return (wrapper as any)[prop](...args);
      };
    },
  }
) as DatabaseWrapper;

export async function initializeDatabase() {
  const db = await ensureDbInitialized();

  if (!db) {
    console.warn("Database not available, skipping initialization");
    return;
  }

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS menus (
        id TEXT PRIMARY KEY,
        version TEXT,
        item_key TEXT,
        name TEXT,
        description TEXT,
        price INTEGER,
        category TEXT,
        image TEXT
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_no TEXT UNIQUE,
        created_at TEXT,
        updated_at TEXT,
        guest_name TEXT,
        room_no TEXT,
        notes TEXT,
        source TEXT,
        menu_version TEXT,
        status TEXT,
        payment_status TEXT,
        requested_time TEXT,
        history TEXT,
        total INTEGER
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        item_key TEXT,
        name TEXT,
        qty INTEGER,
        price INTEGER
      );
    `);

    // Seed sample menu if empty
    const menuCountStmt = db.prepare("SELECT COUNT(*) as count FROM menus");
    const menuCount = menuCountStmt.get() as any;
    if (!menuCount || menuCount.count === 0) {
      seedSampleMenu(db);
    }

    // Save to disk
    if (dbInstance) {
      try {
        const data = dbInstance.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_FILE, buffer);
      } catch (err) {
        console.error("Could not save database to disk:", err);
      }
    }
  } catch (err) {
    console.error("Error during database initialization:", err);
  }
}

function seedSampleMenu(db: DatabaseWrapper) {
  const items = [
    {
      item_key: "paneer_tikka",
      name: "Paneer Tikka Masala",
      price: 255,
      category: "Main",
      description: "Cottage cheese in rich gravy",
    },
    {
      item_key: "garlic_fried_rice",
      name: "Garlic Fried Rice",
      price: 180,
      category: "Rice",
      description: "Aromatic rice with garlic",
    },
    {
      item_key: "veg_biryani",
      name: "Veg Biryani",
      price: 220,
      category: "Rice",
      description: "Fragrant rice with vegetables",
    },
    {
      item_key: "butter_chicken",
      name: "Butter Chicken",
      price: 285,
      category: "Main",
      description: "Tender chicken in creamy tomato sauce",
    },
    {
      item_key: "dal_makhani",
      name: "Dal Makhani",
      price: 200,
      category: "Main",
      description: "Creamy black lentil curry",
    },
    {
      item_key: "naan",
      name: "Naan",
      price: 60,
      category: "Bread",
      description: "Traditional Indian flatbread",
    },
  ];

  try {
    const insert = db.prepare(
      `INSERT INTO menus (id, version, item_key, name, description, price, category, image) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const r of items) {
      insert.run(
        uuidv4(),
        "RestoVersion",
        r.item_key,
        r.name,
        r.description,
        r.price,
        r.category,
        ""
      );
    }

    // Save to disk after seeding
    if (dbInstance) {
      try {
        const data = dbInstance.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_FILE, buffer);
      } catch (err) {
        console.error("Could not save database to disk:", err);
      }
    }
  } catch (err) {
    console.error("Error seeding menu:", err);
  }
}
