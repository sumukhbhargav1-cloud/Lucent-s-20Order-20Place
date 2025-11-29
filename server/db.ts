import initSqlJs from "sql.js";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_FILE || path.join(__dirname, "data.db");

let SQL: any = null;
let dbInstance: any = null;

// Initialize sql.js module (this is sync once module is loaded)
let initSqlPromise = initSqlJs();

export async function ensureDbInitialized() {
  if (SQL && dbInstance) {
    return { SQL, db: dbInstance };
  }

  try {
    if (!SQL) {
      SQL = await initSqlPromise;
    }

    // Load or create database
    if (fs.existsSync(DB_FILE)) {
      try {
        const data = fs.readFileSync(DB_FILE);
        dbInstance = new SQL.Database(new Uint8Array(data));
      } catch (err) {
        console.warn("Could not load existing database, creating new one");
        dbInstance = new SQL.Database();
      }
    } else {
      dbInstance = new SQL.Database();
    }

    return { SQL, db: dbInstance };
  } catch (err: any) {
    console.error("Failed to initialize database:", err.message);
    throw err;
  }
}

// Export db object that routes can use
export const db = {
  prepare(sql: string) {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }

    return {
      run(...params: any[]) {
        const stmt = dbInstance.prepare(sql);
        stmt.bind(params);
        stmt.step();
        stmt.free();
        return { changes: dbInstance.getRowsModified() };
      },
      get(...params: any[]) {
        const stmt = dbInstance.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params: any[]) {
        const stmt = dbInstance.prepare(sql);
        stmt.bind(params);
        const results: any[] = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      },
    };
  },

  exec(sql: string) {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    dbInstance.run(sql);
  },

  transaction(fn: (items: any[]) => void) {
    return (items: any[]) => {
      if (!dbInstance) {
        throw new Error("Database not initialized");
      }
      dbInstance.run("BEGIN TRANSACTION");
      try {
        fn(items);
        dbInstance.run("COMMIT");
        saveDatabase();
      } catch (err) {
        dbInstance.run("ROLLBACK");
        throw err;
      }
    };
  },
};

function saveDatabase() {
  if (!dbInstance) return;

  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error("Could not save database to disk:", err);
  }
}

export async function initializeDatabase() {
  const { db: database } = await ensureDbInitialized();

  try {
    database.run(`
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

    // Check if menu is empty
    const stmt = database.prepare("SELECT COUNT(*) as count FROM menus");
    stmt.bind([]);
    let menuCount = 0;
    if (stmt.step()) {
      const row = stmt.getAsObject();
      menuCount = (row as any).count;
    }
    stmt.free();

    if (menuCount === 0) {
      seedSampleMenu(database);
    }

    saveDatabase();
  } catch (err) {
    console.error("Error during database initialization:", err);
  }
}

function seedSampleMenu(database: any) {
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
    for (const item of items) {
      const stmt = database.prepare(
        `INSERT INTO menus (id, version, item_key, name, description, price, category, image) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      stmt.bind([
        uuidv4(),
        "RestoVersion",
        item.item_key,
        item.name,
        item.description,
        item.price,
        item.category,
        "",
      ]);
      stmt.step();
      stmt.free();
    }

    saveDatabase();
  } catch (err) {
    console.error("Error seeding menu:", err);
  }
}
