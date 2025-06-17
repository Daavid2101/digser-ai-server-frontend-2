// AuthContext.jsx
import Cookies from "js-cookie";
import React, { createContext, useContext, useState, useEffect } from "react";

const BASE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // null = loading, true = eingeloggt, false = ausgeloggt
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState(null);

  const login = async (username, password) => {
    const res = await fetch(`${BASE_API_URL}/auth/login_user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, plain_password: password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Login fehlgeschlagen");
    }
    const data = await res.json();
    setIsLoggedIn(true);
    setUserId(data.user_id);
    setUsername(data.username);
  };

  const logout = async () => {
    await fetch(`${BASE_API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setIsLoggedIn(false);
  };

  useEffect(() => {
    const checkSession = async () => {
      // CSRF-Token frisch auslesen
      const csrf = Cookies.get("csrf_refresh_token");
      try {
        const res = await fetch(`${BASE_API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": csrf || "",
          },
        });
        if (res.ok) {
          const data = await res.json();
          setIsLoggedIn(true);
          setUserId(data.user_id);
          setUsername(data.username);
        } else {
          setIsLoggedIn(false);
          setUserId(null);
          setUsername(null);
        }
      } catch {
        setIsLoggedIn(false);
      }
    };
    checkSession();
  }, []);

  // Während des Checks nichts rendern oder Spinner zeigen
  if (isLoggedIn === null) {
    return <div>Loading…</div>;
  }

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, login, logout, userId, username }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
