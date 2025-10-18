import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/loginpage";
import RegisterPage from "./pages/registerpage";
import LandingPage from "./pages/landingpage";
import HomePage from "./HomePage"; // This file has your post logic
import AdminDashboard from './AdminDashboard';

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage setUser={setUser} setToken={setToken} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<AdminDashboard token={token} />} />
        {/* Protected Route for Main App */}
        <Route
          path="/channels"
          element={
            user && token ? (
              <HomePage user={user} token={token} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Catch-all: Redirect to correct default */}
        <Route
          path="*"
          element={<Navigate to={user && token ? "/channels" : "/login"} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
