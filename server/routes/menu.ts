import { RequestHandler } from "express";
import { db } from "../db";
import { MenuItem, MenuItemInput } from "@shared/api";
import { v4 as uuidv4 } from "uuid";

export const getMenu: RequestHandler<{ version: string }> = (req, res) => {
  const version = req.params.version || "RestoVersion";
  const rows = db
    .prepare("SELECT * FROM menus WHERE version = ? ORDER BY category, name")
    .all(version) as MenuItem[];
  res.json(rows);
};

export const uploadMenu: RequestHandler<
  { version: string },
  any,
  { items: MenuItemInput[] }
> = (req, res) => {
  const version = req.params.version;
  const items = req.body.items || [];

  try {
    db.prepare("DELETE FROM menus WHERE version = ?").run(version);

    const insert = db.prepare(
      `INSERT INTO menus (id, version, item_key, name, description, price, category, image) 
       VALUES (@id, @version, @item_key, @name, @description, @price, @category, @image)`,
    );

    const insertMany = db.transaction((rows: MenuItemInput[]) => {
      for (const r of rows) {
        insert.run({
          id: uuidv4(),
          version,
          item_key: r.item_key,
          name: r.name,
          description: r.description || "",
          price: r.price,
          category: r.category || "Misc",
          image: r.image || "",
        });
      }
    });

    insertMany(items);
    res.json({ ok: true, count: items.length });
  } catch (err: any) {
    res
      .status(500)
      .json({ error: "Failed to upload menu", details: err.message });
  }
};
