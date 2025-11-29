import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMenu, createOrder } from "../lib/api";
import { useCart } from "../hooks/useCart";
import { MenuItem } from "@shared/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Trash2, Plus, Minus } from "lucide-react";

export default function Index() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuVersion, setMenuVersion] = useState("RestoVersion");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderData, setOrderData] = useState({
    guest_name: "",
    room_no: "",
    notes: "",
  });

  const {
    items: cartItems,
    addItem,
    updateQty,
    removeItem,
    clear,
    total,
  } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    loadMenu();
  }, [menuVersion]);

  const loadMenu = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getMenu(menuVersion);
      setMenuItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(
    new Set(menuItems.map((item) => item.category)),
  ).sort();

  const handleAddToCart = (item: MenuItem) => {
    addItem({
      item_key: item.item_key,
      name: item.name,
      price: item.price,
      qty: 1,
    });
  };

  const handleSaveOrder = async () => {
    if (!orderData.guest_name.trim() || !orderData.room_no.trim()) {
      setError("Guest name and room number are required");
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder({
        guest_name: orderData.guest_name,
        room_no: orderData.room_no,
        notes: orderData.notes,
        items: cartItems.map((item) => ({
          item_key: item.item_key,
          name: item.name,
          qty: item.qty,
          price: item.price,
        })),
        menu_version: menuVersion,
      });

      clear();
      setShowOrderModal(false);
      setOrderData({ guest_name: "", room_no: "", notes: "" });
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen">
      {/* Menu Section */}
      <div className="flex-1 overflow-auto p-4 lg:p-6 border-r">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Menu</h1>
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium">Version:</label>
            <select
              value={menuVersion}
              onChange={(e) => setMenuVersion(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option>RestoVersion</option>
              <option>SnacksVersion</option>
              <option>DrinksVersion</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive p-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Loading menu...</div>
        ) : (
          <Tabs defaultValue={categories[0] || "All"} className="w-full">
            <TabsList className="grid grid-cols-3 lg:grid-cols-2 w-full">
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="text-xs sm:text-sm"
                >
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent
                key={category}
                value={category}
                className="space-y-3 mt-4"
              >
                {menuItems
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 flex justify-between items-center hover:bg-secondary transition"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        <p className="text-lg font-bold mt-2">₹{item.price}</p>
                      </div>
                      <Button
                        onClick={() => handleAddToCart(item)}
                        size="sm"
                        className="ml-4"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-80 border-t lg:border-t-0 bg-secondary p-4 lg:p-6 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Order Cart</h2>

        {cartItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Cart is empty</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto space-y-3 mb-4">
              {cartItems.map((item) => (
                <div
                  key={item.item_key}
                  className="bg-background rounded-lg p-3 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        ₹{item.price} each
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.item_key)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQty(item.item_key, item.qty - 1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="flex-1 text-center font-semibold">
                      {item.qty}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQty(item.item_key, item.qty + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <p className="text-right font-semibold">
                    ₹{(item.qty * item.price).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₹{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span className="font-semibold">₹0</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={() => setShowOrderModal(true)}
                className="w-full"
              >
                Save Order (Enter Guest Details)
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Order Modal */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Enter guest information to save the order
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Guest Name *
              </label>
              <Input
                placeholder="Guest name"
                value={orderData.guest_name}
                onChange={(e) =>
                  setOrderData({ ...orderData, guest_name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Room Number *
              </label>
              <Input
                placeholder="Room number"
                value={orderData.room_no}
                onChange={(e) =>
                  setOrderData({ ...orderData, room_no: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Special Requests (Optional)
              </label>
              <textarea
                className="w-full border rounded-md p-2 text-sm"
                placeholder="Any special requests?"
                rows={3}
                value={orderData.notes}
                onChange={(e) =>
                  setOrderData({ ...orderData, notes: e.target.value })
                }
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive p-3 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowOrderModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveOrder}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? "Saving..." : "Save Order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
