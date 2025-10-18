import React, { useState, useEffect } from "react";
import axios from "axios";
import './App.css';
import { Link } from 'react-router-dom';

export default function HomePage({ user, token }) {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [topic, setTopic] = useState("");
  const [data, setData] = useState("");
  const [responseDataMap, setResponseDataMap] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("content");
  const [sortMode, setSortMode] = useState("default");
  const [userPostCounts, setUserPostCounts] = useState([]);
  const [postCounts, setPostCounts] = useState({});
  const [tags, setTags] = useState("");


  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel) fetchPosts();
  }, [selectedChannel]);

  const fetchChannels = async () => {
    try {
      const response = await axios.get("http://localhost:3000/channels");
      setChannels(response.data);
      setSelectedChannel(response.data[0]?._id); // auto-select first
    } catch (error) {
      console.error("❌ Error fetching channels:", error);
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await axios.get("http://localhost:3000/alldata");
      const filtered = response.data
          .filter(post => post.channelId === selectedChannel && !post._deleted);

      setPosts(filtered);
  
      // Count posts by user
      const counts = {};
      filtered.forEach(post => {
        if (post.createdBy) {
          counts[post.createdBy] = (counts[post.createdBy] || 0) + 1;
        }
      });
  
      setPostCounts(counts);
  
      // Sort into an array for display
      const sortedCounts = Object.entries(counts).map(
        ([username, count]) => ({ username, count })
      );
      setUserPostCounts(sortedCounts); // <- make sure you declared this state at the top
  
    } catch (error) {
      console.error("❌ Error fetching posts:", error);
    }
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topic || !data || !selectedChannel) return alert("Topic, data, and channel are required");

    try {
      const formData = new FormData();
      formData.append("topic", topic);
      formData.append("data", data);
      formData.append("channelId", selectedChannel);
      formData.append("tags", tags);

      if (imageFile) {
        formData.append("image", imageFile);
      }
  
      await axios.post("http://localhost:3000/postmessage", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      fetchPosts();
      setTopic("");
      setData("");
      setImageFile(null);
      setTags("");


    } catch (error) {
      alert("Failed to submit post. Check console.");
      console.error(error);
    }
  };

  const handleResponseSubmit = async (e, parentId) => {
    e.preventDefault();
    if (!responseDataMap[parentId]) return alert("Reply cannot be empty");

    try {
      await axios.post(
        "http://localhost:3000/postresponse",
        { parentId, data: responseDataMap[parentId] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPosts();
      setResponseDataMap(prev => ({ ...prev, [parentId]: "" }));
      setReplyingTo(null);
    } catch (error) {
      alert("Failed to submit response.");
      console.error(error);
    }
  };

  const renderResponses = (parentId, depth = 0) => {
    if (depth > 5) return <p style={{ color: "red" }}>⚠️ Max depth reached</p>;
    const responses = posts.filter(post => post.parentId === parentId);
    if (!responses.length) return null;

    return (
      <ul style={{ marginLeft: `${depth * 20}px`, borderLeft: "2px solid #ccc", paddingLeft: "10px" }}>
        {responses.map(response => (
          <li key={response._id}>
            {response.data}
            <p>
            <strong>{response.createdBy || "Unknown"}</strong>: {response.data}
          </p>
            <p><i>{new Date(response.timestamp).toLocaleString()}</i></p>
            <div className="post-rating-block">
  <span className="post-rating">⭐ {response.rating || 0}</span>
  <button onClick={() => handleRate(response._id, 1)} className="rate-btn">👍</button>
  <button onClick={() => handleRate(response._id, -1)} className="rate-btn">👎</button>
</div>


<button
  className="reply-toggle"
  onClick={() => setReplyingTo(response._id)} // 🔄 FIXED
>
  💬 Reply
</button>

{replyingTo === response._id && ( // 🔄 FIXED
  <form
    onSubmit={(e) => handleResponseSubmit(e, response._id)} // 🔄 FIXED
    className="reply-form"
  >
    <textarea
      value={responseDataMap[response._id] || ""} // 🔄 FIXED
      onChange={(e) =>
        setResponseDataMap(prev => ({ ...prev, [response._id]: e.target.value })) // 🔄 FIXED
      }
      placeholder="Write your reply..."
      className="reply-input"
      required
    />
    <button type="submit" className="reply-submit">Post Reply</button>
  </form>


)}
            {user.role === "admin" && (
              
  <button
    onClick={() => handleDeleteReply(response._id)}
    style={{ color: "red", marginLeft: "10px" }}
  >
    ❌ Delete Reply
  </button>
)}
            {renderResponses(response._id, depth + 1)}
          </li>
        ))}
      </ul>
      
    );
    
  };
  const handleRate = async (id, delta) => {
    try {
      await axios.post(
        "http://localhost:3000/rate",
        { id, delta },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPosts(); // Refresh after rating
      
    } catch (error) {
      
      console.error("❌ Failed to rate:", error);
      alert("Failed to rate item.");
    }
  };
  
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };
  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await axios.delete(`http://localhost:3000/deletepost/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPosts(); // Refresh posts
    } catch (error) {
      console.error("❌ Failed to delete post:", error);
      alert("Failed to delete post.");
    }
  };
  const handleDeleteReply = async (id) => {
    if (!window.confirm("Delete this reply?")) return;
  
    try {
      await axios.delete(`http://localhost:3000/deleteresponse/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("🔐 Token:", token);
      fetchPosts();
    } catch (err) {
      console.error("❌ Failed to delete reply:", err);
      alert("Could not delete reply.");
    }
  };
  
  return (

<div className="home-container">

<h2 className="home-title">CodeTalk 💬</h2>
<div className="welcome-section">
  <div className="welcome-text">
    👋 Welcome back, <strong>{user.name}</strong> <span className="user-level">({user.level || "beginner"})</span>
  </div>
  <div>
    <button className="logout-button" onClick={handleLogout}>Logout</button>

    {user.role === "admin" && (
  <Link to="/admin">
    <button className="admin-btn">🔧 Admin Dashboard</button>
  </Link>
)}

  </div>
</div>



<div className="toolbar-section">
  <div className="search-sort-row">
    <input
      type="text"
      placeholder={`Search by ${searchMode}`}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="search-input"
    />
    <select
      value={searchMode}
      onChange={(e) => setSearchMode(e.target.value)}
      className="dropdown"
    >
      <option value="content">Keyword</option>
      <option value="user">User</option>
    </select>
    <select
      value={sortMode}
      onChange={(e) => setSortMode(e.target.value)}
      className="dropdown"
    >
      <option value="default">Sort by</option>
      <option value="highest">Highest Rated</option>
      <option value="lowest">Lowest Rated</option>
    </select>
  </div>

  <div className="user-count-card">
    <h4>👥 Users by Post Count:</h4>
    <ul>
      {userPostCounts
        .sort((a, b) => b.count - a.count)
        .map(user => (
          <li key={user.username}>
            <strong>{user.username}</strong>: {user.count} posts
          </li>
        ))}
    </ul>
  </div>

  <div className="channel-select">
    <label><strong>Select Channel:</strong></label>
    <select
      value={selectedChannel || ""}
      onChange={(e) => setSelectedChannel(e.target.value)}
      className="dropdown"
    >
      {channels.map(ch => (
        <option key={ch._id} value={ch._id}>{ch.name}</option>
      ))}
    </select>
  </div>
</div>


<div style={{
  marginTop: "30px",
  padding: "15px",
  border: "1px solid #ddd",
  borderRadius: "12px",
  backgroundColor: "#fff"
}}>
  
  <h4 style={{ marginBottom: "10px", color: "#6a0dad" }}>Create a New Channel</h4>
  <form
    onSubmit={async (e) => {
      e.preventDefault();
      if (!newChannelName || !newChannelDesc) return alert("Please fill out both fields.");

      try {
        const response = await axios.post(
          "http://localhost:3000/createchannel",
          { name: newChannelName, description: newChannelDesc },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("✅ Channel created!");
        

        // Clear inputs and reload channels
        setNewChannelName("");
        setNewChannelDesc("");
        fetchChannels();
      } catch (err) {
        alert("❌ Failed to create channel: " + (err.response?.data?.error || err.message));
        console.error(err);
      }
    }}
    
  >
    <input
      type="text"
      placeholder="Channel Name"
      value={newChannelName}
      onChange={(e) => setNewChannelName(e.target.value)}
      required
      style={{
        marginRight: "10px",
        padding: "8px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        width: "45%"
      }}    />
    <input
      type="text"
      placeholder="Description"
      value={newChannelDesc}
      onChange={(e) => setNewChannelDesc(e.target.value)}
      required
      style={{
        marginRight: "10px",
        padding: "8px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        width: "45%"
      }}
    />
<button
      type="submit"
      style={{
        padding: "8px 16px",
        backgroundColor: "#6a0dad",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
      
      }}
    >
      Create
    </button>  
    </form>

</div>


      {/* Post Form */}
      <form onSubmit={handleSubmit}  style={{ marginTop: "30px" }}>
        <input
          type="text"
          placeholder="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc"
          }}
        />
        <textarea
          placeholder="Describe your issue..."
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc"
          }}
        />
        <input
  type="text"
  placeholder="Tags (comma-separated)"
  value={tags}
  onChange={(e) => setTags(e.target.value)}
  style={{
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc"
  }}
/>

        <input
    type="file"
    accept="image/*"
    onChange={(e) => setImageFile(e.target.files[0])}
    style={{ marginBottom: "10px" }}
  />
  {imageFile && (
  <div style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
    <img
      src={URL.createObjectURL(imageFile)}
      alt="Preview"
      style={{ width: "100px", height: "auto", marginRight: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
    />
    <button
      type="button"
      onClick={() => setImageFile(null)}
      style={{
        background: "transparent",
        border: "none",
        color: "#d00",
        fontSize: "1.5rem",
        cursor: "pointer"
      }}
      title="Remove image"
    >
      ❌
    </button>
  </div>
)}
<button
    type="submit"
    style={{
      backgroundColor: "#6a0dad",
      color: "#fff",
      padding: "10px 20px",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer"
    }}
  >
    Post
  </button>
          </form>

      {/* Posts */}
      <h3>Posts in this Channel</h3>
      <ul>
  {posts
    .filter(post => post.type === "post")
    .filter(post => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      if (searchMode === "content") {
        return post.data?.toLowerCase().includes(term) || post.topic?.toLowerCase().includes(term);
      } else if (searchMode === "user") {
        return post.createdBy?.toLowerCase().includes(term);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortMode === "highest") return (b.rating || 0) - (a.rating || 0);
      if (sortMode === "lowest") return (a.rating || 0) - (b.rating || 0);
      return 0;
    })
    .map(post => (
      <li key={post._id} className="post-card">
        <div className="post-header">
          <h4 className="post-topic">{post.topic}</h4>
          <span className="post-user">{post.createdBy || "Unknown User"}</span>
        </div>

        <p className="post-body">{post.data}</p>
        <p className="post-meta"><i>{new Date(post.timestamp).toLocaleString()}</i></p>

        {post.image && (
          <img src={`data:${post.imageType};base64,${post.image}`} alt="screenshot" className="post-image" />
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="post-tags">
            {post.tags.map((tag, i) => (
              <span key={i} className="tag-badge">#{tag}</span>
            ))}
          </div>
        )}

        {user.role === "admin" && (
          <button onClick={() => handleDeletePost(post._id)} className="delete-button">
            ❌ Delete
          </button>
        )}

        {(user.username === post.createdBy || user.role === "admin") && (
          <button
            className={`resolved-button ${post.resolved ? "active" : "inactive"}`}
            onClick={async () => {
              try {
                await axios.patch(`http://localhost:3000/markresolved/${post._id}`, {}, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                fetchPosts();
              } catch (err) {
                alert("Failed to update resolved status.");
                console.error(err);
              }
            }}
          >
            {post.resolved ? "✅ Resolved" : "Mark as Resolved"}
          </button>
        )}

<div className="post-rating-block">
  <span className="post-rating">⭐ {post.rating || 0}</span>
  <button onClick={() => handleRate(post._id, 1)} className="rate-btn">👍</button>
  <button onClick={() => handleRate(post._id, -1)} className="rate-btn">👎</button>
</div>

<button
  onClick={() => setReplyingTo(post._id)}
  className="reply-toggle"
>
  💬 Reply
</button>

        {replyingTo === post._id && (
          <form onSubmit={(e) => handleResponseSubmit(e, post._id)} className="reply-form">
            <input
              type="text"
              value={responseDataMap[post._id] || ""}
              onChange={(e) =>
                setResponseDataMap(prev => ({ ...prev, [post._id]: e.target.value }))
              }
              placeholder="Write a reply..."
              required
            />
            <button type="submit">Post Reply</button>
          </form>
        )}

        {renderResponses(post._id)}
      </li>
    ))}
</ul>
</div>
);
}