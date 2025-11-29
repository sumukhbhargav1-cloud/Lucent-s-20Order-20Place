import { Order, MenuItem } from "@shared/api";

function getPassphrase(): string | null {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("passphrase");
  }
  return null;
}

function getHeaders() {
  const passphrase = getPassphrase();
  return {
    "Content-Type": "application/json",
    ...(passphrase && { "x-passphrase": passphrase }),
  };
}

export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}

// Menu API
export async function getMenu(
  version: string = "RestoVersion",
): Promise<MenuItem[]> {
  return apiCall(`/api/menu/${version}`);
}

// Orders API
export async function createOrder(data: {
  guest_name: string;
  room_no: string;
  notes?: string;
  items: Array<{ item_key: string; name: string; qty: number; price: number }>;
  menu_version: string;
}): Promise<Order> {
  return apiCall("/api/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getOrder(id: string): Promise<Order> {
  return apiCall(`/api/orders/${id}`);
}

export async function listOrders(params?: {
  date?: string;
  status?: string;
  room_no?: string;
  search?: string;
}): Promise<Order[]> {
  const query = new URLSearchParams();
  if (params?.date) query.append("date", params.date);
  if (params?.status) query.append("status", params.status);
  if (params?.room_no) query.append("room_no", params.room_no);
  if (params?.search) query.append("search", params.search);

  return apiCall(`/api/orders?${query.toString()}`);
}

export async function addItemsToOrder(
  id: string,
  items: Array<{ item_key: string; name: string; qty: number; price: number }>,
): Promise<Order> {
  return apiCall(`/api/orders/${id}/items`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function updateOrder(
  id: string,
  data: {
    status?: string;
    payment_status?: string;
    requested_time?: string;
    notes?: string;
  },
): Promise<Order> {
  return apiCall(`/api/orders/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function sendWhatsAppToKitchen(
  id: string,
): Promise<{ ok: boolean }> {
  return apiCall(`/api/orders/${id}/send-whatsapp`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getPrintBillUrl(id: string): string {
  const passphrase = getPassphrase();
  return `/api/orders/${id}/print${passphrase ? `?pass=${passphrase}` : ""}`;
}

export async function exportOrders(date: string): Promise<Blob> {
  const passphrase = getPassphrase();
  const response = await fetch(
    `/api/export/csv?date=${date}${passphrase ? `&pass=${passphrase}` : ""}`,
    {
      headers: getHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to export orders");
  }

  return response.blob();
}
