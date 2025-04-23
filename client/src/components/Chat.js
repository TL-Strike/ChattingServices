import React, { Component } from 'react';
import io from 'socket.io-client';
import '../styles/Chat.scss';

class Chat extends Component {
  state = {
    // message: Lưu trữ nội dung tin nhắn người dùng nhập vào ô input.
    // Kiểu dữ liệu: string
    // Ví dụ: "Xin chào bạn!"
    message: '',

    // messages: Lưu trữ danh sách tin nhắn theo recipient (người nhận hoặc nhóm).
    // Kiểu dữ liệu: object, với key là recipient (string) và value là mảng các tin nhắn (array of objects).
    // Mỗi tin nhắn có các thuộc tính: { from: string, message: string, type: string, group?: string }
    // Ví dụ: { "userA": [{ from: "userA", message: "Chào bạn", type: "private" }], "NhomHocTap": [{ from: "userB", message: "Chào nhóm", type: "group", group: "NhomHocTap" }] }
    messages: {},

    // users: Lưu trữ danh sách tất cả người dùng trong hệ thống.
    // Kiểu dữ liệu: array of objects, mỗi object có các thuộc tính: { username: string, phoneNumber: string, online: boolean }
    // Ví dụ: [{ username: "userA", phoneNumber: "0123456789", online: true }, { username: "userB", phoneNumber: "0987654321", online: false }]
    users: [],

    // groups: Lưu trữ danh sách các nhóm mà người dùng tham gia.
    // Kiểu dữ liệu: array of objects, mỗi object có các thuộc tính: { name: string, creator: string, creatorUsername: string }
    // Ví dụ: [{ name: "NhomHocTap", creator: "socketId1", creatorUsername: "userA" }, { name: "NhomChoiGame", creator: "socketId2", creatorUsername: "userB" }]
    groups: [],

    // selectedRecipient: Lưu trữ người nhận hoặc nhóm được chọn để trò chuyện.
    // Kiểu dữ liệu: string
    // Ví dụ: "userA" (khi trò chuyện riêng) hoặc "NhomHocTap" (khi trò chuyện nhóm)
    selectedRecipient: '',

    // selectedType: Xác định loại trò chuyện hiện tại (riêng tư hoặc nhóm).
    // Kiểu dữ liệu: string, chỉ nhận giá trị "private" hoặc "group"
    // Ví dụ: "private" hoặc "group"
    selectedType: '',

    // groupNameInput: Lưu trữ tên nhóm mà người dùng nhập khi tạo nhóm mới.
    // Kiểu dữ liệu: string
    // Ví dụ: "NhomHocTapMoi"
    groupNameInput: '',

    // searchInput: Lưu trữ giá trị người dùng nhập vào ô tìm kiếm để tìm liên hệ mới.
    // Kiểu dữ liệu: string
    // Ví dụ: "userA" hoặc "0123456789"
    searchInput: '',

    // searchSuggestions: Lưu trữ danh sách gợi ý tìm kiếm người dùng (dựa trên tên hoặc số điện thoại).
    // Kiểu dữ liệu: array of objects, mỗi object có các thuộc tính: { username: string, phoneNumber: string, online: boolean }
    // Ví dụ: [{ username: "userA", phoneNumber: "0123456789", online: true }]
    searchSuggestions: [],

    // friendRequests: Lưu trữ danh sách lời mời kết bạn mà người dùng nhận được.
    // Kiểu dữ liệu: array of strings, mỗi phần tử là tên người dùng (username) của người gửi lời mời.
    // Ví dụ: ["userA", "userB"]
    friendRequests: [],

    // friends: Lưu trữ danh sách bạn bè của người dùng.
    // Kiểu dữ liệu: array of strings, mỗi phần tử là tên người dùng (username) của bạn bè.
    // Ví dụ: ["userA", "userB"]
    friends: [],

    // groupInvites: Lưu trữ danh sách lời mời tham gia nhóm mà người dùng nhận được.
    // Kiểu dữ liệu: array of objects, mỗi object có các thuộc tính: { groupName: string, from: string }
    // Ví dụ: [{ groupName: "NhomHocTap", from: "userA" }, { groupName: "NhomChoiGame", from: "userB" }]
    groupInvites: [],

    // groupSearchInput: Lưu trữ giá trị người dùng nhập vào ô tìm kiếm để mời bạn bè vào nhóm.
    // Kiểu dữ liệu: string
    // Ví dụ: "userA" hoặc "0123456789"
    groupSearchInput: '',

    // groupSearchSuggestions: Lưu trữ danh sách gợi ý bạn bè khi tìm kiếm để mời vào nhóm.
    // Kiểu dữ liệu: array of objects, mỗi object có các thuộc tính: { username: string, phoneNumber: string }
    // Ví dụ: [{ username: "userA", phoneNumber: "0123456789" }]
    groupSearchSuggestions: [],

    // creatorGroups: Lưu trữ danh sách tên các nhóm mà người dùng là người tạo.
    // Kiểu dữ liệu: array of strings, mỗi phần tử là tên nhóm (groupName).
    // Ví dụ: ["NhomHocTap", "NhomChoiGame"]
    creatorGroups: [],

    // showGroupInviteForm: Điều khiển việc hiển thị/ẩn form mời bạn bè vào nhóm.
    // Kiểu dữ liệu: boolean
    // Ví dụ: true (hiển thị form) hoặc false (ẩn form)
    showGroupInviteForm: false,

    // showGroupInput: Điều khiển việc hiển thị/ẩn input để tạo nhóm mới.
    // Kiểu dữ liệu: boolean
    // Ví dụ: true (hiển thị input) hoặc false (ẩn input)
    showGroupInput: false,

    // notification: Lưu trữ thông báo lỗi hoặc thông tin từ server để hiển thị trên giao diện.
    // Kiểu dữ liệu: string
    // Ví dụ: "Người dùng không tồn tại"
    notification: '',

    // confirmAction: Lưu trữ thông tin hành động xác nhận (rời nhóm hoặc xóa nhóm).
    // Kiểu dữ liệu: object hoặc null, object có các thuộc tính: { type: string, groupName: string }
    // Ví dụ: { type: "leave", groupName: "NhomHocTap" } hoặc null (không có hành động xác nhận)
    confirmAction: null,

    // removedGroups: Lưu trữ danh sách tên các nhóm đã rời hoặc xóa để tránh hiển thị lại.
    // Kiểu dữ liệu: array of strings, mỗi phần tử là tên nhóm (groupName).
    // Ví dụ: ["NhomHocTap", "NhomChoiGame"]
    removedGroups: [],
  };

  socket = null;
  messagesEndRef = React.createRef();

  componentDidMount() {
    this.socket = io('http://localhost:5000');
    console.log('Registering user:', this.props.username, this.props.phoneNumber);
    // this.socket.emit('register-user', ...): Gửi thông tin đăng ký người dùng đến server.
    // - Dữ liệu gửi đi: { username, phoneNumber }.
    // - Server sẽ lưu thông tin người dùng và gửi lại danh sách người dùng (user-list) và nhóm (group-list).
    this.socket.emit('register-user', {
      username: this.props.username,
      phoneNumber: this.props.phoneNumber,
    });

    // this.socket.on('user-list', ...): Lắng nghe danh sách người dùng từ server.
    // - Dữ liệu nhận được: users (array of objects).
    // - Cập nhật state users để hiển thị danh sách người dùng trên giao diện.
    this.socket.on('user-list', (users) => {
      console.log('Received user list:', users);
      this.setState({ users });
    });

    // this.socket.on('group-list', ...): Lắng nghe danh sách nhóm từ server.
    // - Dữ liệu nhận được: groups (array of objects).
    // - Lọc bỏ các nhóm đã rời hoặc xóa (dựa trên removedGroups).
    // - Cập nhật state groups và creatorGroups (danh sách tên nhóm mà người dùng là creator).
    this.socket.on('group-list', (groups) => {
      console.log('Received group list:', groups);
      const { removedGroups } = this.state;
      const filteredGroups = groups.filter(group => !removedGroups.includes(group.name));
      const creatorGroups = filteredGroups
        .filter((group) => group.creator === this.socket.id)
        .map((group) => group.name);
      this.setState({ groups: filteredGroups, creatorGroups });
    });

    // this.socket.on('friend-request', ...): Lắng nghe lời mời kết bạn từ server.
    // - Dữ liệu nhận được: { from } (tên người dùng của người gửi lời mời).
    // - Thêm tên người gửi vào state friendRequests để hiển thị trên giao diện.
    this.socket.on('friend-request', ({ from }) => {
      this.setState((prevState) => ({
        friendRequests: [...prevState.friendRequests, from],
      }));
    });

    // this.socket.on('friend-request-rejected', ...): Lắng nghe thông báo từ chối lời mời kết bạn.
    // - Dữ liệu nhận được: fromUsername (tên người dùng từ chối lời mời).
    // - Xóa lời mời tương ứng khỏi state friendRequests.
    this.socket.on('friend-request-rejected', (fromUsername) => {
      this.setState((prevState) => ({
        friendRequests: prevState.friendRequests.filter((req) => req !== fromUsername),
      }));
    });

    // this.socket.on('friend-added', ...): Lắng nghe thông báo khi một người dùng được thêm vào danh sách bạn bè.
    // - Dữ liệu nhận được: friend (tên người dùng của bạn bè mới).
    // - Thêm bạn bè mới vào state friends để hiển thị trên giao diện.
    this.socket.on('friend-added', (friend) => {
      this.setState((prevState) => ({
        friends: [...prevState.friends, friend],
      }));
    });

    // this.socket.on('group-invite', ...): Lắng nghe lời mời tham gia nhóm từ server.
    // - Dữ liệu nhận được: { groupName, from } (tên nhóm và tên người mời).
    // - Thêm lời mời vào state groupInvites để hiển thị trên giao diện.
    this.socket.on('group-invite', ({ groupName, from }) => {
      this.setState((prevState) => ({
        groupInvites: [...prevState.groupInvites, { groupName, from }],
      }));
    });

    // this.socket.on('group-invite-rejected', ...): Lắng nghe thông báo từ chối lời mời tham gia nhóm.
    // - Dữ liệu nhận được: groupName (tên nhóm bị từ chối).
    // - Xóa lời mời tương ứng khỏi state groupInvites.
    this.socket.on('group-invite-rejected', (groupName) => {
      this.setState((prevState) => ({
        groupInvites: prevState.groupInvites.filter((invite) => invite.groupName !== groupName),
      }));
    });

    // this.socket.on('private-message', ...): Lắng nghe tin nhắn riêng tư từ server.
    // - Dữ liệu nhận được: { from, message, to } (người gửi, nội dung tin nhắn, người nhận).
    // - Xác định recipient (người gửi hoặc người nhận, tùy vào username hiện tại).
    // - Thêm tin nhắn vào state messages theo recipient, sau đó cuộn xuống cuối danh sách tin nhắn.
    this.socket.on('private-message', ({ from, message, to }) => {
      const recipient = from === this.props.username ? to : from;
      this.setState(
        (prevState) => ({
          messages: {
            ...prevState.messages,
            [recipient]: [
              ...(prevState.messages[recipient] || []),
              { from, message, type: 'private' },
            ],
          },
        }),
        () => {
          this.scrollToBottom();
        }
      );
    });

    // this.socket.on('group-message', ...): Lắng nghe tin nhắn nhóm từ server.
    // - Dữ liệu nhận được: { from, message, group } (người gửi, nội dung tin nhắn, tên nhóm).
    // - Thêm tin nhắn vào state messages theo tên nhóm, sau đó cuộn xuống cuối danh sách tin nhắn.
    this.socket.on('group-message', ({ from, message, group }) => {
      this.setState(
        (prevState) => ({
        messages: {
          ...prevState.messages,
          [group]: [
            ...(prevState.messages[group] || []),
            { from, message, type: 'group', group },
          ],
        },
      }),
        () => {
          this.scrollToBottom();
        }
      );
    });

    // this.socket.on('group-created', ...): Lắng nghe thông báo nhóm được tạo thành công.
    // - Dữ liệu nhận được: groupName (tên nhóm vừa tạo).
    // - Xóa nội dung ô nhập tên nhóm (groupNameInput) và ẩn form tạo nhóm (showGroupInput).
    this.socket.on('group-created', (groupName) => {
      this.setState({ groupNameInput: '', showGroupInput: false });
    });

    // this.socket.on('group-joined', ...): Lắng nghe thông báo tham gia nhóm thành công.
    // - Dữ liệu nhận được: groupName (tên nhóm vừa tham gia).
    // - Xóa nội dung ô nhập tên nhóm (groupNameInput) nếu có.
    this.socket.on('group-joined', (groupName) => {
      this.setState({ groupNameInput: '' });
    });

    // this.socket.on('group-left', ...): Lắng nghe thông báo rời nhóm.
    // - Dữ liệu nhận được: groupName (tên nhóm vừa rời).
    // - Xóa tin nhắn của nhóm khỏi state messages.
    // - Xóa nhóm khỏi state groups và creatorGroups.
    // - Thêm nhóm vào state removedGroups để tránh hiển thị lại.
    // - Nếu nhóm vừa rời đang được chọn (selectedRecipient), xóa thông tin chọn (selectedRecipient, selectedType).
    this.socket.on('group-left', (groupName) => {
      this.setState((prevState) => {
        const { [groupName]: _, ...restMessages } = prevState.messages;
        return {
          messages: restMessages,
          selectedRecipient: prevState.selectedRecipient === groupName ? '' : prevState.selectedRecipient,
          selectedType: prevState.selectedRecipient === groupName ? '' : prevState.selectedType,
          groups: prevState.groups.filter((g) => g.name !== groupName),
          creatorGroups: prevState.creatorGroups.filter((g) => g !== groupName),
          removedGroups: [...prevState.removedGroups, groupName],
        };
      });
    });

    // this.socket.on('group-deleted', ...): Lắng nghe thông báo nhóm bị xóa.
    // - Dữ liệu nhận được: groupName (tên nhóm bị xóa).
    // - Xóa tin nhắn của nhóm khỏi state messages.
    // - Xóa nhóm khỏi state groups và creatorGroups.
    // - Thêm nhóm vào state removedGroups để tránh hiển thị lại.
    // - Nếu nhóm bị xóa đang được chọn (selectedRecipient), xóa thông tin chọn (selectedRecipient, selectedType).
    this.socket.on('group-deleted', (groupName) => {
      this.setState((prevState) => {
        const { [groupName]: _, ...restMessages } = prevState.messages;
        return {
          messages: restMessages,
          selectedRecipient: prevState.selectedRecipient === groupName ? '' : prevState.selectedRecipient,
          selectedType: prevState.selectedRecipient === groupName ? '' : prevState.selectedType,
          groups: prevState.groups.filter((g) => g.name !== groupName),
          creatorGroups: prevState.creatorGroups.filter((g) => g !== groupName),
          removedGroups: [...prevState.removedGroups, groupName],
        };
      });
    });

    // this.socket.on('error', ...): Lắng nghe thông báo lỗi từ server.
    // - Dữ liệu nhận được: message (chuỗi thông báo lỗi).
    // - Cập nhật state notification để hiển thị lỗi trên giao diện.
    // - Tự động xóa thông báo sau 3 giây (3000ms).
    this.socket.on('error', (message) => {
      this.setState({ notification: message }, () => {
        setTimeout(() => this.setState({ notification: '' }), 3000);
      });
    });
  }

  componentWillUnmount() {
    this.socket.disconnect();
  }

  scrollToBottom = () => {
    const messagesDiv = this.messagesEndRef.current;
    if (messagesDiv) {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  };

  // handleSendMessage: Xử lý việc gửi tin nhắn (riêng tư hoặc nhóm) khi người dùng nhấn nút "Gửi".
  // - Ngăn sự kiện mặc định của form (e.preventDefault).
  // - Kiểm tra tin nhắn không rỗng và đã chọn recipient (người nhận hoặc nhóm).
  // - Nếu là nhóm (selectedType === 'group'), gửi sự kiện 'group-message' đến server.
  // - Nếu là riêng tư (selectedType === 'private'), gửi sự kiện 'private-message' đến server.
  // - Sau khi gửi, xóa nội dung ô input (message).
  handleSendMessage = (e) => {
    e.preventDefault();
    const { message, selectedRecipient, selectedType } = this.state;
    if (message.trim() && selectedRecipient) {
      if (selectedType === 'group') {
        // this.socket.emit('group-message', ...): Gửi tin nhắn nhóm đến server.
        // - Dữ liệu gửi đi: { group, message } (tên nhóm và nội dung tin nhắn).
        // - Server sẽ phát tán tin nhắn này đến tất cả thành viên trong nhóm.
        this.socket.emit('group-message', { group: selectedRecipient, message });
      } else if (selectedType === 'private') {
        // this.socket.emit('private-message', ...): Gửi tin nhắn riêng tư đến server.
        // - Dữ liệu gửi đi: { to, message } (người nhận và nội dung tin nhắn).
        // - Server sẽ chuyển tiếp tin nhắn đến người nhận tương ứng.
        this.socket.emit('private-message', { to: selectedRecipient, message });
      }
      this.setState({ message: '' });
    }
  };

  // handleKeyPress: Xử lý sự kiện nhấn phím trong ô nhập tin nhắn.
  // - Nếu phím nhấn là Enter, gọi hàm handleSendMessage để gửi tin nhắn.
  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSendMessage(e);
    }
  };

  // handleSearchInputChange: Xử lý thay đổi giá trị trong ô tìm kiếm liên hệ mới.
  // - Lấy giá trị nhập vào (query) và cập nhật state searchInput.
  // - Nếu query không rỗng, tìm kiếm người dùng dựa trên tên (username) hoặc số điện thoại (phoneNumber).
  // - Nếu query là số và đủ 10 chữ số, tìm kiếm bằng số điện thoại.
  // - Nếu query không phải số, tìm kiếm bằng tên (không phân biệt hoa thường).
  // - Cập nhật danh sách gợi ý (searchSuggestions) dựa trên kết quả tìm kiếm.
  // - Nếu query rỗng, xóa danh sách gợi ý.
  handleSearchInputChange = (e) => {
    const query = e.target.value;
    const { users } = this.state;
    this.setState({ searchInput: query });

    if (query.trim()) {
      let suggestions = [];
      const isPhoneNumberQuery = /^\d+$/.test(query);
      
      if (isPhoneNumberQuery) {
        if (query.length === 10) {
          suggestions = users.filter(
            (user) =>
              user.phoneNumber === query &&
              user.username !== this.props.username
          );
        }
      } else {
        suggestions = users.filter(
          (user) =>
            user.username.toLowerCase().includes(query.toLowerCase()) &&
            user.username !== this.props.username
        );
      }

      this.setState({ searchSuggestions: suggestions });
    } else {
      this.setState({ searchSuggestions: [] });
    }
  };

  // handleGroupSearchInputChange: Xử lý thay đổi giá trị trong ô tìm kiếm bạn bè để mời vào nhóm.
  // - Lấy giá trị nhập vào (query) và cập nhật state groupSearchInput.
  // - Nếu query không rỗng, tìm kiếm trong danh sách bạn bè (friends) dựa trên tên hoặc số điện thoại.
  // - Cập nhật danh sách gợi ý (groupSearchSuggestions) dựa trên kết quả tìm kiếm.
  // - Nếu query rỗng, xóa danh sách gợi ý.
  handleGroupSearchInputChange = (e) => {
    const query = e.target.value;
    const { friends, users } = this.state;
    this.setState({ groupSearchInput: query });

    if (query.trim()) {
      const friendDetails = users.filter((user) => friends.includes(user.username));
      const suggestions = friendDetails.filter(
        (friend) =>
          friend.username.toLowerCase().includes(query.toLowerCase()) ||
          friend.phoneNumber.includes(query)
      );
      this.setState({ groupSearchSuggestions: suggestions });
    } else {
      this.setState({ groupSearchSuggestions: [] });
    }
  };

  // handleSendFriendRequest: Xử lý việc gửi lời mời kết bạn.
  // - Gửi sự kiện 'send-friend-request' đến server với tên người dùng (username) của người nhận.
  // - Xóa nội dung ô tìm kiếm (searchInput) và danh sách gợi ý (searchSuggestions) sau khi gửi.
  handleSendFriendRequest = (username) => {
    // this.socket.emit('send-friend-request', ...): Gửi lời mời kết bạn đến server.
    // - Dữ liệu gửi đi: username (tên người dùng của người nhận lời mời).
    // - Server sẽ kiểm tra và gửi lời mời đến người nhận nếu hợp lệ.
    this.socket.emit('send-friend-request', username);
    this.setState({ searchInput: '', searchSuggestions: [] });
  };

  // handleAcceptFriendRequest: Xử lý việc chấp nhận lời mời kết bạn.
  // - Gửi sự kiện 'accept-friend-request' đến server với tên người dùng (from) của người gửi lời mời.
  // - Xóa lời mời khỏi danh sách friendRequests sau khi chấp nhận.
  handleAcceptFriendRequest = (from) => {
    // this.socket.emit('accept-friend-request', ...): Chấp nhận lời mời kết bạn và thông báo đến server.
    // - Dữ liệu gửi đi: from (tên người dùng của người gửi lời mời).
    // - Server sẽ cập nhật danh sách bạn bè cho cả hai người dùng và gửi sự kiện 'friend-added'.
    this.socket.emit('accept-friend-request', from);
    this.setState((prevState) => ({
      friendRequests: prevState.friendRequests.filter((req) => req !== from),
    }));
  };

  // handleRejectFriendRequest: Xử lý việc từ chối lời mời kết bạn.
  // - Gửi sự kiện 'reject-friend-request' đến server với tên người dùng (from) của người gửi lời mời.
  // - Xóa lời mời khỏi danh sách friendRequests sau khi từ chối.
  handleRejectFriendRequest = (from) => {
    // this.socket.emit('reject-friend-request', ...): Từ chối lời mời kết bạn và thông báo đến server.
    // - Dữ liệu gửi đi: from (tên người dùng của người gửi lời mời).
    // - Server sẽ xóa lời mời và gửi sự kiện 'friend-request-rejected' đến người gửi.
    this.socket.emit('reject-friend-request', from);
    this.setState((prevState) => ({
      friendRequests: prevState.friendRequests.filter((req) => req !== from),
    }));
  };

  // handleInviteToGroup: Xử lý việc mời một người bạn vào nhóm.
  // - Gửi sự kiện 'invite-to-group' đến server với tên người dùng (username) và tên nhóm (groupName).
  // - Xóa nội dung ô tìm kiếm (groupSearchInput) và danh sách gợi ý (groupSearchSuggestions) sau khi gửi.
  handleInviteToGroup = (username, groupName) => {
    // this.socket.emit('invite-to-group', ...): Gửi lời mời tham gia nhóm đến server.
    // - Dữ liệu gửi đi: { groupName, username } (tên nhóm và tên người dùng được mời).
    // - Server sẽ gửi lời mời đến người dùng tương ứng nếu hợp lệ.
    this.socket.emit('invite-to-group', { groupName, username });
    this.setState({ groupSearchInput: '', groupSearchSuggestions: [] });
  };

  // handleAcceptGroupInvite: Xử lý việc chấp nhận lời mời tham gia nhóm.
  // - Gửi sự kiện 'accept-group-invite' đến server với tên nhóm (groupName).
  // - Xóa lời mời khỏi danh sách groupInvites sau khi chấp nhận.
  handleAcceptGroupInvite = (groupName) => {
    // this.socket.emit('accept-group-invite', ...): Chấp nhận lời mời tham gia nhóm và thông báo đến server.
    // - Dữ liệu gửi đi: groupName (tên nhóm được mời tham gia).
    // - Server sẽ thêm người dùng vào nhóm và gửi sự kiện 'group-joined'.
    this.socket.emit('accept-group-invite', groupName);
    this.setState((prevState) => ({
      groupInvites: prevState.groupInvites.filter((invite) => invite.groupName !== groupName),
    }));
  };

  // handleRejectGroupInvite: Xử lý việc từ chối lời mời tham gia nhóm.
  // - Gửi sự kiện 'reject-group-invite' đến server với tên nhóm (groupName).
  // - Không cần cập nhật state vì server sẽ tự động xóa lời mời và gửi sự kiện 'group-invite-rejected'.
  handleRejectGroupInvite = (groupName) => {
    // this.socket.emit('reject-group-invite', ...): Từ chối lời mời tham gia nhóm và thông báo đến server.
    // - Dữ liệu gửi đi: groupName (tên nhóm bị từ chối).
    // - Server sẽ xóa lời mời và gửi sự kiện 'group-invite-rejected' đến người mời.
    this.socket.emit('reject-group-invite', groupName);
  };

  // handleCreateGroup: Xử lý việc tạo nhóm mới.
  // - Kiểm tra tên nhóm (groupNameInput) không rỗng.
  // - Gửi sự kiện 'create-group' đến server với tên nhóm.
  handleCreateGroup = () => {
    const { groupNameInput } = this.state;
    if (groupNameInput.trim()) {
      // this.socket.emit('create-group', ...): Yêu cầu tạo nhóm mới và gửi đến server.
      // - Dữ liệu gửi đi: groupNameInput (tên nhóm mới).
      // - Server sẽ tạo nhóm và gửi sự kiện 'group-created' nếu thành công.
      this.socket.emit('create-group', groupNameInput);
    }
  };

  // handleJoinGroup: Xử lý việc tham gia một nhóm.
  // - Gửi sự kiện 'join-group' đến server với tên nhóm (groupName).
  // - Cập nhật state để chọn nhóm vừa tham gia (selectedRecipient, selectedType) và ẩn form mời thành viên.
  handleJoinGroup = (groupName) => {
    // this.socket.emit('join-group', ...): Yêu cầu tham gia nhóm và gửi đến server.
    // - Dữ liệu gửi đi: groupName (tên nhóm muốn tham gia).
    // - Server sẽ thêm người dùng vào nhóm và gửi sự kiện 'group-joined'.
    this.socket.emit('join-group', groupName);
    this.setState({
      selectedRecipient: groupName,
      selectedType: 'group',
      showGroupInviteForm: false,
    });
  };

  // handleLeaveGroup: Xử lý việc yêu cầu rời nhóm.
  // - Cập nhật state confirmAction để hiển thị dialog xác nhận rời nhóm.
  // - confirmAction sẽ lưu loại hành động ('leave') và tên nhóm (groupName).
  handleLeaveGroup = () => {
    this.setState((prevState) => ({
      confirmAction: { type: 'leave', groupName: prevState.selectedRecipient },
    }));
  };

  // handleDeleteGroup: Xử lý việc yêu cầu xóa nhóm.
  // - Cập nhật state confirmAction để hiển thị dialog xác nhận xóa nhóm.
  // - confirmAction sẽ lưu loại hành động ('delete') và tên nhóm (groupName).
  handleDeleteGroup = () => {
    this.setState((prevState) => ({
      confirmAction: { type: 'delete', groupName: prevState.selectedRecipient },
    }));
  };

  // handleConfirmAction: Xử lý hành động xác nhận (rời nhóm hoặc xóa nhóm) từ dialog.
  // - Nếu người dùng chọn "Đồng ý" (confirm = true) và có confirmAction:
  //   - Nếu type là 'leave', gửi sự kiện 'leave-group' đến server.
  //   - Nếu type là 'delete', gửi sự kiện 'delete-group' đến server.
  // - Xóa confirmAction sau khi xử lý (ẩn dialog).
  handleConfirmAction = (confirm) => {
    const { confirmAction } = this.state;
    if (confirm && confirmAction) {
      if (confirmAction.type === 'leave') {
        // this.socket.emit('leave-group', ...): Yêu cầu rời nhóm và gửi đến server.
        // - Dữ liệu gửi đi: groupName (tên nhóm muốn rời).
        // - Server sẽ xóa người dùng khỏi nhóm và gửi sự kiện 'group-left'.
        this.socket.emit('leave-group', confirmAction.groupName);
      } else if (confirmAction.type === 'delete') {
        // this.socket.emit('delete-group', ...): Yêu cầu xóa nhóm và gửi đến server.
        // - Dữ liệu gửi đi: groupName (tên nhóm muốn xóa).
        // - Server sẽ xóa nhóm và gửi sự kiện 'group-deleted' đến tất cả thành viên.
        this.socket.emit('delete-group', confirmAction.groupName);
      }
    }
    this.setState({ confirmAction: null });
  };

  // toggleGroupInviteForm: Xử lý việc hiển thị/ẩn form mời bạn bè vào nhóm.
  // - Đảo ngược trạng thái showGroupInviteForm (true -> false hoặc false -> true).
  // - Khi hiển thị form, xóa nội dung ô tìm kiếm (groupSearchInput) và danh sách gợi ý (groupSearchSuggestions).
  toggleGroupInviteForm = () => {
    this.setState((prevState) => ({
      showGroupInviteForm: !prevState.showGroupInviteForm,
      groupSearchInput: '',
      groupSearchSuggestions: [],
    }));
  };

  // toggleGroupInput: Xử lý việc hiển thị/ẩn input tạo nhóm mới.
  // - Đảo ngược trạng thái showGroupInput (true -> false hoặc false -> true).
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
        {notification && <div className="notification">{notification}</div>}
        {confirmAction && (
          <div className="confirm-dialog">
            <p>
              Bạn có chắc chắn muốn {confirmAction.type === 'leave' ? 'rời nhóm' : 'xóa nhóm'} "
              {confirmAction.groupName}"?
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
                  {user.username}
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
            {friendRequests.map((from, index) => (
              <li key={index}>
                {from}
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
            ))}
          </ul>
          <h3>Lời mời tham gia nhóm</h3>
          <ul>
            {groupInvites.map((invite, index) => (
              <li key={index}>
                {invite.from} mời bạn vào {invite.groupName}
                <button
                  className="accept-button"
                  onClick={() => this.handleAcceptGroupInvite(invite.groupName)}
                  title="Chấp nhận"
                >
                  ✔
                </button>
                <button
                  className="reject-button"
                  onClick={() => this.handleRejectGroupInvite(invite.groupName)}
                  title="Từ chối"
                >
                  ✘
                </button>
              </li>
            ))}
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
                  {user.username}
                </li>
              ))}
          </ul>
          <div className="group-section">
            <h3>Nhóm</h3>
            <ul>
              {groups.map((group) => (
                <li
                  key={group.name}
                  className={selectedRecipient === group.name && selectedType === 'group' ? 'active' : ''}
                  onClick={() => this.handleJoinGroup(group.name)}
                >
                  {group.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="chat-area">
          <h3>
            {selectedRecipient
              ? selectedType === 'group'
                ? `Nhóm: ${selectedRecipient}`
                : selectedRecipient
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
                      {friend.username} ({friend.phoneNumber})
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
            {(messages[selectedRecipient] || []).map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.from === this.props.username ? 'sent' : 'received'}`}
              >
                {selectedType === 'group' && <strong>{msg.from}: </strong>}
                {msg.message}
              </div>
            ))}
          </div>
          <div className="message-input">
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={message}
              onChange={(e) => this.setState({ message: e.target.value })}
              onKeyPress={this.handleKeyPress}
            />
            <button onClick={this.handleSendMessage}>Gửi</button>
          </div>
        </div>
      </div>
    );
  }
}

export default Chat;