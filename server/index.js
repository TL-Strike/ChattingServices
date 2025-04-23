const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Lưu trữ người dùng, nhóm và lời mời kết bạn
const users = {}; // { socket.id: { username, phoneNumber, friends: [], online: true } }
const groups = {}; // { groupName: { creator: socket.id, members: [socket.id], invited: [] } }
const pendingFriendRequests = {}; // { recipientSocketId: [senderSocketId] }

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Đăng ký người dùng
  socket.on('register-user', ({ username, phoneNumber }) => {
    users[socket.id] = { username, phoneNumber, friends: [], online: true };
    console.log('Registered user:', users[socket.id]);
    io.emit('user-list', Object.values(users).map((user) => ({
      username: user.username,
      phoneNumber: user.phoneNumber,
      online: user.online,
    })));
    emitGroupList(socket);
  });

  // Gửi lời mời kết bạn
  socket.on('send-friend-request', (toUsername) => {
    const recipientSocketId = Object.keys(users).find(
      (key) => users[key].username === toUsername
    );
    if (recipientSocketId) {
      if (pendingFriendRequests[recipientSocketId]?.includes(socket.id)) {
        socket.emit('error', 'Bạn đã gửi lời mời kết bạn rồi');
        return;
      }
      pendingFriendRequests[recipientSocketId] = pendingFriendRequests[recipientSocketId] || [];
      pendingFriendRequests[recipientSocketId].push(socket.id);
      io.to(recipientSocketId).emit('friend-request', {
        from: users[socket.id].username,
      });
    } else {
      socket.emit('error', 'Người dùng không tồn tại');
    }
  });

  // Chấp nhận lời mời kết bạn
  socket.on('accept-friend-request', (fromUsername) => {
    const senderSocketId = Object.keys(users).find(
      (key) => users[key].username === fromUsername
    );
    if (senderSocketId) {
      users[socket.id].friends.push(fromUsername);
      users[senderSocketId].friends.push(users[socket.id].username);
      io.to(senderSocketId).emit('friend-added', users[socket.id].username);
      socket.emit('friend-added', fromUsername);
      pendingFriendRequests[socket.id] = pendingFriendRequests[socket.id]?.filter(
        (id) => id !== senderSocketId
      );
    }
  });

  // Từ chối lời mời kết bạn
  socket.on('reject-friend-request', (fromUsername) => {
    const senderSocketId = Object.keys(users).find(
      (key) => users[key].username === fromUsername
    );
    if (senderSocketId) {
      pendingFriendRequests[socket.id] = pendingFriendRequests[socket.id]?.filter(
        (id) => id !== senderSocketId
      );
      socket.emit('friend-request-rejected', fromUsername);
    }
  });

  // Mời thành viên vào nhóm
  socket.on('invite-to-group', ({ groupName, username }) => {
    if (groups[groupName] && groups[groupName].members.includes(socket.id)) {
      const recipientSocketId = Object.keys(users).find(
        (key) => users[key].username === username
      );
      if (!users[socket.id].friends.includes(username)) {
        socket.emit('error', 'Chỉ có thể mời bạn bè');
        return;
      }
      if (recipientSocketId && !groups[groupName].members.includes(recipientSocketId)) {
        if (groups[groupName].invited?.includes(recipientSocketId)) {
          socket.emit('error', 'Bạn đã gửi lời mời vào nhóm rồi');
          return;
        }
        groups[groupName].invited = groups[groupName].invited || [];
        groups[groupName].invited.push(recipientSocketId);
        io.to(recipientSocketId).emit('group-invite', {
          groupName,
          from: users[socket.id].username,
        });
      } else {
        socket.emit('error', 'Không thể mời: Người dùng đã trong nhóm hoặc không tồn tại');
      }
    } else {
      socket.emit('error', 'Bạn không phải thành viên của nhóm');
    }
  });

  // Chấp nhận lời mời nhóm
  socket.on('accept-group-invite', (groupName) => {
    if (groups[groupName] && groups[groupName].invited?.includes(socket.id)) {
      groups[groupName].members.push(socket.id);
      groups[groupName].invited = groups[groupName].invited.filter((id) => id !== socket.id);
      socket.join(groupName);
      io.to(groupName).emit('group-message', {
        from: 'Hệ thống',
        message: `${users[socket.id].username} đã tham gia nhóm`,
        group: groupName,
      });
      emitGroupList(socket);
    }
  });

  // Từ chối lời mời nhóm
  socket.on('reject-group-invite', (groupName) => {
    if (groups[groupName] && groups[groupName].invited?.includes(socket.id)) {
      groups[groupName].invited = groups[groupName].invited.filter((id) => id !== socket.id);
      socket.emit('group-invite-rejected', groupName);
    }
  });

  // Tạo nhóm
  socket.on('create-group', (groupName) => {
    if (!groups[groupName]) {
      groups[groupName] = { creator: socket.id, members: [socket.id], invited: [] };
      socket.join(groupName);
      emitGroupList(socket);
      socket.emit('group-created', groupName);
    } else {
      socket.emit('error', 'Tên nhóm đã tồn tại');
    }
  });

  // Tham gia nhóm
  socket.on('join-group', (groupName) => {
    if (groups[groupName] && groups[groupName].members.includes(socket.id)) {
      socket.join(groupName);
      socket.emit('group-joined', groupName);
    } else {
      socket.emit('error', 'Bạn không phải thành viên nhóm');
    }
  });

  // Rời nhóm
  socket.on('leave-group', (groupName) => {
    if (groups[groupName] && groups[groupName].members.includes(socket.id)) {
      if (socket.id === groups[groupName].creator) {
        // Người tạo nhóm rời -> giải tán nhóm
        const membersToNotify = [...groups[groupName].members]; // Sao chép danh sách thành viên trước khi xóa
        io.to(groupName).emit('group-message', {
          from: 'Hệ thống',
          message: `Nhóm ${groupName} đã bị giải tán bởi người tạo`,
          group: groupName,
        });
        io.to(groupName).emit('group-deleted', groupName);
        membersToNotify.forEach((memberId) => {
          const memberSocket = io.sockets.sockets.get(memberId);
          if (memberSocket) {
            memberSocket.leave(groupName);
          }
        });
        delete groups[groupName]; // Xóa nhóm sau khi gửi thông báo
        membersToNotify.forEach((memberId) => {
          const memberSocket = io.sockets.sockets.get(memberId);
          if (memberSocket) {
            emitGroupList(memberSocket); // Gửi danh sách nhóm mới sau khi xóa
          }
        });
      } else {
        // Thành viên thường rời nhóm
        groups[groupName].members = groups[groupName].members.filter(
          (id) => id !== socket.id
        );
        socket.leave(groupName);
        io.to(groupName).emit('group-message', {
          from: 'Hệ thống',
          message: `${users[socket.id].username} đã rời nhóm`,
          group: groupName,
        });
        socket.emit('group-left', groupName);
        emitGroupList(socket);
      }
    }
  });

  // Xóa nhóm
  socket.on('delete-group', (groupName) => {
    if (groups[groupName] && groups[groupName].creator === socket.id) {
      const membersToNotify = [...groups[groupName].members]; // Sao chép danh sách thành viên trước khi xóa
      io.to(groupName).emit('group-message', {
        from: 'Hệ thống',
        message: `Nhóm ${groupName} đã bị xóa bởi người tạo`,
        group: groupName,
      });
      io.to(groupName).emit('group-deleted', groupName);
      membersToNotify.forEach((memberId) => {
        const memberSocket = io.sockets.sockets.get(memberId);
        if (memberSocket) {
          memberSocket.leave(groupName);
        }
      });
      delete groups[groupName]; // Xóa nhóm sau khi gửi thông báo
      membersToNotify.forEach((memberId) => {
        const memberSocket = io.sockets.sockets.get(memberId);
        if (memberSocket) {
          emitGroupList(memberSocket); // Gửi danh sách nhóm mới sau khi xóa
        }
      });
    } else {
      socket.emit('error', 'Chỉ người tạo nhóm mới được xóa nhóm');
    }
  });

  // Tin nhắn 1:1
  socket.on('private-message', ({ to, message }) => {
    const recipientSocketId = Object.keys(users).find(
      (key) => users[key].username === to
    );
    if (recipientSocketId && users[socket.id].friends.includes(to)) {
      io.to(recipientSocketId).emit('private-message', {
        from: users[socket.id].username,
        message,
      });
      socket.emit('private-message', {
        from: users[socket.id].username,
        message,
        to,
      });
    }
  });

  // Tin nhắn nhóm
  socket.on('group-message', ({ group, message }) => {
    if (groups[group] && groups[group].members.includes(socket.id)) {
      io.to(group).emit('group-message', {
        from: users[socket.id].username,
        message,
        group,
      });
    }
  });

  // Ngắt kết nối
  socket.on('disconnect', () => {
    const username = users[socket.id]?.username;
    if (users[socket.id]) {
      users[socket.id].online = false;
    }
    io.emit('user-list', Object.values(users).map((user) => ({
      username: user.username,
      phoneNumber: user.phoneNumber,
      online: user.online,
    })));
    Object.keys(pendingFriendRequests).forEach((recipientId) => {
      pendingFriendRequests[recipientId] = pendingFriendRequests[recipientId]?.filter(
        (id) => id !== socket.id
      );
    });
    Object.keys(groups).forEach((groupName) => {
      groups[groupName].members = groups[groupName].members.filter(
        (id) => id !== socket.id
      );
      groups[groupName].invited = groups[groupName].invited?.filter(
        (id) => id !== socket.id
      );
      if (groups[groupName].creator === socket.id) {
        const membersToNotify = [...groups[groupName].members];
        io.to(groupName).emit('group-message', {
          from: 'Hệ thống',
          message: `Nhóm ${groupName} đã bị giải tán vì người tạo rời khỏi`,
          group: groupName,
        });
        io.to(groupName).emit('group-deleted', groupName);
        membersToNotify.forEach((memberId) => {
          const memberSocket = io.sockets.sockets.get(memberId);
          if (memberSocket) {
            memberSocket.leave(groupName);
          }
        });
        delete groups[groupName];
        membersToNotify.forEach((memberId) => {
          const memberSocket = io.sockets.sockets.get(memberId);
          if (memberSocket) {
            emitGroupList(memberSocket);
          }
        });
      } else {
        groups[groupName].members.forEach((memberId) => {
          const memberSocket = io.sockets.sockets.get(memberId);
          if (memberSocket) {
            emitGroupList(memberSocket);
          }
        });
      }
    });
    delete users[socket.id];
    console.log('User disconnected:', socket.id);
  });

  // Hàm gửi danh sách nhóm cho socket cụ thể
  function emitGroupList(socket) {
    if (socket) {
      const userGroups = Object.keys(groups)
        .filter((groupName) => groups[groupName].members.includes(socket.id))
        .map((groupName) => ({
          name: groupName,
          creator: groups[groupName].creator,
          creatorUsername: users[groups[groupName].creator]?.username || 'Unknown',
        }));
      socket.emit('group-list', userGroups);
    }
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));