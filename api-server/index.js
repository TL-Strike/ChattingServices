const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const { io } = require('socket.io-client');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'your_jwt_secret_key';

const socket = io('http://localhost:5000/api');

const users = new Map();
const groups = new Map();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token missing' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

app.post('/register', async (req, res) => {
  const { username, password, phoneNumber, fullName, gmail } = req.body;

  if (!username || !password || !phoneNumber || !fullName || !gmail) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(gmail)) {
    return res.status(400).json({ error: 'Email không hợp lệ' });
  }

  const existingUser = Array.from(users.values()).find(user => user.username === username);
  if (existingUser) {
    return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
  }

  const userId = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);

  users.set(userId, {
    userId,
    username,
    fullName,
    phoneNumber,
    gmail,
    password: hashedPassword,
    online: false,
    friends: [],
    pendingFriendRequests: [],
    pendingGroupInvites: [], // Thêm danh sách lời mời nhóm
  });

  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });

  res.status(201).json({ userId, username, phoneNumber, fullName, token });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu' });
  }

  const user = Array.from(users.values()).find(user => user.username === username);
  if (!user) {
    return res.status(400).json({ error: 'Người dùng không tồn tại' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ error: 'Mật khẩu không đúng' });
  }

  user.online = true;
  const token = jwt.sign({ userId: user.userId }, JWT_SECRET, { expiresIn: '1h' });

  socket.emit('user-status', { username: user.username, online: true });

  res.json({
    userId: user.userId,
    username: user.username,
    phoneNumber: user.phoneNumber,
    fullName: user.fullName,
    token,
    pendingFriendRequests: user.pendingFriendRequests,
    pendingGroupInvites: user.pendingGroupInvites, // Trả về danh sách lời mời nhóm
  });
});

app.get('/users', authenticateToken, (req, res) => {
  const userList = Array.from(users.values()).map(user => ({
    userId: user.userId,
    username: user.username,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    gmail: user.gmail,
    online: user.online,
  }));
  res.json(userList);
});

app.get('/users/search', authenticateToken, (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Vui lòng nhập từ khóa tìm kiếm' });
  }

  const currentUser = users.get(req.userId);
  let suggestions = [];
  const isPhoneNumberQuery = /^\d+$/.test(query);

  if (isPhoneNumberQuery) {
    if (query.length === 10) {
      suggestions = Array.from(users.values()).filter(
        user => user.phoneNumber === query && user.username !== currentUser.username
      );
    }
  } else {
    suggestions = Array.from(users.values()).filter(
      user =>
        (user.username.toLowerCase().includes(query.toLowerCase()) ||
         user.fullName.toLowerCase().includes(query.toLowerCase())) &&
        user.username !== currentUser.username
    );
  }

  res.json(suggestions);
});

app.get('/user-status/:username', authenticateToken, (req, res) => {
  const { username } = req.params;
  const user = Array.from(users.values()).find(user => user.username === username);

  if (!user) {
    return res.status(404).json({ error: 'Người dùng không tồn tại' });
  }

  res.json({ username: user.username, online: user.online });
});

app.post('/friend-request', authenticateToken, (req, res) => {
  const { toUsername } = req.body;
  const fromUser = users.get(req.userId);

  const toUser = Array.from(users.values()).find(user => user.username === toUsername);
  if (!toUser) {
    return res.status(400).json({ error: 'Người dùng không tồn tại' });
  }

  if (fromUser.friends.includes(toUsername)) {
    return res.status(400).json({ error: 'Đã là bạn bè' });
  }

  if (toUser.pendingFriendRequests.includes(fromUser.username)) {
    return res.status(400).json({ error: 'Lời mời đã được gửi trước đó' });
  }

  toUser.pendingFriendRequests.push(fromUser.username);

  socket.emit('friend-request', { from: fromUser.username, to: toUsername });

  res.json({ message: 'Lời mời đã được gửi', from: fromUser.username, to: toUsername });
});

app.post('/friend-request/accept', authenticateToken, (req, res) => {
  const { fromUsername } = req.body;
  const toUser = users.get(req.userId);
  const fromUser = Array.from(users.values()).find(user => user.username === fromUsername);

  if (!fromUser) {
    return res.status(400).json({ error: 'Người dùng không tồn tại' });
  }

  toUser.friends.push(fromUsername);
  fromUser.friends.push(toUser.username);

  toUser.pendingFriendRequests = toUser.pendingFriendRequests.filter(
    username => username !== fromUsername
  );

  socket.emit('friend-accepted', {
    from: fromUsername,
    to: toUser.username,
  });

  socket.emit('user-status', { username: fromUsername, online: fromUser.online });
  socket.emit('user-status', { username: toUser.username, online: toUser.online });

  res.json({ message: 'Đã chấp nhận lời mời', friend: fromUsername });
});

app.post('/friend-request/reject', authenticateToken, (req, res) => {
  const { fromUsername } = req.body;
  const toUser = users.get(req.userId);

  toUser.pendingFriendRequests = toUser.pendingFriendRequests.filter(
    username => username !== fromUsername
  );

  res.json({ message: 'Đã từ chối lời mời', fromUsername });
});

app.get('/friend-requests', authenticateToken, (req, res) => {
  const user = users.get(req.userId);
  res.json(user.pendingFriendRequests);
});

app.get('/friends', authenticateToken, (req, res) => {
  const user = users.get(req.userId);
  res.json(user.friends);
});

app.get('/groups', authenticateToken, (req, res) => {
  const user = users.get(req.userId);
  const groupList = Array.from(groups.values())
    .filter(group => group.members.includes(user.username))
    .map(group => ({
      groupId: group.groupId,
      groupName: group.groupName,
      creator: group.creator,
      creatorUsername: group.creatorUsername,
      members: group.members,
    }));
  res.json(groupList);
});

app.post('/groups', authenticateToken, (req, res) => {
  const { groupName } = req.body;
  const creator = users.get(req.userId);

  const groupId = uuidv4();

  groups.set(groupId, {
    groupId,
    groupName,
    creator: creator.userId,
    creatorUsername: creator.username,
    members: [creator.username],
  });

  socket.emit('group-created', { groupId, groupName, username: creator.username });

  res.status(201).json({ message: 'Nhóm đã được tạo', groupId, groupName });
});

app.post('/groups/join', authenticateToken, (req, res) => {
  const { groupId } = req.body;
  const user = users.get(req.userId);

  const group = groups.get(groupId);
  if (!group) {
    return res.status(400).json({ error: 'Nhóm không tồn tại' });
  }

  if (group.members.includes(user.username)) {
    return res.status(400).json({ error: 'Bạn đã ở trong nhóm' });
  }

  group.members.push(user.username);
  socket.emit('group-member-update', { groupId, fullName: user.fullName, action: 'joined' });

  res.json({ message: 'Đã tham gia nhóm', groupId });
});

app.post('/groups/invite', authenticateToken, (req, res) => {
  const { groupId, username } = req.body;
  const fromUser = users.get(req.userId);

  const group = groups.get(groupId);
  if (!group) {
    return res.status(400).json({ error: 'Nhóm không tồn tại' });
  }

  const toUser = Array.from(users.values()).find(user => user.username === username);
  if (!toUser) {
    return res.status(400).json({ error: 'Người dùng không tồn tại' });
  }

  if (group.members.includes(username)) {
    return res.status(400).json({ error: 'Người dùng đã ở trong nhóm' });
  }

  // Lưu lời mời vào pendingGroupInvites
  const inviteExists = toUser.pendingGroupInvites.some(
    invite => invite.groupId === groupId && invite.from === fromUser.username
  );
  if (!inviteExists) {
    toUser.pendingGroupInvites.push({ groupId, groupName: group.groupName, from: fromUser.username });
  }

  socket.emit('group-invite', { groupId, groupName: group.groupName, from: fromUser.username, to: username });

  res.json({ message: 'Lời mời đã được gửi', groupId, from: fromUser.username });
});

app.get('/group-invites', authenticateToken, (req, res) => {
  const user = users.get(req.userId);
  res.json(user.pendingGroupInvites);
});

app.post('/groups/invite/accept', authenticateToken, (req, res) => {
  const { groupId } = req.body;
  const user = users.get(req.userId);

  const group = groups.get(groupId);
  if (!group) {
    return res.status(400).json({ error: 'Nhóm không tồn tại' });
  }

  if (!group.members.includes(user.username)) {
    group.members.push(user.username);
    socket.emit('group-member-update', { groupId, fullName: user.fullName, action: 'joined' });
  }

  // Xóa lời mời sau khi chấp nhận
  user.pendingGroupInvites = user.pendingGroupInvites.filter(invite => invite.groupId !== groupId);

  res.json({ message: 'Đã tham gia nhóm', groupId });
});

app.post('/groups/invite/reject', authenticateToken, (req, res) => {
  const { groupId } = req.body;
  const user = users.get(req.userId);

  // Xóa lời mời sau khi từ chối
  user.pendingGroupInvites = user.pendingGroupInvites.filter(invite => invite.groupId !== groupId);

  res.json({ message: 'Đã từ chối lời mời', groupId });
});

app.post('/groups/leave', authenticateToken, (req, res) => {
  const { groupId } = req.body;
  const user = users.get(req.userId);

  const group = groups.get(groupId);
  if (!group) {
    return res.status(400).json({ error: 'Nhóm không tồn tại' });
  }

  if (group.creator === user.userId) {
    groups.delete(groupId);
    socket.emit('group-deleted', { groupId });
    return res.json({ message: 'Nhóm đã bị xóa vì người tạo rời nhóm', groupId });
  }

  group.members = group.members.filter(member => member !== user.username);
  socket.emit('group-member-update', { groupId, fullName: user.fullName, action: 'left' });

  res.json({ message: 'Đã rời nhóm', groupId });
});

app.delete('/groups/:groupId', authenticateToken, (req, res) => {
  const { groupId } = req.params;
  const user = users.get(req.userId);

  const group = groups.get(groupId);
  if (!group) {
    return res.status(400).json({ error: 'Nhóm không tồn tại' });
  }

  if (group.creator !== user.userId) {
    return res.status(403).json({ error: 'Bạn không phải là người tạo nhóm' });
  }

  // Xóa lời mời liên quan đến nhóm
  users.forEach(user => {
    user.pendingGroupInvites = user.pendingGroupInvites.filter(invite => invite.groupId !== groupId);
  });

  groups.delete(groupId);
  socket.emit('group-deleted', { groupId });

  res.json({ message: 'Nhóm đã bị xóa', groupId });
});

app.post('/logout', authenticateToken, (req, res) => {
  const user = users.get(req.userId);
  user.online = false;

  socket.emit('user-status', { username: user.username, online: false });

  res.json({ message: 'Đã đăng xuất' });
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});