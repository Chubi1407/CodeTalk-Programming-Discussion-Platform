import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState("beginner");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:3000/register", {
        name,
        username,
        password,
        level,
      });

      alert("✅ Registered! Now log in.");
      navigate("/login");
    } catch (error) {
      alert("❌ Registration failed: " + (error.response?.data?.error || "Unknown error"));
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>📝 Register for CodeTalk</h2>
        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" style={styles.button}>Register</button>
        </form>
        <p>
          Already have an account? <a href="/login" style={styles.link}>Login here</a>
        </p>
        <select
  value={level}
  onChange={(e) => setLevel(e.target.value)}
  required
  style={{ padding: "8px", marginTop: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
>
  <option value="beginner">Beginner</option>
  <option value="intermediate">Intermediate</option>
  <option value="expert">Expert</option>
</select>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f3f0fb",
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    background: "#fff",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(108, 92, 231, 0.2)",
    textAlign: "center",
    width: "350px",
  },
  title: {
    color: "#6c5ce7",
    marginBottom: "20px",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "15px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "1rem",
  },
  button: {
    background: "#6c5ce7",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 20px",
    fontSize: "1rem",
    cursor: "pointer",
    width: "100%",
    marginBottom: "15px",
  },
  link: {
    color: "#6c5ce7",
    fontWeight: "bold",
    textDecoration: "none",
  },
};
