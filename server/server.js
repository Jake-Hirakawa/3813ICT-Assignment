const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const lastId = 1;

let users = [
  { id: 1, username: "super", email: "super@example.com", roles: ["Super Admin"], groups: [] }
];

let groups = [
  { id: 1, name: "Group 1", description: "This is group 1", members: [1], channels: [1, 2] },
  { id: 2, name: "Group 2", description: "This is group 2", members: [], channels: [] }
];

app.get("/api/groups", (req, res) => {
  res.json({ groups });
});

app.post("/api/auth/login", (req, res) => {
    const {username, password} = req.body;
    if (username === "super" && password === "123"){
        return res.json({user: users[0]});
    }
    res.status(401).json({ error: "Invalid username/password" });
});

app.get("/api/users", (req, res) => {
  res.json({ users });
});

app.post("/api/createuser", (req, res) => {
  const { username, email } = req.body || {};
  if (!username || !username.trim()) {
    return res.status(400).json({ error: "username required" });
  }
  const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(409).json({ error: "username taken" });
  }
  const user = {
    id: lastId + 1,
    username: username.trim(),
    email: (email || "").trim(),
    roles: ["User"],
    groups: []          // will store group IDs
  };
  users.push(user);
  res.status(201).json({ user });
  lastId += 1;
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
    
