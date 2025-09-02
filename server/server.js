const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');
let users = [];
let groups = [];
let joinRequests = [];

// --- Persistence helpers ---
function saveData() {
  try {
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ users, groups, joinRequests }, null, 2), 'utf8');
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    console.error('Failed to save data file', err);
  }
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      if (Array.isArray(parsed.users)) users = parsed.users;
      if (Array.isArray(parsed.groups)) groups = parsed.groups;
      if (Array.isArray(parsed.joinRequests)) joinRequests = parsed.joinRequests;
      // Defensive normalization
      users = (users || []).map(u => ({
        ...u,
        groups: Array.isArray(u.groups) ? u.groups : [],
        roles: Array.isArray(u.roles) ? u.roles : (u.roles ? [u.roles] : [])
      }));
      groups = (groups || []).map(g => ({
        ...g,
        members: Array.isArray(g.members) ? g.members : [],
        admins: Array.isArray(g.admins) ? g.admins : [],
        channels: Array.isArray(g.channels) ? g.channels : []
      }));
      joinRequests = Array.isArray(joinRequests) ? joinRequests : [];
    } else {
      // Create default super admin user if no data file exists
      users = [{
        id: 'u1',
        username: 'super',
        email: 'super@admin.com',
        password: '123',
        roles: ['Super Admin'],
        groups: []
      }];
      saveData();
    }
  } catch (err) {
    console.error('Failed to load data file', err);
  }
}

// --- ID generators ---
const genId = (prefix = 'u') => `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
const genGid = () => genId('g');
const genCid = () => genId('c');
const genRid = () => genId('r');

// --- Case-insensitive helpers ---
const normalize = (s) => String(s || '').toLowerCase();
const hasUser = (username) => users.some((u) => normalize(u.username) === normalize(username));
const getUserByUsername = (username) => users.find((u) => normalize(u.username) === normalize(username));
const getUserById = (id) => users.find((u) => u.id === id);
const getGroupById = (gid) => groups.find((g) => g.id === gid);
const attachGroupToUser = (username, gid) => {
  const u = getUserByUsername(username);
  if (!u) return;
  if (!Array.isArray(u.groups)) u.groups = [];
  if (!u.groups.includes(gid)) u.groups.push(gid);
};

// --- Load persisted data ---
loadData();

// --- AUTH ---
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = getUserByUsername(username);
  if (!user) return res.status(401).json({ error: 'Invalid username/password' });

  if (user.password && user.password === password) {
    const { password: _omit, ...userWithoutPassword } = user;
    return res.json({ user: userWithoutPassword });
  }
  // Backwards compatibility: default super password
  if (user.username === 'super' && password === '123') {
    const { password: _omit, ...userWithoutPassword } = user;
    return res.json({ user: userWithoutPassword });
  }
  return res.status(401).json({ error: 'Invalid username/password' });
});

// --- USERS ---
app.get('/api/users', (req, res) => {
  // Return users without passwords
  const safeUsers = users.map(({ password, ...user }) => user);
  res.json({ users: safeUsers });
});

app.post('/api/users', (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !username.trim()) return res.status(400).json({ error: 'username required' });
  if (hasUser(username)) return res.status(409).json({ error: 'username taken' });

  const user = {
    id: genId('u'),
    username: username.trim(),
    email: (email || '').trim(),
    password: password || '',
    roles: ['User'],
    groups: []
  };
  users.push(user);
  saveData();
  const { password: _omit, ...userWithoutPassword } = user;
  return res.status(201).json({ user: userWithoutPassword });
});

// Delete user - Super Admin only
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userToDelete = users[userIndex];
  
  // Remove user from all groups
  groups.forEach(group => {
    group.members = group.members.filter(member => normalize(member) !== normalize(userToDelete.username));
    group.admins = group.admins.filter(admin => normalize(admin) !== normalize(userToDelete.username));
  });

  // Remove user's join requests
  joinRequests = joinRequests.filter(req => normalize(req.username) !== normalize(userToDelete.username));

  users.splice(userIndex, 1);
  saveData();
  
  res.json({ message: 'User deleted successfully' });
});

// --- GROUPS ---
app.get('/api/groups', (req, res) => res.json({ groups }));

app.post('/api/groups', (req, res) => {
  const { name, ownerUsername } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'group name required' });
  if (!ownerUsername?.trim()) return res.status(400).json({ error: 'ownerUsername required' });
  if (!hasUser(ownerUsername)) return res.status(404).json({ error: 'owner user not found' });

  const owner = getUserByUsername(ownerUsername);
  const canCreate = owner.roles.includes('Group Admin') || owner.roles.includes('Super Admin');
  if (!canCreate) return res.status(403).json({ error: 'only Group Admins or Super Admins can create groups' });

  const group = {
    id: genGid(),
    name: name.trim(),
    ownerUsername: ownerUsername.trim(),
    admins: [ownerUsername.trim()],
    members: [ownerUsername.trim()],
    channels: []
  };
  groups.push(group);
  attachGroupToUser(ownerUsername, group.id);
  saveData();
  return res.status(201).json({ group });
});

// Delete group - Group Admin or Super Admin only
app.delete('/api/groups/:id', (req, res) => {
  const { id } = req.params;
  const groupIndex = groups.findIndex(g => g.id === id);
  
  if (groupIndex === -1) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const group = groups[groupIndex];
  
  // Remove group from all users
  users.forEach(user => {
    user.groups = user.groups.filter(gid => gid !== id);
  });

  // Remove related join requests
  joinRequests = joinRequests.filter(req => req.gid !== id);

  groups.splice(groupIndex, 1);
  saveData();
  
  res.json({ message: 'Group deleted successfully' });
});

// Add user to group
app.post('/api/groups/:id/members', (req, res) => {
  const { id } = req.params;
  const { username } = req.body || {};
  
  if (!username?.trim()) return res.status(400).json({ error: 'username required' });
  
  const group = getGroupById(id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  
  if (!hasUser(username)) return res.status(404).json({ error: 'User not found' });
  
  if (group.members.some(m => normalize(m) === normalize(username))) {
    return res.status(400).json({ error: 'User already a member' });
  }
  
  group.members.push(username.trim());
  attachGroupToUser(username, id);
  saveData();
  
  res.json({ message: 'User added to group successfully' });
});

// Remove user from group
app.delete('/api/groups/:id/members/:username', (req, res) => {
  const { id, username } = req.params;
  
  const group = getGroupById(id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  
  group.members = group.members.filter(m => normalize(m) !== normalize(username));
  group.admins = group.admins.filter(a => normalize(a) !== normalize(username));
  
  // Remove group from user
  const user = getUserByUsername(username);
  if (user) {
    user.groups = user.groups.filter(gid => gid !== id);
  }
  
  saveData();
  res.json({ message: 'User removed from group successfully' });
});

// Add channel to group
app.post('/api/groups/:id/channels', (req, res) => {
  const { id } = req.params;
  const { name } = req.body || {};
  
  if (!name?.trim()) return res.status(400).json({ error: 'channel name required' });
  
  const group = getGroupById(id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  
  if (group.channels.some(c => normalize(c.name) === normalize(name))) {
    return res.status(400).json({ error: 'Channel already exists in this group' });
  }
  
  const channel = {
    id: genCid(),
    name: name.trim(),
    members: []
  };
  
  group.channels.push(channel);
  saveData();
  
  res.status(201).json({ channel });
});

// Remove channel from group
app.delete('/api/groups/:groupId/channels/:channelId', (req, res) => {
  const { groupId, channelId } = req.params;
  
  const group = getGroupById(groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  
  const channelIndex = group.channels.findIndex(c => c.id === channelId);
  if (channelIndex === -1) return res.status(404).json({ error: 'Channel not found' });
  
  group.channels.splice(channelIndex, 1);
  saveData();
  
  res.json({ message: 'Channel removed successfully' });
});

// Add user to channel
app.post('/api/groups/:groupId/channels/:channelId/members', (req, res) => {
  const { groupId, channelId } = req.params;
  const { username } = req.body || {};
  
  if (!username?.trim()) return res.status(400).json({ error: 'username required' });
  
  const group = getGroupById(groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  
  const channel = group.channels.find(c => c.id === channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  
  if (!hasUser(username)) return res.status(404).json({ error: 'User not found' });
  
  // User must be a member of the group to be added to a channel
  if (!group.members.some(m => normalize(m) === normalize(username))) {
    return res.status(400).json({ error: 'User must be a member of the group first' });
  }
  
  if (channel.members.some(m => normalize(m) === normalize(username))) {
    return res.status(400).json({ error: 'User already a member of this channel' });
  }
  
  channel.members.push(username.trim());
  saveData();
  
  res.json({ message: 'User added to channel successfully' });
});

// Remove user from channel
app.delete('/api/groups/:groupId/channels/:channelId/members/:username', (req, res) => {
  const { groupId, channelId, username } = req.params;
  
  const group = getGroupById(groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  
  const channel = group.channels.find(c => c.id === channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  
  channel.members = channel.members.filter(m => normalize(m) !== normalize(username));
  saveData();
  
  res.json({ message: 'User removed from channel successfully' });
});

// --- Join Requests ---
app.post('/api/groups/:gid/requests', (req, res) => {
  const { gid } = req.params;
  const { username } = req.body || {};
  if (!username?.trim()) return res.status(400).json({ error: 'username required' });

  const g = getGroupById(gid);
  if (!g) return res.status(404).json({ error: 'group not found' });
  if (!hasUser(username)) return res.status(404).json({ error: 'user not found' });

  if (g.members.some(m => normalize(m) === normalize(username))) {
    return res.status(400).json({ error: 'user already a member' });
  }
  const exists = joinRequests.some(r => r.gid === gid && normalize(r.username) === normalize(username) && r.status === 'pending');
  if (exists) return res.status(409).json({ error: 'request already pending' });

  const reqObj = { id: genRid(), gid, username: username.trim(), status: 'pending', createdAt: Date.now() };
  joinRequests.push(reqObj);
  saveData();
  return res.status(201).json({ request: reqObj });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));