// src/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // authState hält username & token
  const [authState, setAuthState] = useState({
    username: null,
    token: null,
  });

  // isLoggedIn leitet sich vom Vorhandensein eines Tokens ab
  const isLoggedIn = Boolean(authState.token);

  // Nach einem erfolgreichen Login rufen wir das auf
  const handleLoginSuccess = ({ username, token }) => {
    // Speichere im sessionStorage (Token) und localStorage (Username)
    sessionStorage.setItem("idToken", token);
    localStorage.setItem("username", username);
    // Update des Context‑State
    setAuthState({ username, token });
    console.log("Login successful:", username);
  };

  // Logout: State und Storage löschen
  const handleLogout = () => {
    setAuthState({ username: null, token: null });
    sessionStorage.removeItem("idToken");
    localStorage.removeItem("username");
    console.log("Logged out");
  };

  // Beim Initialisieren prüfen wir, ob wir schon ein Token haben
  useEffect(() => {
    const token = sessionStorage.getItem("idToken");
    const username = localStorage.getItem("username");
    if (token && username) {
      setAuthState({ username, token });
      console.log("Loaded stored login:", username);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        isLoggedIn,
        handleLoginSuccess,
        handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook zum einfachen Zugriff
export const useAuth = () => useContext(AuthContext);
