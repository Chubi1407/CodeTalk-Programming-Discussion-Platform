import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminDashboard({ token }) {
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };

    try {
      const [userRes, channelRes, postRes] = await Promise.all([
        axios.get("http://localhost:3000/admin/users", config),
        axios.get("http://localhost:3000/admin/channels", config),
        axios.get("http://localhost:3000/admin/posts", config),
      ]);
      setUsers(userRes.data);
      setChannels(channelRes.data);
      setPosts(postRes.data);
    } catch (err) {
      console.error("❌ Admin fetch error:", err);
      alert("Failed to load admin data.");
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Delete this ${type}?`)) return;

    try {
      await axios.delete(`http://localhost:3000/admin/${type}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAll();
    } catch (err) {
      console.error("❌ Delete error:", err);
      alert("Failed to delete item.");
    }
  };

  if (!token) return <p>Please login as admin to view this page.</p>;

  return (
    <div className="admin-dashboard">
      <h2>🔧 Admin Dashboard</h2>

      <section>
        <h3>👥 Users</h3>
        <ul>
          {users.map(user => (
            <li key={user._id}>
              {user.name} ({user.username})
              <button onClick={() => handleDelete("user", user._id)}>❌ Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>📺 Channels</h3>
        <ul>
          {channels.map(ch => (
            <li key={ch._id}>
              {ch.name} - {ch.description}
              <button onClick={() => handleDelete("channel", ch._id)}>❌ Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>📝 Posts</h3>
        <ul>
          {posts.map(post => (
            <li key={post._id}>
              <strong>{post.topic}</strong>: {post.data?.slice(0, 40)}...
              <button onClick={() => handleDelete("post", post._id)}>❌ Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
