// Thêm: Xử lý sự kiện group-created từ api-server
  socket.on('group-created', ({ groupName, username }) => {
    if (!groups.has(groupName)) {
      groups.set(groupName, { name: groupName, members: [] });
    }
    const group = groups.get(groupName);
    if (!group.members.includes(username)) {
      group.members.push(username);
    }
    const user = Array.from(users.values()).find(u => u.username === username);
    if (user) {
      user.socket.join(groupName);
      console.log(`User ${username} joined group ${groupName} upon creation`);
    }
  });