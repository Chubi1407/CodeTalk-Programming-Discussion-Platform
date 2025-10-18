require("dotenv").config(); // Load environment variables

const express = require("express");
const nano = require("nano")(process.env.COUCHDB_URL);
const cors = require("cors");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json()); // Middleware for JSON parsing
app.use(cors()); // Enable CORS   

const usersDB = nano.db.use("usersdb");
const channelsDB = nano.db.use("channelsdb")
const dbUser = usersDB;
const dbChannel = channelsDB;
const dbPost = global.db;
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });


function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
}
// 🔐 Register New User
app.post("/register", async (req, res) => {
  const { username, password, name, level } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Check if user already exists
    const existing = await usersDB.get(`user:${username}`).catch(() => null);
    if (existing) {
      return res.status(409).json({ error: "Username already exists" });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Save user
    const newUser = {
      _id: `user:${username}`,
      type: "user",
      username,
      name,
      level: level || "beginner",
      passwordHash,
      role: username === "admin" ? "admin" : "user"
    };

    await usersDB.insert(newUser);
    res.status(201).json({ success: true, message: "User registered" });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ error: "Registration failed", details: error.message });
  }
});

// 🔑 Login User
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const user = await usersDB.get(`user:${username}`);

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Create JWT
    const token = jwt.sign(
      { username: user.username, name: user.name, role: user.role },
      process.env.JWT_SECRET || "devsecret",
      { expiresIn: "2h" }
    );

    res.json({ token, user: { name: user.name, username: user.username, role: user.role, level: user.level } });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(401).json({ error: "Invalid credentials" });
  }
});

if (!process.env.COUCHDB_URL) {
  console.error("❌ ERROR: COUCHDB_URL is not defined in .env");
  process.exit(1);
}

// Initialize CouchDB connection
const dbName = "postsdb";
const couch = nano.db;

async function createUsersDB() {
  try {
    await nano.db.create('usersdb');
    console.log('✅ usersdb created!');
  } catch (err) {
    if (err.statusCode === 412) {
      console.log('ℹ️ usersdb already exists');
    } else {
      console.error('❌ Error creating usersdb:', err.message);
    }
  }
}

createUsersDB();

async function checkDatabase() {
  try {
    const dbList = await couch.list();
    if (!dbList.includes(dbName)) {
      console.log(`📌 Creating database: ${dbName}`);
      await couch.create(dbName);
    }
    global.db = nano.db.use(dbName);
    console.log(`✅ CouchDB is ready. Using database: ${dbName}`);
  } catch (error) {
    console.error("❌ Error checking database:", error);
    process.exit(1);
  }
}
checkDatabase();

async function createChannelsDB() {
  try {
    await nano.db.create('channelsdb')
    console.log('✅ channelsdb created!');
  } catch (err) {
    if (err.statusCode === 412) {
      console.log('ℹ️ channelsdb already exists');
    } else {
      console.error('❌ Error creating channelsdb:', err.message);
    }
  }
}
createChannelsDB();



// ✅ Test CouchDB Connection
app.get("/", async (req, res) => {
  try {
    const dbInfo = await global.db.info();
    res.json({ message: "✅ CouchDB Connected!", dbInfo });
  } catch (error) {
    console.error("❌ CouchDB Connection Failed:", error);
    res.status(500).json({ error: "CouchDB Connection Failed", details: error.message });
  }
});

// ✅ Fetch all posts & responses
app.get("/alldata", async (req, res) => {
  try {
    const allDocs = await global.db.list({ include_docs: true });
    const posts = allDocs.rows
    .map(row => row.doc)
    .filter(doc => doc && !doc._deleted);    
    res.json(posts);
  } catch (error) {
    console.error("❌ Error fetching data:", error);
    res.status(500).json({ error: "Failed to fetch data", details: error.message });
  }
});

// ✅ Create a new post
app.post("/postmessage", authenticate, upload.fields([
  { name: "image", maxCount: 1 },
]), async (req, res) => {
  const { topic, data, channelId, tags } = req.body;
  const image = req.files?.image?.[0]; // safely extract image
  console.log("🖼️ Image Info:", image);

  console.log("📥 New post request:", { topic, data, channelId });

  if (!topic || !data || !channelId) {
    return res.status(400).json({ error: "❌ Topic and data are required" });
  }

  try {
    const newPost = {
      _id: `post:${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type: "post",
      topic,
      data,
      channelId,
      timestamp: new Date().toISOString(),
      rating: 0,
      createdBy: req.user.username,
      resolved: false,
      tags: tags ? tags.split(",").map(t => t.trim()) : [],
        };

        newPost.tags = tags ? tags.split(",").map(t => t.trim()) : [];

    if (image) {
      newPost.image = image.buffer.toString("base64");
      newPost.imageType = image.mimetype;
    }

    const result = await global.db.insert(newPost);
    res.json({ success: true, id: result.id });
  } catch (error) {
    console.error("❌ Failed to create post:", error);
    res.status(500).json({ error: "Failed to create post", details: error.message });
  }
});



app.post("/postresponse", authenticate, upload.single("image"), async (req, res) => {
  const { parentId, data } = req.body;
  const image = req.file;

  if (!parentId || !data) {
    return res.status(400).json({ error: "❌ ParentId and data are required" });
  }

  try {
    const parentDoc = await global.db.get(parentId).catch(() => null);
    if (!parentDoc) {
      return res.status(400).json({ error: "❌ Parent post/response not found" });
    }

    const newResponse = {
      _id: `response:${Date.now()}`,
      type: "response",
      parentId,
      data,
      channelId: parentDoc.channelId,
      timestamp: new Date().toISOString(),
      rating: 0,
      createdBy: req.user.username,
      image: image ? image.buffer.toString("base64") : null,
      imageType: image?.mimetype || null
    };

    const response = await global.db.insert(newResponse);
    res.json({ success: true, id: response.id });
  } catch (error) {
    console.error("❌ Failed to create response:", error);
    res.status(500).json({ error: "Failed to create response", details: error.message });
  }
});


app.post("/rate", authenticate, async (req, res) => {
  const { id, delta } = req.body;

  if (!id || ![1, -1].includes(delta)) {
    return res.status(400).json({ error: "❌ id and delta (+1 or -1) required" });
  }

  try {
    const doc = await global.db.get(id);
    doc.rating = (doc.rating || 0) + delta;

    const response = await global.db.insert(doc);
    res.json({ success: true, rating: doc.rating });
  } catch (error) {
    console.error("❌ Failed to rate:", error);
    res.status(500).json({ error: "Failed to update rating", details: error.message });
  }
});

// ✅ Create a new channel
app.post("/createchannel", authenticate, async (req, res) => {
  const { name, description } = req.body;
  if (!name || !description) {
    return res.status(400).json({ error: "Name and description are required" });
  }

  const id = `channel:${name.toLowerCase().replace(/\s+/g, "-")}`;

  try {
    const existing = await channelsDB.get(id).catch(() => null);
    if (existing) {
      return res.status(409).json({ error: "Channel already exists" });
    }

    const newChannel = {
      _id: id,
      type: "channel",
      name,
      description,
      createdBy: req.user.username,
      createdAt: new Date().toISOString()
    };

    await channelsDB.insert(newChannel);
    res.json({ success: true, message: "Channel created" });
  } catch (err) {
    console.error("❌ Channel creation failed:", err.message);
    res.status(500).json({ error: "Failed to create channel", details: err.message });
  }
});

// ✅ Get all channels
app.get("/channels", async (req, res) => {
  try {
    const result = await channelsDB.list({ include_docs: true });
    const channels = result.rows.map(row => row.doc);
    res.json(channels);
  } catch (err) {
    console.error("❌ Failed to fetch channels:", err.message);
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});
app.delete("/deletepost/:id", authenticate, async (req, res) => {
  const postId = req.params.id;
  try {
    const doc = await global.db.get(postId);
    
    // Only allow admin to delete
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admin can delete posts" });
    }

    await global.db.destroy(doc._id, doc._rev);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete", details: error.message });
  }
  
  
});
app.delete("/deleteresponse/:id", authenticate, async (req, res) => {
  const responseId = req.params.id;

  try {
    const doc = await global.db.get(responseId);

    // Only admins can delete
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admin can delete replies" });
    }

    await global.db.destroy(doc._id, doc._rev);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Failed to delete response:", error);
    res.status(500).json({ error: "Failed to delete response", details: error.message });
  }
});
app.patch("/markresolved/:id", authenticate, async (req, res) => {
  try {
    const post = await global.db.get(req.params.id);

    if (post.type !== "post") {
      return res.status(400).json({ error: "Only posts can be resolved" });
    }

    // Only post creator or admin can toggle
    if (req.user.username !== post.createdBy && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    app.patch("/markresolved/:id", authenticate, async (req, res) => {
      try {
        const post = await global.db.get(req.params.id);
    
        if (post.type !== "post") {
          return res.status(400).json({ error: "Only posts can be resolved" });
        }
    
        // Only post creator or admin can toggle
        if (req.user.username !== post.createdBy && req.user.role !== "admin") {
          return res.status(403).json({ error: "Unauthorized" });
        }
    
        post.resolved = !post.resolved;
        const result = await global.db.insert(post);
        res.json({ success: true, resolved: post.resolved });
      } catch (err) {
        console.error("❌ Failed to toggle resolved:", err);
        res.status(500).json({ error: "Could not mark as resolved", details: err.message });
      }
    });
    

    post.resolved = !post.resolved;
    const result = await global.db.insert(post);
    res.json({ success: true, resolved: post.resolved });
  } catch (err) {
    console.error("❌ Failed to toggle resolved:", err);
    res.status(500).json({ error: "Could not mark as resolved", details: err.message });
  }
});
app.get("/admin/users", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await usersDB.list({ include_docs: true });
    const users = result.rows.map(row => row.doc);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.delete("/admin/user/:id", authenticate, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });

  try {
    const user = await usersDB.get(req.params.id);
    await usersDB.destroy(user._id, user._rev);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: "Delete failed", details: err.message });
  }
});

app.get("/admin/channels", authenticate, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });

  try {
    const channels = await channelsDB.list({ include_docs: true });
    res.json(channels.rows.map(row => row.doc));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});

app.delete("/admin/channel/:id", authenticate, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });

  try {
    const channelId = req.params.id;

    // Delete all posts in this channel
    const allDocs = await global.db.list({ include_docs: true });
    const postsToDelete = allDocs.rows
      .map(row => row.doc)
      .filter(doc => doc.channelId === channelId);

    for (const doc of postsToDelete) {
      await global.db.destroy(doc._id, doc._rev);
    }

    // Now delete the channel itself
    const doc = await channelsDB.get(channelId);
    await channelsDB.destroy(doc._id, doc._rev);

    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: "Delete failed", details: err.message });
  }
});


app.get("/admin/posts", authenticate, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });

  try {
    const allDocs = await global.db.list({ include_docs: true });
    const posts = allDocs.rows.map(row => row.doc).filter(p => p.type === "post");
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

app.delete("/admin/post/:id", authenticate, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });

  try {
    const doc = await global.db.get(req.params.id);
    await global.db.destroy(doc._id, doc._rev);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: "Delete failed", details: err.message });
  }
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
