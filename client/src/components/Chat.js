import React, { Component } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import '../styles/Chat.scss';

class Chat extends Component {
  state = {
    message: '',
    messages: {},
    users: [],
    groups: [],
    selectedRecipient: '',
    selectedType: '',
    groupNameInput: '',
    searchInput: '',
    searchSuggestions: [],
    friendRequests: [],
    friends: [],
    groupInvites: [],
    groupSearchInput: '',
    groupSearchSuggestions: [],
    creatorGroups: [],
    showGroupInviteForm: false,
    showGroupInput: false,
    notification: '',
    confirmAction: null,
    removedGroups: [],
    selectedFile: null,
  };

  socket = null;
  messagesEndRef = React.createRef();

  async componentDidMount() {
    const token = sessionStorage.getItem('token');
    if (!token) {
      this.setState({ notification: 'Bạn cần đăng nhập để tiếp tục' });
      return;
    }

    this.socket = io('http://localhost:5000/chat', {
      auth: { token },
    });

    try {
      const groupsResponse = await axios.get('http://localhost:5001/groups', {
        headers: { Authorization: `Bearer ${token}` },
      });
      this.socket.emit('join', {
        userId: this.props.userId,
        username: this.props.username,
        groups: groupsResponse.data,
      });

      this.registerSocketListeners();
      window.addEventListener('beforeunload', this.handleBeforeUnload);
      await this.fetchUsers();
      await this.fetchGroups();
      await this.fetchFriends();
      await this.fetchFriendRequests();
      await this.fetchGroupInvites();
    } catch (err) {
      this.showNotification('Không thể tải dữ liệu: ' + (err.response?.data?.error || err.message));
    }
  }

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    this.handleDisconnect();
  }

  handleBeforeUnload = () => {
    this.handleDisconnect();
  };

  handleDisconnect = () => {
    if (this.socket) {
      this.socket.disconnect();
    }
  };

  showNotification = (message) => {
    this.setState({ notification: message }, () => {
      setTimeout(() => this.setState({ notification: '' }), 3000);
    });
  };

  registerSocketListeners = () => {
    this.socket.on('user-status', async ({ username, online }) => {
      this.setState((prevState) => ({
        users: prevState.users.map(user =>
          user.username === username ? { ...user, online } : user
        ),
      }));
      await this.fetchUsers();
    });

    this.socket.on('new-user', (newUser) => {
      this.setState((prevState) => {
        const userExists = prevState.users.some(user => user.username === newUser.username);
        if (userExists) return prevState;
        return {
          users: [...prevState.users, { ...newUser, online: false }],
        };
      });
    });

    this.socket.on('friend-request', ({ from }) => {
      this.setState((prevState) => {
        if (prevState.friendRequests.includes(from)) return prevState;
        return {
          friendRequests: [...prevState.friendRequests, from],
        };
      });
    });

    this.socket.on('friend-accepted', async ({ friend }) => {
      this.setState((prevState) => {
        if (prevState.friends.includes(friend)) return prevState;
        return {
          friends: [...prevState.friends, friend],
        };
      });
      await this.fetchFriends();
      await this.fetchUsers();
      this.socket.emit('request-user-status', { username: this.props.username, friend });
    });

    this.socket.on('group-invite', ({ groupId, groupName, from }) => {
      this.setState((prevState) => {
        const inviteExists = prevState.groupInvites.some(invite => invite.groupId === groupId && invite.from === from);
        if (inviteExists) return prevState;
        return {
          groupInvites: [...prevState.groupInvites, { groupId, groupName, from }],
        };
      });
    });

    this.socket.on('private-message', ({ from, message, to, file }) => {
      const recipient = from === this.props.username ? to : from;
      this.setState(
        (prevState) => ({
          messages: {
            ...prevState.messages,
            [recipient]: [
              ...(prevState.messages[recipient] || []),
              { from, message, file, type: 'private' },
            ],
          },
        }),
        () => this.scrollToBottom()
      );
    });

    this.socket.on('group-message', ({ from, message, groupId, file }) => {
      this.setState(
        (prevState) => ({
          messages: {
            ...prevState.messages,
            [groupId]: [
              ...(prevState.messages[groupId] || []),
              { from, message, file, type: 'group', groupId },
            ],
          },
        }),
        () => this.scrollToBottom()
      );
    });

    this.socket.on('group-member-update', ({ groupId, fullName, action }) => {
      const message = action === 'joined' 
        ? `${fullName} đã tham gia nhóm` 
        : `${fullName} đã rời nhóm`;
      this.setState(
        (prevState) => ({
          messages: {
            ...prevState.messages,
            [groupId]: [
              ...(prevState.messages[groupId] || []),
              { message, type: 'system', groupId },
            ],
          },
        }),
        () => this.scrollToBottom()
      );

      if (action === 'left' && fullName === this.props.fullName) {
        this.setState(
          (prevState) => {
            const { [groupId]: _, ...restMessages } = prevState.messages;
            return {
              messages: restMessages,
              groups: prevState.groups.filter(group => group.groupId !== groupId),
              selectedRecipient: prevState.selectedRecipient === groupId ? '' : prevState.selectedRecipient,
              selectedType: prevState.selectedRecipient === groupId ? '' : prevState.selectedType,
              removedGroups: [...prevState.removedGroups, groupId],
            };
          },
          () => this.showNotification('Bạn đã rời nhóm')
        );
      }
    });

    this.socket.on('group-deleted', ({ groupId }) => {
      this.setState(
        (prevState) => {
          const { [groupId]: _, ...restMessages } = prevState.messages;
          return {
            messages: restMessages,
            groups: prevState.groups.filter(group => group.groupId !== groupId),
            creatorGroups: prevState.creatorGroups.filter(g => g !== groupId),
            selectedRecipient: prevState.selectedRecipient === groupId ? '' : prevState.selectedRecipient,
            selectedType: prevState.selectedRecipient === groupId ? '' : prevState.selectedType,
            groupInvites: prevState.groupInvites.filter(invite => invite.groupId !== groupId),
            removedGroups: [...prevState.removedGroups, groupId],
          };
        },
        () => this.showNotification('Nhóm đã bị xóa bởi người tạo')
      );
    });

    this.socket.on('error', (message) => {
      this.showNotification(message);
    });
  };

  scrollToBottom = () => {
    const messagesDiv = this.messagesEndRef.current;
    if (messagesDiv) {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  };

  fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5001/users', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      this.setState({ users: response.data });
    } catch (err) {
      this.showNotification('Không thể tải danh sách người dùng: ' + (err.response?.data?.error || err.message));
    }
  };

  fetchGroups = async () => {
    try {
      const response = await axios.get('http://localhost:5001/groups', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      const groups = response.data;
      const creatorGroups = groups
        .filter((group) => group.creator === this.props.userId)
        .map((group) => group.groupId);
      this.setState({ groups, creatorGroups });
    } catch (err) {
      this.showNotification('Không thể tải danh sách nhóm: ' + (err.response?.data?.error || err.message));
    }
  };

  fetchFriends = async () => {
    try {
      const response = await axios.get('http://localhost:5001/friends', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      this.setState({ friends: response.data });
    } catch (err) {
      this.showNotification('Không thể tải danh sách bạn bè: ' + (err.response?.data?.error || err.message));
    }
  };

  fetchFriendRequests = async () => {
    try {
      const response = await axios.get('http://localhost:5001/friend-requests', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      this.setState({ friendRequests: response.data });
    } catch (err) {
      this.showNotification('Không thể tải danh sách lời mời kết bạn: ' + (err.response?.data?.error || err.message));
    }
  };

  fetchGroupInvites = async () => {
    try {
      const response = await axios.get('http://localhost:5001/group-invites', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      this.setState({ groupInvites: response.data });
    } catch (err) {
      this.showNotification('Không thể tải danh sách lời mời tham gia nhóm: ' + (err.response?.data?.error || err.message));
    }
  };

  handleSendMessage = (e) => {
    e.preventDefault();
    const { message, selectedRecipient, selectedType } = this.state;
    if (message.trim() && selectedRecipient) {
      if (selectedType === 'group') {
        this.socket.emit('group-message', { groupId: selectedRecipient, message });
      } else if (selectedType === 'private') {
        this.socket.emit('private-message', { to: selectedRecipient, message });
      }
      this.setState({ message: '' });
    }
  };

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSendMessage(e);
    }
  };

  handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'mp4', 'pdf', 'doc', 'docx', 'xlsx'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      this.showNotification('Định dạng file không được hỗ trợ. Chỉ hỗ trợ: ' + allowedExtensions.join(', '));
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.showNotification('Kích thước file vượt quá 10MB. Vui lòng chọn file nhỏ hơn.');
      return;
    }

    this.setState({ selectedFile: file });
    this.handleSendFile(file);
  };

  handleSendFile = async (file) => {
    const { selectedRecipient, selectedType } = this.state;
    if (!selectedRecipient) {
      this.showNotification('Vui lòng chọn người nhận hoặc nhóm để gửi file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const fileData = reader.result;
      const fileName = file.name;

      try {
        const response = await axios.post(
          'http://localhost:5001/upload-file',
          { fileData, fileName },
          { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } }
        );

        const fileUrl = response.data.fileUrl;

        if (selectedType === 'group') {
          this.socket.emit('group-message', { groupId: selectedRecipient, message: '', file: { url: fileUrl, name: fileName } });
        } else if (selectedType === 'private') {
          this.socket.emit('private-message', { to: selectedRecipient, message: '', file: { url: fileUrl, name: fileName } });
        }

        this.setState({ selectedFile: null });
      } catch (err) {
        this.showNotification('Không thể gửi file: ' + (err.response?.data?.error || err.message));
      }
    };
    reader.readAsDataURL(file);
  };

  handleSearchInputChange = async (e) => {
    const query = e.target.value;
    this.setState({ searchInput: query });

    if (query.trim()) {
      try {
        const response = await axios.get(`http://localhost:5001/users/search?query=${query}`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        });
        this.setState({ searchSuggestions: response.data });
      } catch (err) {
        this.showNotification('Không thể tìm kiếm người dùng: ' + (err.response?.data?.error || err.message));
      }
    } else {
      this.setState({ searchSuggestions: [] });
    }
  };

  handleGroupSearchInputChange = (e) => {
    const query = e.target.value;
    const { friends, users } = this.state;
    this.setState({ groupSearchInput: query });

    if (query.trim()) {
      const friendDetails = users.filter((user) => friends.includes(user.username));
      const suggestions = friendDetails.filter(
        (friend) =>
          friend.username.toLowerCase().includes(query.toLowerCase()) ||
          friend.fullName.toLowerCase().includes(query.toLowerCase()) ||
          friend.phoneNumber.includes(query)
      );
      this.setState({ groupSearchSuggestions: suggestions });
    } else {
      this.setState({ groupSearchSuggestions: [] });
    }
  };

  handleSendFriendRequest = async (username) => {
    try {
      await axios.post(
        'http://localhost:5001/friend-request',
        { toUsername: username },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } }
      );
      this.setState({ searchInput: '', searchSuggestions: [] });
    } catch (err) {
      this.showNotification(err.response?.data?.error || 'Không thể gửi lời mời kết bạn');
    }
  };

  handleAcceptFriendRequest = async (from) => {
    try {
      await axios.post(
        'http://localhost:5001/friend-request/accept',
        { fromUsername: from },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } }
      );
      this.setState((prevState) => ({
        friendRequests: prevState.friendRequests.filter((req) => req !== from),
        friends: [...prevState.friends, from],
      }));
      this.socket.emit('request-user-status', { username: this.props.username, friend: from });
    } catch (err) {
      this.showNotification('Không thể chấp nhận lời mời: ' + (err.response?.data?.error || err.message));
    }
  };

  handleRejectFriendRequest = async (from) => {
    try {
      await axios.post(
        'http://localhost:5001/friend-request/reject',
        { fromUsername: from },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } }
      );
      this.setState((prevState) => ({
        friendRequests: prevState.friendRequests.filter((req) => req !== from),
      }));
    } catch (err) {
      this.showNotification('Không thể từ chối lời mời: ' + (err.response?.data?.error || err.message));
    }
  };

  handleInviteToGroup = async (username, groupId) => {
    try {
      await axios.post(
        'http://localhost:5001/groups/invite',
        { groupId, username },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } }
      );
      const recipient = this.state.users.find(user => user.username === username);
      const recipientName = recipient ? recipient.fullName : username;
      this.setState({ groupSearchInput: '', groupSearchSuggestions: [] });
      this.showNotification(`Đã gửi lời mời vào nhóm cho ${recipientName}`);
    } catch (err) {
      this.showNotification(err.response?.data?.error || 'Không thể gửi lời mời vào nhóm');
    }
  };

  handleAcceptGroupInvite = async (groupId, groupName) => {
    try {
      await axios.post(
        'http://localhost:5001/groups/invite/accept',
        { groupId },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } }
      );
      this.setState((prevState) => ({
        groupInvites: prevState.groupInvites.filter((invite) => invite.groupId !== groupId),
      }));

      await this.fetchGroups();
      this.handleJoinGroup(groupId, groupName);
      this.showNotification(`Đã tham gia nhóm ${groupName} thành công`);
    } catch (err) {
      this.showNotification('Không thể chấp nhận lời mời: ' + (err.response?.data?.error || err.message));
    }
  };

  handleRejectGroupInvite = async (groupId) => {
    try {
      await axios.post(
        'http://localhost:5001/groups/invite/reject',
        { groupId },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } }
      );
      this.setState((prevState) => ({
        groupInvites: prevState.groupInvites.filter((invite) => invite.groupId !== groupId),
      }));
    } catch (err) {
      this.showNotification('Không thể từ chối lời mời: ' + (err.response?.data?.error || err.message));
    }
  };

  handleCreateGroup = async () => {
    const { groupNameInput } = this.state;
    if (groupNameInput.trim()) {
      try {
        const response = await axios.post(
          'http://localhost:5001/groups',
          { groupName: groupNameInput },
          { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } }
        );
        const { groupId, groupName } = response.data;
        this.setState({ groupNameInput: '', showGroupInput: false });

        await this.fetchGroups();
        this.handleJoinGroup(groupId, groupName);
        this.showNotification(`Đã tạo nhóm ${groupName} thành công`);
      } catch (err) {
        this.showNotification(err.response?.data?.error || 'Không thể tạo nhóm');
      }
    }
  };

  handleJoinGroup = async (groupId, groupName) => {
    this.setState({
      selectedRecipient: groupId,
      selectedType: 'group',
      showGroupInviteForm: false,
    });

    this.socket.emit('join-group', { groupId, groupName, username: this.props.username });

    try {
      await axios.post(
        'http://localhost:5001/groups/join',
        { groupId },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } }
      );
    } catch (err) {
      if (err.response?.data?.error !== 'Bạn đã ở trong nhóm') {
        this.showNotification(err.response?.data?.error || 'Không thể tham gia nhóm');
      }
    }
  };

  handleLeaveGroup = () => {
    this.setState((prevState) => ({
      confirmAction: { type: 'leave', groupId: prevState.selectedRecipient },
    }));
  };

  handleDeleteGroup = () => {
    this.setState((prevState) => ({
      confirmAction: { type: 'delete', groupId: prevState.selectedRecipient },
    }));
  };

  handleLogoutClick = () => {
    this.setState({ confirmAction: { type: 'logout' } });
  };

  handleConfirmAction = async (confirm) => {
    const { confirmAction } = this.state;
    if (confirm && confirmAction) {
      try {
        if (confirmAction.type === 'leave') {
          await axios.post(
            'http://localhost:5001/groups/leave',
            { groupId: confirmAction.groupId },
            { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } }
          );
        } else if (confirmAction.type === 'delete') {
          await axios.delete(
            `http://localhost:5001/groups/${confirmAction.groupId}`,
            { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } }
          );
        } else if (confirmAction.type === 'logout') {
          await axios.post(
            'http://localhost:5001/logout',
            {},
            { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } }
          );
          this.handleDisconnect();
          sessionStorage.removeItem('token');
          window.location.href = '/login';
        }
      } catch (err) {
        this.showNotification(err.response?.data?.error || 'Hành động thất bại');
      }
    }
    this.setState({ confirmAction: null });
  };

  toggleGroupInviteForm = () => {
    this.setState((prevState) => ({
      showGroupInviteForm: !prevState.showGroupInviteForm,
      groupSearchInput: '',
      groupSearchSuggestions: [],
    }));
  };

  toggleGroupInput = () => {
    this.setState((prevState) => ({
      showGroupInput: !prevState.showGroupInput,
    }));
  };

  render() {
    const {
      message,
      messages,
      users,
      groups,
      selectedRecipient,
      selectedType,
      groupNameInput,
      searchInput,
      searchSuggestions,
      friendRequests,
      friends,
      groupInvites,
      groupSearchInput,
      groupSearchSuggestions,
      creatorGroups,
      showGroupInviteForm,
      showGroupInput,
      notification,
      confirmAction,
    } = this.state;

    const isCreator = selectedType === 'group' && creatorGroups.includes(selectedRecipient);

    return (
      <div className="chat-container">
        <button className="logout-button" onClick={this.handleLogoutClick}>
          Đăng xuất
        </button>
        {notification && <div className="notification">{notification}</div>}
        {confirmAction && (
          <div className="confirm-dialog">
            <p>
              {confirmAction.type === 'logout'
                ? 'Bạn có chắc chắn muốn đăng xuất?'
                : `Bạn có chắc chắn muốn ${confirmAction.type === 'leave' ? 'rời nhóm' : 'xóa nhóm'} "${
                    groups.find(group => group.groupId === confirmAction.groupId)?.groupName || 'Nhóm'
                  }"`}
            </p>
            <button className="confirm-button" onClick={() => this.handleConfirmAction(true)}>
              Đồng ý
            </button>
            <button className="cancel-button" onClick={() => this.handleConfirmAction(false)}>
              Hủy
            </button>
          </div>
        )}
        <div className="sidebar">
          <h2 className="sidebar-header">TRÒ CHUYỆN</h2>
          <p className="user-fullname">{this.props.fullName}</p>
          <div className="search-section">
            <h4>Tìm Kiếm Liên Hệ Mới</h4>
            <input
              type="text"
              placeholder="Tìm bằng tên hoặc số điện thoại"
              value={searchInput}
              onChange={this.handleSearchInputChange}
            />
          </div>
          {searchSuggestions.length > 0 && (
            <ul className="suggestions-list">
              {searchSuggestions.map((user, index) => (
                <li key={index}>
                  {user.fullName}
                  {friends.includes(user.username) ? (
                    <span className="friend-label">Bạn bè</span>
                  ) : (
                    <button onClick={() => this.handleSendFriendRequest(user.username)}>
                      Kết bạn
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <button className="create-group-button" onClick={this.toggleGroupInput}>
            Tạo nhóm
          </button>
          {showGroupInput && (
            <input
              type="text"
              placeholder="Tên nhóm mới"
              value={groupNameInput}
              onChange={(e) => this.setState({ groupNameInput: e.target.value })}
              className="group-name-input"
            />
          )}
          {showGroupInput && (
            <button className="submit-group-button" onClick={this.handleCreateGroup}>
              Xác nhận
            </button>
          )}
          {searchInput && searchSuggestions.length === 0 && (
            <p className="search-result no-result">Không tìm thấy người dùng</p>
          )}
          <h3>Lời mời kết bạn</h3>
          <ul>
            {friendRequests.map((from, index) => {
              const requester = users.find(user => user.username === from);
              return (
                <li key={index}>
                  {requester ? requester.fullName : from}
                  <button
                    className="accept-button"
                    onClick={() => this.handleAcceptFriendRequest(from)}
                    title="Chấp nhận"
                  >
                    ✔
                  </button>
                  <button
                    className="reject-button"
                    onClick={() => this.handleRejectFriendRequest(from)}
                    title="Từ chối"
                  >
                    ✘
                  </button>
                </li>
              );
            })}
          </ul>
          <h3>Lời mời tham gia nhóm</h3>
          <ul>
            {groupInvites.map((invite, index) => {
              const inviter = users.find(user => user.username === invite.from);
              return (
                <li key={index}>
                  {inviter ? inviter.fullName : invite.from} mời bạn vào {invite.groupName}
                  <button
                    className="accept-button"
                    onClick={() => this.handleAcceptGroupInvite(invite.groupId, invite.groupName)}
                    title="Chấp nhận"
                  >
                    ✔
                  </button>
                  <button
                    className="reject-button"
                    onClick={() => this.handleRejectGroupInvite(invite.groupId)}
                    title="Từ chối"
                  >
                    ✘
                  </button>
                </li>
              );
            })}
          </ul>
          <h3>Bạn bè</h3>
          <ul>
            {users
              .filter((user) => friends.includes(user.username) && user.username !== this.props.username)
              .map((user) => (
                <li
                  key={user.username}
                  className={
                    selectedRecipient === user.username && selectedType === 'private' ? 'active' : ''
                  }
                  onClick={() =>
                    this.setState({
                      selectedRecipient: user.username,
                      selectedType: 'private',
                      showGroupInviteForm: false,
                    })
                  }
                >
                  <span
                    className="status-dot"
                    style={{ backgroundColor: user.online ? '#4CAF50' : '#B0BEC5' }}
                  ></span>
                  {user.fullName}
                </li>
              ))}
          </ul>
          <div className="group-section">
            <h3>Nhóm</h3>
            <ul>
              {groups.map((group) => (
                <li
                  key={group.groupId}
                  className={selectedRecipient === group.groupId && selectedType === 'group' ? 'active' : ''}
                  onClick={() => this.handleJoinGroup(group.groupId, group.groupName)}
                >
                  {group.groupName}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="chat-area">
          <h3>
            {selectedRecipient
              ? selectedType === 'group'
                ? `Nhóm: ${groups.find(group => group.groupId === selectedRecipient)?.groupName || ''}`
                : users.find(user => user.username === selectedRecipient)?.fullName || selectedRecipient
              : 'Chọn bạn hoặc nhóm để chat'}
          </h3>
          {selectedRecipient && selectedType === 'group' && (
            <div className="group-actions">
              <button className="add-member-button" onClick={this.toggleGroupInviteForm}>
                Thêm thành viên
              </button>
              <button className="leave-group-button" onClick={this.handleLeaveGroup}>
                Rời nhóm
              </button>
              {isCreator && (
                <button className="delete-group-button" onClick={this.handleDeleteGroup}>
                  Xóa nhóm
                </button>
              )}
            </div>
          )}
          {showGroupInviteForm && (
            <div className="group-invite-section">
              <h4>Mời bạn bè vào nhóm</h4>
              <input
                type="text"
                placeholder="Tìm bằng tên hoặc số điện thoại bạn bè"
                value={groupSearchInput}
                onChange={this.handleGroupSearchInputChange}
              />
              {groupSearchSuggestions.length > 0 && (
                <ul className="suggestions-list">
                  {groupSearchSuggestions.map((friend, index) => (
                    <li key={index}>
                      {friend.fullName} - {friend.phoneNumber}
                      <button
                        onClick={() => this.handleInviteToGroup(friend.username, selectedRecipient)}
                      >
                        Mời vào nhóm
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {groupSearchInput && groupSearchSuggestions.length === 0 && (
                <p className="search-result no-result">Không tìm thấy người dùng</p>
              )}
            </div>
          )}
          <div className="messages" ref={this.messagesEndRef}>
            {(messages[selectedRecipient] || []).map((msg, index) => {
              const sender = users.find(user => user.username === msg.from);
              if (msg.type === 'system') {
                return (
                  <div key={index} className="message-system">
                    {msg.message}
                  </div>
                );
              }

              const isImage = msg.file && ['png', 'jpg', 'jpeg', 'gif'].includes(msg.file.name.split('.').pop().toLowerCase());
              const isVideo = msg.file && msg.file.name.toLowerCase().endsWith('mp4');
              const isOtherFile = msg.file && ['pdf', 'doc', 'docx', 'xlsx'].includes(msg.file.name.split('.').pop().toLowerCase());
              const isSender = msg.from === this.props.username;

              return (
                <div
                  key={index}
                  className={`message ${isSender ? 'sent' : 'received'} ${isImage || isVideo ? 'media-message' : ''}`}
                >
                  {selectedType === 'group' && (
                    <strong className={isSender && (isImage || isVideo) ? 'sender-name' : ''}>
                      {sender ? sender.fullName : msg.from}: 
                    </strong>
                  )}
                  {msg.message && <div>{msg.message}</div>}
                  {isImage && (
                    <div className="media-container">
                      <img src={msg.file.url} alt={msg.file.name} className="media-file" />
                    </div>
                  )}
                  {isVideo && (
                    <div className="media-container">
                      <video controls className="media-file">
                        <source src={msg.file.url} type="video/mp4" />
                        Trình duyệt của bạn không hỗ trợ thẻ video.
                      </video>
                    </div>
                  )}
                  {isOtherFile && (
                    <div className="file-container">
                      <a href={msg.file.url} download={msg.file.name} className="file-link">
                        📎 {msg.file.name}
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="message-input">
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={message}
              onChange={(e) => this.setState({ message: e.target.value })}
              onKeyPress={this.handleKeyPress}
            />
            <label className="file-upload-button">
              <span>📎</span>
              <input
                type="file"
                onChange={this.handleFileChange}
                accept=".png,.jpg,.jpeg,.gif,.mp4,.pdf,.doc,.docx,.xlsx"
                style={{ display: 'none' }}
              />
            </label>
            <button onClick={this.handleSendMessage}>Gửi</button>
          </div>
        </div>
      </div>
    );
  }
}

export default Chat;