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
    setUserId(null);
    setUsername(null);
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Alle verfügbaren CSRF-Tokens aus Cookies lesen
        const csrfRefresh = Cookies.get("csrf_refresh_token");
        const csrfAccess = Cookies.get("csrf_access_token");

        // Versuche zuerst den Refresh-Token
        const refreshRes = await fetch(`${BASE_API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            // Versuche beide möglichen CSRF-Token
            ...(csrfRefresh && { "X-CSRF-TOKEN": csrfRefresh }),
            ...(csrfAccess && !csrfRefresh && { "X-CSRF-TOKEN": csrfAccess }),
          },
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setIsLoggedIn(true);
          setUserId(data.user_id);
          setUsername(data.username);
          return;
        }

        // Fallback: Versuche /me Endpoint mit Access-Token
        const meRes = await fetch(`${BASE_API_URL}/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(csrfAccess && { "X-CSRF-TOKEN": csrfAccess }),
          },
        });

        if (meRes.ok) {
          const data = await meRes.json();
          // Wenn /me funktioniert, sind wir eingeloggt, aber brauchen user_id
          // Versuche über Cookies oder lokale Storage-Alternativen
          const storedUserId = sessionStorage.getItem("user_id");
          setIsLoggedIn(true);
          setUsername(data.username);
          setUserId(storedUserId || null);
          return;
        }

        // Beide Versuche fehlgeschlagen
        setIsLoggedIn(false);
        setUserId(null);
        setUsername(null);
      } catch (error) {
        console.error("Session check failed:", error);
        setIsLoggedIn(false);
        setUserId(null);
        setUsername(null);
      }
    };

    checkSession();
  }, []);

  // Erweiterte Login-Funktion mit sessionStorage Backup
  const enhancedLogin = async (username, password) => {
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

    // Speichere user_id in sessionStorage als Backup
    sessionStorage.setItem("user_id", data.user_id);
    sessionStorage.setItem("username", data.username);

    setIsLoggedIn(true);
    setUserId(data.user_id);
    setUsername(data.username);
  };

  // Erweiterte Logout-Funktion
  const enhancedLogout = async () => {
    await fetch(`${BASE_API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    // Entferne sessionStorage Backup
    sessionStorage.removeItem("user_id");
    sessionStorage.removeItem("username");

    setIsLoggedIn(false);
    setUserId(null);
    setUsername(null);
  };

  // Während des Checks nichts rendern oder Spinner zeigen
  if (isLoggedIn === null) {
    return <div>Loading…</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        login: enhancedLogin,
        logout: enhancedLogout,
        userId,
        username,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
