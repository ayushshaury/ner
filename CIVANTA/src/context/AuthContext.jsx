import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("civanta_token");
    const stored = localStorage.getItem("civanta_user");
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = async ({ email, password }) => {
    try {
      const res = await authService.login({ email, password });
      const { access_token, user: userObj } = res.data;
      setUser(userObj);
      localStorage.setItem("civanta_token", access_token);
      localStorage.setItem("civanta_user", JSON.stringify(userObj));
      return userObj;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Invalid credentials";
      throw new Error(msg);
    }
  };

  const register = async (data) => {
    try {
      const res = await authService.register({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role || "user",
        language: data.language || "en",
      });
      const { access_token, user: userObj } = res.data;
      setUser(userObj);
      localStorage.setItem("civanta_token", access_token);
      localStorage.setItem("civanta_user", JSON.stringify(userObj));
      return userObj;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Registration failed";
      throw new Error(msg);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("civanta_token");
    localStorage.removeItem("civanta_user");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
