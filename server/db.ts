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
    // SOUPS
    { item_key: "baby_corn_soup", name: "Baby Corn Soup", price: 100, category: "Soups", description: "Hot & healthy" },
    { item_key: "hot_sour_soup", name: "Hot & Sour Soup", price: 120, category: "Soups", description: "Tangy & spicy" },
    { item_key: "tomato_soup", name: "Tomato Soup", price: 100, category: "Soups", description: "Fresh & warm" },
    { item_key: "veg_cheese_soup", name: "Veg Cheese Soup", price: 120, category: "Soups", description: "Creamy delight" },
    { item_key: "burnt_garlic_soup", name: "Burnt Garlic Soup", price: 100, category: "Soups", description: "Bold flavor" },
    { item_key: "broccoli_soup", name: "Broccoli Soup", price: 120, category: "Soups", description: "Healthy greens" },

    // SALADS
    { item_key: "kachumber_salad", name: "Kachumber Salad", price: 40, category: "Salads", description: "Fresh vegetables" },
    { item_key: "green_salad", name: "Green Salad", price: 40, category: "Salads", description: "Crispy greens" },
    { item_key: "italian_pasta_salad", name: "Italian Pasta Salad", price: 80, category: "Salads", description: "Mediterranean style" },
    { item_key: "veg_russian_salad", name: "Veg Russian Salad", price: 50, category: "Salads", description: "Mixed vegetables" },
    { item_key: "nut_salad", name: "Nut Salad", price: 50, category: "Salads", description: "Protein rich" },
    { item_key: "coleslaw_salad", name: "ColeSlaw Salad", price: 50, category: "Salads", description: "Crunchy delight" },

    // STARTERS (Fried)
    { item_key: "gobi_manchurian", name: "Gobi Manchurian", price: 140, category: "Starters", description: "Crispy cauliflower" },
    { item_key: "paneer_pepper_dry", name: "Paneer - Pepper Dry", price: 150, category: "Starters", description: "Paneer with peppers" },
    { item_key: "aloo_pepper_dry", name: "Aloo - Pepper Dry", price: 150, category: "Starters", description: "Potato with peppers" },
    { item_key: "gobi_pepper_dry", name: "Gobi - Pepper Dry", price: 150, category: "Starters", description: "Cauliflower with peppers" },
    { item_key: "paneer_chilly", name: "Paneer - Chilly", price: 140, category: "Starters", description: "Spicy paneer" },
    { item_key: "aloo_chilly", name: "Aloo - Chilly", price: 140, category: "Starters", description: "Spicy potatoes" },
    { item_key: "gobi_chilly", name: "Gobi - Chilly", price: 140, category: "Starters", description: "Spicy cauliflower" },
    { item_key: "golden_fried_baby_corn", name: "Golden Fried Baby Corn", price: 180, category: "Starters", description: "Golden & crispy" },
    { item_key: "mushroom_dry", name: "Mushroom Dry", price: 180, category: "Starters", description: "Sautéed mushroom" },
    { item_key: "mushroom_chilly", name: "Mushroom Chilly", price: 180, category: "Starters", description: "Spicy mushroom" },
    { item_key: "veg_chilly", name: "Veg Chilly", price: 120, category: "Starters", description: "Mixed veg spicy" },
    { item_key: "veg_dry", name: "Veg Dry", price: 120, category: "Starters", description: "Mixed veg sautéed" },
    { item_key: "baby_corn_schezwaan", name: "Baby Corn Schezwaan", price: 140, category: "Starters", description: "Baby corn with schezwaan sauce" },
    { item_key: "paneer_schezwaan", name: "Paneer Schezwaan", price: 140, category: "Starters", description: "Paneer with schezwaan sauce" },

    // BREADS
    { item_key: "aloo_parata", name: "Aloo Stuffed Parata (Per Plate)", price: 120, category: "Breads", description: "Potato filled flatbread" },
    { item_key: "mirch_parata", name: "Mirch Parata (Per Plate)", price: 120, category: "Breads", description: "Chili filled flatbread" },
    { item_key: "pudina_parata", name: "Pudina Parata (Per Plate)", price: 120, category: "Breads", description: "Mint filled flatbread" },
    { item_key: "methi_parata", name: "Methi Parata (Per Plate)", price: 120, category: "Breads", description: "Fenugreek filled flatbread" },
    { item_key: "paneer_parata", name: "Paneer Stuffed Parata (Per Plate)", price: 150, category: "Breads", description: "Paneer filled flatbread" },
    { item_key: "roti", name: "Roti (Per Piece)", price: 30, category: "Breads", description: "Indian wheat bread" },
    { item_key: "chapathi", name: "Chapathi (Per Piece)", price: 30, category: "Breads", description: "Soft wheat bread" },
    { item_key: "normal_parata", name: "Normal Parata (Per Piece)", price: 40, category: "Breads", description: "Plain flatbread" },
    { item_key: "maida_chapathi", name: "White Maida Chapathi (Per Piece)", price: 40, category: "Breads", description: "Soft white bread" },

    // GRAVY/CURRY
    { item_key: "paneer_tikka_masala", name: "Paneer Tikka Masala", price: 255, category: "Gravy/Curry", description: "Cottage cheese in rich tomato gravy" },
    { item_key: "dal_makhani", name: "Dal Makhani", price: 155, category: "Gravy/Curry", description: "Creamy black lentil curry" },
    { item_key: "shahi_paneer", name: "Shahi Paneer", price: 215, category: "Gravy/Curry", description: "Paneer in royal gravy" },
    { item_key: "dal_tadka", name: "Dal Tadka", price: 145, category: "Gravy/Curry", description: "Tempered lentil curry" },
    { item_key: "palak_paneer", name: "Palak Paneer", price: 215, category: "Gravy/Curry", description: "Paneer with spinach" },
    { item_key: "mixed_veg", name: "Mixed Veg", price: 145, category: "Gravy/Curry", description: "Mixed vegetable curry" },
    { item_key: "paneer_kadai", name: "Paneer Kadai", price: 215, category: "Gravy/Curry", description: "Paneer with onions & peppers" },
    { item_key: "matar_mushroom", name: "Matar Mushroom", price: 215, category: "Gravy/Curry", description: "Peas & mushroom curry" },
    { item_key: "veg_kolhapuri", name: "Veg Kolhapuri", price: 155, category: "Gravy/Curry", description: "Spicy vegetable curry" },

    // CHINESE
    { item_key: "schezwaan_fried_rice", name: "Schezwaan Fried Rice", price: 199, category: "Chinese", description: "Spicy fried rice" },
    { item_key: "schezwaan_noodles", name: "Schezwaan Noodles", price: 199, category: "Chinese", description: "Spicy noodles" },
    { item_key: "masala_noodles", name: "Masala Noodles", price: 180, category: "Chinese", description: "Spiced noodles" },
    { item_key: "masala_pasta", name: "Masala Pasta", price: 180, category: "Chinese", description: "Spiced pasta" },
    { item_key: "white_sauce_pasta", name: "White Sauce Pasta", price: 215, category: "Chinese", description: "Creamy pasta" },
    { item_key: "white_sauce_noodles", name: "White Sauce Noodles", price: 215, category: "Chinese", description: "Creamy noodles" },
    { item_key: "fried_rice", name: "Fried Rice", price: 180, category: "Chinese", description: "Basic fried rice" },
    { item_key: "garlic_fried_rice", name: "Garlic Fried Rice", price: 180, category: "Chinese", description: "Aromatic rice with garlic" },
    { item_key: "shanghai_fried_rice", name: "Shanghai Fried Rice", price: 199, category: "Chinese", description: "Shanghai style rice" },
    { item_key: "chinese_chopsuey", name: "Chinese Chopsuey", price: 215, category: "Chinese", description: "Mixed vegetables stir fry" },

    // RICE SPECIAL
    { item_key: "hyderabadi_biryani", name: "Hyderabadi Biryani", price: 215, category: "Rice Special", description: "Fragrant rice dish" },
    { item_key: "veg_biryani", name: "Veg Biryani", price: 215, category: "Rice Special", description: "Vegetable biryani" },
    { item_key: "dal_kichidi", name: "Dal Kichidi", price: 180, category: "Rice Special", description: "Lentil & rice" },
    { item_key: "ghee_rice", name: "Ghee Rice", price: 180, category: "Rice Special", description: "Fragrant ghee rice" },
    { item_key: "jeera_rice", name: "Jeera Rice", price: 180, category: "Rice Special", description: "Cumin flavored rice" },
    { item_key: "mushroom_biryani", name: "Mushroom Biryani", price: 215, category: "Rice Special", description: "Mushroom biryani" },
    { item_key: "lemon_rice", name: "Lemon Rice", price: 120, category: "Rice Special", description: "Tangy rice" },
    { item_key: "puliogere", name: "Puliogere", price: 120, category: "Rice Special", description: "South Indian tamarind rice" },
    { item_key: "soya_chunks_biryani", name: "Soya Chunks Biryani", price: 215, category: "Rice Special", description: "Protein rich biryani" },
    { item_key: "paneer_biryani", name: "Paneer Biryani", price: 215, category: "Rice Special", description: "Paneer biryani" },

    // MALNAD SPECIAL
    { item_key: "south_indian_meal", name: "South Indian Meal (Min 4)", price: 210, category: "Malnad Special", description: "Complete meal with multiple items" },
    { item_key: "rice_thalipattu", name: "Rice Thalipattu", price: 100, category: "Malnad Special", description: "Rice preparation" },
    { item_key: "rava_dosa", name: "Rava Dosa", price: 120, category: "Malnad Special", description: "Semolina crepe" },
    { item_key: "pathrode", name: "Pathrode", price: 120, category: "Malnad Special", description: "Steamed colocasia roll" },
    { item_key: "poha", name: "Poha", price: 80, category: "Malnad Special", description: "Flattened rice" },
    { item_key: "neer_dosa", name: "Neer Dosa", price: 120, category: "Malnad Special", description: "Thin crepe" },
    { item_key: "dosa", name: "Dosa (Varieties Available)", price: 80, category: "Malnad Special", description: "Crispy crepe" },
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
