import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { CartProvider } from "./hooks/useCart";
import Layout from "./components/Layout";

// Pages
import Login from "./pages/Login";
import Index from "./pages/Index";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Audit from "./pages/Audit";
import NotFound from "./pages/NotFound";

// Handle GitHub Pages 404 redirect for SPA routing
if (typeof window !== "undefined" && (window as any).__redirectPath) {
  const redirectPath = (window as any).__redirectPath;
  delete (window as any).__redirectPath;
  window.history.replaceState(null, "", redirectPath);
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

// App Router
function AppRouter() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {!isAuthenticated ? <Route path="/login" element={<Login />} /> : null}

      {isAuthenticated && (
        <>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <ProtectedRoute>
                <Audit />
              </ProtectedRoute>
            }
          />
        </>
      )}

      {!isAuthenticated && (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
      {isAuthenticated && <Route path="*" element={<NotFound />} />}
    </Routes>
  );
}

// Main App Component
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppRouter />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
