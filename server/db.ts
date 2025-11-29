import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_FILE || path.join(__dirname, "data.db");

export const db = new Database(DB_FILE);

export function initializeDatabase() {
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
    seedSampleMenu();
  }
}

function seedSampleMenu() {
  const { v4: uuidv4 } = await import("uuid");

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

  const insert = db.prepare(
    `INSERT INTO menus (id, version, item_key, name, description, price, category, image) 
     VALUES (@id, @version, @item_key, @name, @description, @price, @category, @image)`
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
}
