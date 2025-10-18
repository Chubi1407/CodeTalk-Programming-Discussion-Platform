import React from "react";

export default function LandingPage() {
  return (
    <div style={{
      minHeight: "100vh",
      padding: "60px 20px",
      background: "#f3f0fb",
      fontFamily: "'Segoe UI', sans-serif",
      color: "#333",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
    }}>
      <h1 style={{
        fontSize: "3rem",
        marginBottom: "20px",
        color: "#6c5ce7"
      }}>
        👋 Welcome to <strong>CodeTalk</strong>
      </h1>

      <p style={{
        fontSize: "1.25rem",
        maxWidth: "700px",
        marginBottom: "40px",
      }}>
        A place to ask programming questions, get answers, and collaborate in channels.
      </p>

      <ul style={{
        listStyle: "none",
        padding: 0,
        marginBottom: "40px",
        fontSize: "1.1rem",
        lineHeight: "2",
      }}>
        <li>🧠 <strong>Create and join channels</strong></li>
        <li>💬 <strong>Post questions and replies</strong></li>
        <li>📎 <strong>Upload screenshots to explain your code issues</strong></li>
      </ul>

      <p style={{ fontSize: "1.1rem" }}>
        <a href="/login" style={linkStyle}>Login</a> or <a href="/register" style={linkStyle}>Register</a> to get started.
      </p>
    </div>
  );
}

const linkStyle = {
  color: "#6c5ce7",
  fontWeight: "bold",
  textDecoration: "none",
};
