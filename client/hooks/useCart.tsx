import { createContext, useContext, useState, ReactNode } from "react";

export interface CartItem {
  item_key: string;
  name: string;
  price: number;
  qty: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQty: (item_key: string, qty: number) => void;
  removeItem: (item_key: string) => void;
  clear: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.item_key === item.item_key);
      if (existing) {
        return prev.map((i) =>
          i.item_key === item.item_key ? { ...i, qty: i.qty + item.qty } : i
        );
      }
      return [...prev, item];
    });
  };

  const updateQty = (item_key: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.item_key !== item_key)
        : prev.map((i) => (i.item_key === item_key ? { ...i, qty } : i))
    );
  };

  const removeItem = (item_key: string) => {
    setItems((prev) => prev.filter((i) => i.item_key !== item_key));
  };

  const clear = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + item.qty * item.price, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQty, removeItem, clear, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
