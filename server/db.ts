import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_FILE || path.join(__dirname, "data.db");

let dbInstance: any = null;

async function initializeDatabaseImpl() {
  try {
    // Use dynamic import to load better-sqlite3
    const DatabaseModule = await import("better-sqlite3");
    const Database = DatabaseModule.default;
    dbInstance = new Database(DB_FILE);
    return dbInstance;
  } catch (err: any) {
    console.error(
      "Warning: Could not initialize SQLite database:",
      err.message,
    );
    return null;
  }
}

// Initialize on module load
let initPromise: Promise<any> | null = null;

export async function ensureDbInitialized() {
  if (!initPromise) {
    initPromise = initializeDatabaseImpl();
  }
  return initPromise;
}

// Sync getter for routes
export function getDb() {
  if (!dbInstance) {
    throw new Error(
      "Database not initialized yet. Call ensureDbInitialized() first.",
    );
  }
  return dbInstance;
}

export { getDb as db };

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
    const menuCount = db
      .prepare("SELECT COUNT(*) as count FROM menus")
      .get() as any;
    if (menuCount.count === 0) {
      seedSampleMenu(db);
    }
  } catch (err) {
    console.error("Error during database initialization:", err);
  }
}

function seedSampleMenu(db: any) {
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
       VALUES (@id, @version, @item_key, @name, @description, @price, @category, @image)`,
    );

    const insertMany = db.transaction((rows: any[]) => {
      for (const r of rows) {
        insert.run({
          id: uuidv4(),
          version: "RestoVersion",
          item_key: r.item_key,
          name: r.name,
          description: r.description,
          price: r.price,
          category: r.category,
          image: "",
        });
      }
    });

    insertMany(items);
  } catch (err) {
    console.error("Error seeding menu:", err);
  }
}
