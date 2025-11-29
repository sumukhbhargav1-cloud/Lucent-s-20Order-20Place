import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getOrder,
  updateOrder,
  addItemsToOrder,
  getMenu,
  sendWhatsAppToKitchen,
  getPrintBillUrl,
} from "../lib/api";
import { Order, MenuItem } from "@shared/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Trash2, Plus, Minus, Send, Printer, ArrowLeft } from "lucide-react";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [itemsToAdd, setItemsToAdd] = useState<
    Array<{ item_key: string; name: string; qty: number; price: number }>
  >([]);
  const [updates, setUpdates] = useState({
    status: "",
    payment_status: "",
    requested_time: "",
    notes: "",
  });

  useEffect(() => {
    loadOrder();
    loadMenu();
  }, []);

  const loadOrder = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      const data = await getOrder(id);
      setOrder(data);
      setUpdates({
        status: data.status,
        payment_status: data.payment_status,
        requested_time: data.requested_time || "",
        notes: data.notes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  const loadMenu = async () => {
    try {
      const data = await getMenu("RestoVersion");
      setMenuItems(data);
    } catch (err) {
      console.error("Failed to load menu", err);
    }
  };

  const handleAddItemToAddList = (item: MenuItem) => {
    const existing = itemsToAdd.find((i) => i.item_key === item.item_key);
    if (existing) {
      setItemsToAdd(
        itemsToAdd.map((i) =>
          i.item_key === item.item_key ? { ...i, qty: i.qty + 1 } : i
        )
      );
    } else {
      setItemsToAdd([
        ...itemsToAdd,
        {
          item_key: item.item_key,
          name: item.name,
          qty: 1,
          price: item.price,
        },
      ]);
    }
  };

  const handleConfirmAddItems = async () => {
    if (!id || itemsToAdd.length === 0) return;

    setSubmitting(true);
    try {
      const updated = await addItemsToOrder(id, itemsToAdd);
      setOrder(updated);
      setItemsToAdd([]);
      setShowAddItemsModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add items");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!id) return;

    setSubmitting(true);
    try {
      const updated = await updateOrder(id, {
        status: updates.status !== order?.status ? updates.status : undefined,
        payment_status:
          updates.payment_status !== order?.payment_status
            ? updates.payment_status
            : undefined,
        requested_time:
          updates.requested_time !== order?.requested_time
            ? updates.requested_time
            : undefined,
        notes: updates.notes !== order?.notes ? updates.notes : undefined,
      });
      setOrder(updated);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!id) return;

    setSubmitting(true);
    try {
      await sendWhatsAppToKitchen(id);
      const updated = await getOrder(id);
      setOrder(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send WhatsApp");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (id) {
      const printUrl = getPrintBillUrl(id);
      window.open(printUrl, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="text-center py-8">Loading order...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 lg:p-6">
        <div className="text-center py-8 text-destructive">Order not found</div>
      </div>
    );
  }

  const total = order.items.reduce((sum, item) => sum + item.qty * item.price, 0);

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6">
      <Button
        variant="ghost"
        onClick={() => navigate("/orders")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Orders
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold">{order.order_no}</h1>
              <div className="flex gap-2">
                <Badge className="bg-blue-100 text-blue-800">
                  {order.status}
                </Badge>
                <Badge variant="outline">{order.payment_status}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="text-muted-foreground">Guest:</span>
                <p className="font-semibold">{order.guest_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Room:</span>
                <p className="font-semibold">{order.room_no}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <p>
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Menu Version:</span>
                <p className="font-semibold">{order.menu_version}</p>
              </div>
            </div>

            {order.notes && (
              <div className="bg-secondary p-3 rounded mt-4">
                <p className="text-sm text-muted-foreground">Special Requests:</p>
                <p className="font-semibold">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="border rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">Order Items</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center pb-3 border-b last:border-0"
                >
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{item.price} each
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">x{item.qty}</span>
                    <span className="font-bold">₹{item.qty * item.price}</span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => setShowAddItemsModal(true)}
              variant="outline"
              className="w-full mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add More Items
            </Button>
          </div>

          {/* History */}
          {order.history && order.history.length > 0 && (
            <div className="border rounded-lg p-4">
              <h2 className="text-xl font-bold mb-4">Order History</h2>
              <div className="space-y-2 text-sm">
                {order.history.map((entry, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-muted-foreground">
                      {new Date(entry.when).toLocaleString()}
                    </span>
                    <span>-</span>
                    <span>{entry.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Updates Panel */}
        <div className="lg:col-span-1 space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive p-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="border rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={updates.status}
                onChange={(e) =>
                  setUpdates({ ...updates, status: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="New">New</option>
                <option value="Preparing">Preparing</option>
                <option value="Ready">Ready</option>
                <option value="Served">Served</option>
                <option value="Completed">Completed</option>
                <option value="Updated">Updated</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Payment Status
              </label>
              <select
                value={updates.payment_status}
                onChange={(e) =>
                  setUpdates({ ...updates, payment_status: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="Not Paid">Not Paid</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Requested Time
              </label>
              <Input
                type="time"
                value={updates.requested_time}
                onChange={(e) =>
                  setUpdates({ ...updates, requested_time: e.target.value })
                }
                className="text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                className="w-full border rounded-md p-2 text-sm"
                rows={3}
                value={updates.notes}
                onChange={(e) =>
                  setUpdates({ ...updates, notes: e.target.value })
                }
              />
            </div>

            <Button
              onClick={handleUpdateOrder}
              disabled={submitting}
              className="w-full"
            >
              Save Changes
            </Button>
          </div>

          {/* Order Summary */}
          <div className="border rounded-lg p-4 space-y-3 bg-secondary">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold">₹{total}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span className="font-semibold">₹0</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-3">
              <span>Total:</span>
              <span>₹{total}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleSendWhatsApp}
              disabled={submitting}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              Send to Kitchen
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="w-full"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Bill
            </Button>
          </div>
        </div>
      </div>

      {/* Add Items Modal */}
      <Dialog open={showAddItemsModal} onOpenChange={setShowAddItemsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Items to Order</DialogTitle>
            <DialogDescription>
              Select items to add to the order
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Menu Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {menuItems.map((item) => {
                const itemInList = itemsToAdd.find(
                  (i) => i.item_key === item.item_key
                );
                return (
                  <div
                    key={item.id}
                    className="border rounded-lg p-3 hover:bg-secondary transition"
                  >
                    <h4 className="font-semibold text-sm mb-2">{item.name}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      ₹{item.price}
                    </p>

                    {itemInList ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setItemsToAdd(
                              itemsToAdd.map((i) =>
                                i.item_key === item.item_key
                                  ? { ...i, qty: i.qty - 1 }
                                  : i
                              )
                            );
                          }}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="flex-1 text-center font-semibold">
                          {itemInList.qty}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setItemsToAdd(
                              itemsToAdd.map((i) =>
                                i.item_key === item.item_key
                                  ? { ...i, qty: i.qty + 1 }
                                  : i
                              )
                            );
                          }}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setItemsToAdd(
                              itemsToAdd.filter(
                                (i) => i.item_key !== item.item_key
                              )
                            );
                          }}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleAddItemToAddList(item)}
                        size="sm"
                        className="w-full"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            {itemsToAdd.length > 0 && (
              <div className="border-t pt-4 space-y-3">
                <div className="bg-secondary p-3 rounded">
                  {itemsToAdd.map((item) => (
                    <div
                      key={item.item_key}
                      className="flex justify-between text-sm mb-2"
                    >
                      <span>
                        {item.qty}x {item.name}
                      </span>
                      <span>₹{item.qty * item.price}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                    <span>Total to Add:</span>
                    <span>
                      ₹
                      {itemsToAdd.reduce((sum, item) => sum + item.qty * item.price, 0)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setItemsToAdd([]);
                      setShowAddItemsModal(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmAddItems}
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? "Adding..." : "Add Items to Order"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
