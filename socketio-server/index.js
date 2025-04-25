const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

const server = http.createServer();
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const JWT_SECRET = 'your_jwt_secret_key';

const users = new Map();
const groups = new Map();
const privateMessages = new Map();
const groupMessages = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

const chatNamespace = io.of('/chat');

chatNamespace.on('connection', (socket) => {
  console.log('A user connected to Socket.IO server:', socket.id);

  socket.on('join', ({ userId, username, groups: userGroups }) => {
    users.set(socket.id, { userId, username, socket });
    console.log(`User ${username} joined with socket ID ${socket.id}`);

    userGroups.forEach(group => {
      if (groups.has(group.groupId)) {
        groups.get(group.groupId).members.push(username);
      } else {
        groups.set(group.groupId, { groupId: group.groupId, groupName: group.groupName, members: [username] });
      }
      socket.join(group.groupId);
    });

    chatNamespace.emit('user-status', { username, online: true });

    Array.from(users.values()).forEach(user => {
      if (user.username !== username) {
        socket.emit('user-status', { username: user.username, online: true });
      }
    });

    users.forEach((user, id) => {
      if (id !== socket.id) {
        user.socket.emit('user-status', { username, online: true });
      }
    });
  });

  socket.on('request-message-history', ({ username }) => {
    const user = users.get(socket.id);
    if (!user) return;

    // Gửi tin nhắn cá nhân
    const privateMessageHistory = [];
    privateMessages.forEach((messages, key) => {
      const [from, to] = key.split(':');
      if (from === username || to === username) {
        privateMessageHistory.push(...messages.map(msg => ({ ...msg, from, to })));
      }
    });
    socket.emit('private-message-history', privateMessageHistory);

    // Gửi tin nhắn nhóm
    const userGroups = Array.from(groups.values()).filter(group => group.members.includes(username));
    const groupMessageHistory = [];
    userGroups.forEach(group => {
      const messages = groupMessages.get(group.groupId) || [];
      groupMessageHistory.push(...messages.map(msg => ({ ...msg, groupId: group.groupId })));
    });
    socket.emit('group-message-history', groupMessageHistory);
  });

  socket.on('private-message', ({ to, message, file }) => {
    const fromUser = users.get(socket.id);
    if (!fromUser) return;

    const toUser = Array.from(users.values()).find(user => user.username === to);
    if (!toUser) {
      socket.emit('error', 'Người dùng không tồn tại');
      return;
    }

    const messageData = { from: fromUser.username, message, file, to: toUser.username };
    const messageKey = `${fromUser.username}:${toUser.username}`;
    const reverseKey = `${toUser.username}:${fromUser.username}`;

    let messageArray = privateMessages.get(messageKey) || privateMessages.get(reverseKey);
    if (!messageArray) {
      messageArray = [];
      privateMessages.set(messageKey, messageArray);
    }
    messageArray.push(messageData);

    toUser.socket.emit('private-message', messageData);
    socket.emit('private-message', messageData);
  });

  socket.on('group-message', ({ groupId, message, file }) => {
    const fromUser = users.get(socket.id);
    if (!fromUser) return;

    if (!groups.has(groupId)) {
      socket.emit('error', 'Nhóm không tồn tại');
      return;
    }

    const messageData = { from: fromUser.username, message, file, groupId };
    
    if (!groupMessages.has(groupId)) {
      groupMessages.set(groupId, []);
    }
    groupMessages.get(groupId).push(messageData);

    chatNamespace.to(groupId).emit('group-message', messageData);
  });

  socket.on('request-user-status', ({ username, friend }) => {
    const user = Array.from(users.values()).find(u => u.username === username);
    const friendUser = Array.from(users.values()).find(u => u.username === friend);

    if (user) {
      chatNamespace.emit('user-status', { username: user.username, online: true });
    }
    if (friendUser) {
      chatNamespace.emit('user-status', { username: friendUser.username, online: true });
    }
  });

  socket.on('join-group', ({ groupId, groupName, username }) => {
    if (!groups.has(groupId)) {
      groups.set(groupId, { groupId, groupName, members: [] });
    }
    const group = groups.get(groupId);
    if (!group.members.includes(username)) {
      group.members.push(username);
    }
    socket.join(groupId);
    console.log(`User ${username} joined group ${groupId}`);

    // Gửi lịch sử tin nhắn nhóm cho người dùng mới
    const messages = groupMessages.get(groupId) || [];
    socket.emit('group-message-history', messages.map(msg => ({ ...msg, groupId })));
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      chatNamespace.emit('user-status', { username: user.username, online: false });
      users.delete(socket.id);
      console.log(`User ${user.username} disconnected`);
    }
  });
});

const apiNamespace = io.of('/api');

apiNamespace.on('connection', (socket) => {
  console.log('API server connected to Socket.IO server:', socket.id);

  socket.on('friend-request', ({ from, to }) => {
    console.log(`Friend request from ${from} to ${to}`);
    const toUser = Array.from(users.values()).find(user => user.username === to);
    if (toUser) {
      console.log(`Sending friend request to ${toUser.username}`);
      toUser.socket.emit('friend-request', { from });
    } else {
      console.log(`User ${to} not found or not online`);
    }
  });

  socket.on('friend-accepted', ({ from, to }) => {
    console.log(`Friend accepted: ${from} and ${to} are now friends`);
    const fromUser = Array.from(users.values()).find(user => user.username === from);
    const toUser = Array.from(users.values()).find(user => user.username === to);

    if (fromUser) {
      fromUser.socket.emit('friend-accepted', { friend: to });
    }
    if (toUser) {
      toUser.socket.emit('friend-accepted', { friend: from });
    }

    if (fromUser) {
      chatNamespace.emit('user-status', { username: fromUser.username, online: true });
    }
    if (toUser) {
      chatNamespace.emit('user-status', { username: toUser.username, online: true });
    }
  });

  socket.on('group-invite', ({ groupId, groupName, from, to }) => {
    const toUser = Array.from(users.values()).find(user => user.username === to);
    if (toUser) {
      toUser.socket.emit('group-invite', { groupId, groupName, from });
    }
  });

  socket.on('group-created', ({ groupId, groupName, username }) => {
    if (!groups.has(groupId)) {
      groups.set(groupId, { groupId, groupName, members: [] });
    }
    const group = groups.get(groupId);
    if (!group.members.includes(username)) {
      group.members.push(username);
    }
    const user = Array.from(users.values()).find(u => u.username === username);
    if (user) {
      user.socket.join(groupId);
      console.log(`User ${username} joined group ${groupId} upon creation`);
    }
  });

  socket.on('user-status', ({ username, online }) => {
    chatNamespace.emit('user-status', { username, online });
  });

  socket.on('group-member-update', ({ groupId, fullName, action }) => {
    const message = action === 'joined' 
      ? `${fullName} đã tham gia nhóm` 
      : `${fullName} đã rời nhóm`;

    // Lưu tin nhắn hệ thống vào groupMessages
    if (!groupMessages.has(groupId)) {
      groupMessages.set(groupId, []);
    }
    groupMessages.get(groupId).push({ message, type: 'system', groupId });

    // Gửi tin nhắn hệ thống tới tất cả thành viên trong nhóm
    chatNamespace.to(groupId).emit('group-member-update', { groupId, fullName, action });
  });

  socket.on('group-deleted', ({ groupId }) => {
    groups.delete(groupId);
    groupMessages.delete(groupId);
    chatNamespace.to(groupId).emit('group-deleted', { groupId });
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});