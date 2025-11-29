import { useState, useEffect } from "react";
import { listOrders, exportOrders } from "../lib/api";
import { Order } from "@shared/api";
import { Button } from "../components/ui/button";
import { Download, Calendar } from "lucide-react";

export default function Audit() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [selectedDate]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await listOrders({ date: selectedDate });
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const blob = await exportOrders(selectedDate);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${selectedDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  // Calculate daily summary
  const summary = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
    completedOrders: orders.filter((o) => o.status === "Completed").length,
    paidOrders: orders.filter((o) => o.payment_status === "Paid").length,
    partialOrders: orders.filter((o) => o.payment_status === "Partial").length,
    unpaidOrders: orders.filter((o) => o.payment_status === "Not Paid").length,
  };

  const statusSummary = {
    New: orders.filter((o) => o.status === "New").length,
    Preparing: orders.filter((o) => o.status === "Preparing").length,
    Ready: orders.filter((o) => o.status === "Ready").length,
    Served: orders.filter((o) => o.status === "Served").length,
    Completed: orders.filter((o) => o.status === "Completed").length,
    Updated: orders.filter((o) => o.status === "Updated").length,
  };

  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-3xl font-bold mb-6">Audit & Reports</h1>

      {/* Date Selector */}
      <div className="mb-6 flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-2">
            <Calendar className="w-4 h-4 inline mr-2" />
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </div>
        <Button
          onClick={handleExportCSV}
          disabled={exporting || orders.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading data...</div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 bg-blue-50">
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-3xl font-bold text-blue-600">
                {summary.totalOrders}
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-green-50">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600">
                ₹{summary.totalRevenue}
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-purple-50">
              <p className="text-sm text-muted-foreground">Completed Orders</p>
              <p className="text-3xl font-bold text-purple-600">
                {summary.completedOrders}
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-emerald-50">
              <p className="text-sm text-muted-foreground">Paid Orders</p>
              <p className="text-3xl font-bold text-emerald-600">
                {summary.paidOrders}
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-yellow-50">
              <p className="text-sm text-muted-foreground">Partial Payment</p>
              <p className="text-3xl font-bold text-yellow-600">
                {summary.partialOrders}
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-red-50">
              <p className="text-sm text-muted-foreground">Unpaid Orders</p>
              <p className="text-3xl font-bold text-red-600">
                {summary.unpaidOrders}
              </p>
            </div>
          </div>

          {/* Status Summary */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Order Status Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {statusSummary.New}
                </div>
                <p className="text-xs text-muted-foreground">New</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {statusSummary.Preparing}
                </div>
                <p className="text-xs text-muted-foreground">Preparing</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {statusSummary.Ready}
                </div>
                <p className="text-xs text-muted-foreground">Ready</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {statusSummary.Served}
                </div>
                <p className="text-xs text-muted-foreground">Served</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {statusSummary.Completed}
                </div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {statusSummary.Updated}
                </div>
                <p className="text-xs text-muted-foreground">Updated</p>
              </div>
            </div>
          </div>

          {/* Detailed Orders Table */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">
              Orders for {selectedDate}
            </h2>
            {orders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No orders for this date
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-2 font-semibold">Order #</th>
                      <th className="pb-2 font-semibold">Guest</th>
                      <th className="pb-2 font-semibold">Room</th>
                      <th className="pb-2 font-semibold">Items</th>
                      <th className="pb-2 font-semibold">Total</th>
                      <th className="pb-2 font-semibold">Status</th>
                      <th className="pb-2 font-semibold">Payment</th>
                      <th className="pb-2 font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b hover:bg-secondary py-2"
                      >
                        <td className="py-2 font-mono text-xs">
                          {order.order_no}
                        </td>
                        <td className="py-2">{order.guest_name}</td>
                        <td className="py-2">{order.room_no}</td>
                        <td className="py-2">{order.items.length}</td>
                        <td className="py-2 font-semibold">₹{order.total}</td>
                        <td className="py-2">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              order.status === "Completed"
                                ? "bg-gray-100 text-gray-800"
                                : order.status === "New"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-2">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              order.payment_status === "Paid"
                                ? "bg-green-100 text-green-800"
                                : order.payment_status === "Partial"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {order.payment_status}
                          </span>
                        </td>
                        <td className="py-2 text-xs">
                          {new Date(order.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
