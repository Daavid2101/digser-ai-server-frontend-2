// ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  // isLoggedIn kann jetzt true oder false sein, null ist bereits abgefangen
  return isLoggedIn ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;
