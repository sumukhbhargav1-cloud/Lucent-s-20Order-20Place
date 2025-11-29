import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

export default function Login() {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await login(passphrase);
      if (success) {
        navigate("/");
      } else {
        setError("Invalid passphrase. Please try again.");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Lucent's Resto</CardTitle>
          <CardDescription className="text-center">
            Staff Order Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="passphrase"
                className="block text-sm font-medium mb-2"
              >
                Staff Passphrase
              </label>
              <Input
                id="passphrase"
                type="password"
                placeholder="Enter passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive text-sm p-3 rounded">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !passphrase.trim()}
              className="w-full"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Default passphrase:{" "}
              <code className="bg-muted px-2 py-1 rounded">letmein</code>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
