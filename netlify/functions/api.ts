type Event = {
  httpMethod: string;
  path: string;
  body: string | null;
  headers: Record<string, string>;
  rawUrl?: string;
};

type Response = {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
};

export const api = async (event: Event): Promise<Response> => {
  const method = event.httpMethod;
  const path = event.path || event.rawUrl || "";

  // Set CORS and JSON headers
  const jsonHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-passphrase",
  };

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      body: "ok",
      headers: jsonHeaders,
    };
  }

  try {
    // Login endpoint - no auth required
    if (
      path.includes("/api/login") ||
      path.includes("/.netlify/functions/api/login")
    ) {
      if (method !== "POST") {
        return {
          statusCode: 405,
          body: JSON.stringify({ error: "Method not allowed" }),
          headers: jsonHeaders,
        };
      }

      let bodyData;
      try {
        bodyData = event.body ? JSON.parse(event.body) : {};
      } catch (e) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid JSON" }),
          headers: jsonHeaders,
        };
      }

      const { passphrase } = bodyData;
      const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE || "letmein";

      console.log("Login attempt with passphrase:", passphrase);
      console.log("Expected passphrase:", ADMIN_PASSPHRASE);

      if (passphrase === ADMIN_PASSPHRASE) {
        return {
          statusCode: 200,
          body: JSON.stringify({ ok: true }),
          headers: jsonHeaders,
        };
      }

      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false }),
        headers: jsonHeaders,
      };
    }

    // Health check
    if (path.includes("/api/health")) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
        headers: jsonHeaders,
      };
    }

    // Default: not found
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "Not found" }),
      headers: jsonHeaders,
    };
  } catch (error) {
    console.error("API Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        details: String(error),
      }),
      headers: jsonHeaders,
    };
  }
};
