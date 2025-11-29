import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface AuthContextType {
  passphrase: string | null;
  isAuthenticated: boolean;
  login: (passphrase: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [passphrase, setPassphrase] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("passphrase");
    }
    return null;
  });

  const login = useCallback(async (pass: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase: pass }),
      });

      if (response.ok) {
        sessionStorage.setItem("passphrase", pass);
        setPassphrase(pass);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("passphrase");
    setPassphrase(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        passphrase,
        isAuthenticated: passphrase !== null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
