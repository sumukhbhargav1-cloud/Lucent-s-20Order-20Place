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
// This runs once when the app module loads
if (typeof window !== "undefined" && sessionStorage.redirect) {
  const redirect = sessionStorage.redirect;
  delete sessionStorage.redirect;
  // Store for use after router mounts
  (window as any).__redirectPath = redirect;
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

// Redirect wrapper component for GitHub Pages SPA routing
function RedirectHandler() {
  useEffect(() => {
    const redirectPath = (window as any).__redirectPath;
    if (redirectPath) {
      delete (window as any).__redirectPath;
      window.history.replaceState(null, "", redirectPath);
    }
  }, []);
  return null;
}

// App Router
function AppRouter() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <RedirectHandler />
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
    </>
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
