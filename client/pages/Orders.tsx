import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listOrders } from "../lib/api";
import { Order } from "@shared/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Eye, RefreshCw } from "lucide-react";

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    date: "",
    status: "",
    room_no: "",
    search: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await listOrders(filters);
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    loadOrders();
  };

  const handleRefresh = () => {
    setFilters({ date: "", status: "", room_no: "", search: "" });
    loadOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New":
        return "bg-blue-100 text-blue-800";
      case "Preparing":
        return "bg-yellow-100 text-yellow-800";
      case "Ready":
        return "bg-green-100 text-green-800";
      case "Served":
        return "bg-purple-100 text-purple-800";
      case "Completed":
        return "bg-gray-100 text-gray-800";
      case "Updated":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-50 text-green-700";
      case "Partial":
        return "bg-yellow-50 text-yellow-700";
      default:
        return "bg-red-50 text-red-700";
    }
  };

  const groupedOrders = orders.reduce(
    (acc, order) => {
      const date = new Date(order.created_at).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(order);
      return acc;
    },
    {} as Record<string, Order[]>,
  );

  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-3xl font-bold mb-6">Orders</h1>

      {/* Filters */}
      <div className="bg-secondary p-4 rounded-lg mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange("date", e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All</option>
              <option value="New">New</option>
              <option value="Preparing">Preparing</option>
              <option value="Ready">Ready</option>
              <option value="Served">Served</option>
              <option value="Completed">Completed</option>
              <option value="Updated">Updated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Room No</label>
            <Input
              type="text"
              placeholder="Room number"
              value={filters.room_no}
              onChange={(e) => handleFilterChange("room_no", e.target.value)}
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <Input
              type="text"
              placeholder="Name, room, or order #"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="flex gap-2 items-end">
            <Button onClick={handleApplyFilters} className="flex-1">
              Apply Filters
            </Button>
            <Button variant="outline" onClick={handleRefresh} className="px-3">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No orders found
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedOrders)
            .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
            .map(([date, dateOrders]) => (
              <div key={date}>
                <h2 className="text-xl font-semibold mb-3 text-muted-foreground">
                  {date}
                </h2>
                <div className="space-y-3">
                  {dateOrders.map((order) => (
                    <div
                      key={order.id}
                      className="border rounded-lg p-4 hover:bg-secondary transition"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg">
                              {order.order_no}
                            </h3>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={getPaymentStatusColor(
                                order.payment_status,
                              )}
                            >
                              {order.payment_status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div>
                              <span className="text-muted-foreground">
                                Guest:{" "}
                              </span>
                              <span className="font-semibold">
                                {order.guest_name}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Room:{" "}
                              </span>
                              <span className="font-semibold">
                                {order.room_no}
                              </span>
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground mb-2">
                            {order.items.length} items
                          </div>

                          <div className="flex gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Subtotal:{" "}
                              </span>
                              <span className="font-semibold">
                                ₹{order.total}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Time:{" "}
                              </span>
                              <span>
                                {new Date(
                                  order.created_at,
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="whitespace-nowrap"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Order
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
