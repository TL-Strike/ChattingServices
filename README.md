Chat Application
Overview
Dự án này là một ứng dụng chat thời gian thực được xây dựng bằng React cho phía giao diện người dùng (frontend) và Node.js kết hợp với Socket.IO cho phía máy chủ (backend). Ứng dụng cho phép người dùng đăng ký bằng tên người dùng và số điện thoại, gửi lời mời kết bạn, tạo và tham gia nhóm, đồng thời trò chuyện cả trong các cuộc hội thoại riêng tư và nhóm. Ứng dụng hỗ trợ nhắn tin thời gian thực, quản lý nhóm (tạo, tham gia, rời, xóa), và quản lý bạn bè (gửi, chấp nhận, từ chối lời mời kết bạn).
Features

Đăng ký người dùng: Người dùng có thể đăng ký với tên người dùng và số điện thoại.
Quản lý bạn bè:
Tìm kiếm người dùng bằng tên người dùng hoặc số điện thoại.
Gửi, chấp nhận hoặc từ chối lời mời kết bạn.


Nhắn tin riêng tư: Trò chuyện một-một với bạn bè theo thời gian thực.
Nhắn tin nhóm:
Tạo nhóm và mời bạn bè tham gia.
Tham gia, rời hoặc xóa nhóm.
Trò chuyện trong nhóm với nhiều thành viên.


Cập nhật thời gian thực: Sử dụng Socket.IO để nhắn tin và thông báo tức thì.
Giao diện thân thiện: Giao diện người dùng sạch sẽ và dễ sử dụng, được thiết kế bằng SCSS.

Tech Stack

Frontend:
React (thư viện JavaScript để xây dựng giao diện người dùng)
Socket.IO Client (cho việc giao tiếp thời gian thực)
SCSS (để định dạng giao diện)


Backend:
Node.js (môi trường chạy JavaScript)
Express (framework web)
Socket.IO (cho giao tiếp thời gian thực, hai chiều)


Các phụ thuộc khác:
cors (để xử lý các yêu cầu cross-origin)



Prerequisites
Trước khi chạy dự án, hãy đảm bảo bạn đã cài đặt các thành phần sau:

Node.js (khuyến nghị phiên bản v14 trở lên)
npm (đi kèm với Node.js)
Trình duyệt web hiện đại (Chrome, Firefox, v.v.)

Installation and Setup
Hãy làm theo các bước sau để cài đặt và chạy dự án trên máy cục bộ.
1. Tải mã nguồn về máy
git clone <repository-url>
cd chat-application

2. Cài đặt các phụ thuộc
Dự án bao gồm hai phần chính: backend (server/) và frontend (client/). Bạn cần cài đặt phụ thuộc cho cả hai phần.
Backend
cd server
npm install

Frontend
cd client
npm install

3. Chạy ứng dụng
Khởi động Backend Server
Từ thư mục server/:
node index.js

Server sẽ chạy trên http://localhost:5000 theo mặc định.
Khởi động Frontend
Trong một terminal khác, từ thư mục client/:
npm start

Ứng dụng React sẽ chạy trên http://localhost:3000 theo mặc định và tự động mở trong trình duyệt của bạn.
4. Kiểm tra ứng dụng

Mở nhiều cửa sổ hoặc tab trình duyệt để mô phỏng các người dùng khác nhau.
Đăng ký người dùng với tên người dùng và số điện thoại duy nhất.
Thử gửi lời mời kết bạn, tạo nhóm và trò chuyện trong cả hội thoại riêng tư và nhóm.

Project Structure
chat-application/
│
├── client/                 # Frontend (ứng dụng React)
│   ├── src/
│   │   ├── components/
│   │   │   └── Chat.js     # Thành phần chính xử lý giao diện và logic chat
│   │   ├── styles/
│   │   │   └── Chat.scss   # File định dạng giao diện chat
│   │   └── App.js          # Thành phần gốc của React
│   ├── public/
│   └── package.json
│
├── server/                 # Backend (Node.js + Socket.IO)
│   ├── index.js            # File chính của server xử lý logic Socket.IO
│   └── package.json
│
└── README.md               # Tài liệu hướng dẫn dự án

Usage

Đăng ký người dùng:
Nhập tên người dùng và số điện thoại để đăng ký.


Thêm bạn bè:
Tìm kiếm người dùng khác bằng tên người dùng hoặc số điện thoại.
Gửi lời mời kết bạn và chờ họ chấp nhận.


Tạo nhóm:
Nhấn nút "Tạo nhóm", nhập tên nhóm và xác nhận.
Mời bạn bè vào nhóm bằng cách tìm kiếm tên người dùng của họ.


Trò chuyện:
Chọn một người bạn hoặc nhóm từ thanh bên để bắt đầu trò chuyện.
Nhập tin nhắn và nhấn "Gửi" hoặc phím Enter để gửi.


Quản lý nhóm:
Rời nhóm bằng cách nhấn "Rời nhóm" (tất cả người dùng).
Xóa nhóm bằng cách nhấn "Xóa nhóm" (chỉ dành cho người tạo nhóm).



Known Issues

Đồng bộ danh sách nhóm:
Sau khi rời hoặc xóa nhóm, tên nhóm có thể vẫn hiển thị trong thanh bên cho đến khi server cập nhật danh sách nhóm. Vấn đề này đã được giảm thiểu bằng cách thêm trạng thái removedGroups ở phía client để lọc bỏ các nhóm đã xóa.



Future Improvements

Thêm tính năng xác thực người dùng (ví dụ: đăng nhập bằng JWT).
Lưu trữ tin nhắn và nhóm trong cơ sở dữ liệu (ví dụ: MongoDB).
Hỗ trợ chia sẻ file (hình ảnh, tài liệu).
Cải thiện giao diện người dùng với thông báo và hiệu ứng động tốt hơn.
Thêm các bài kiểm tra đơn vị (unit tests) cho cả frontend và backend.

Contributing
Chúng tôi hoan nghênh mọi đóng góp! Nếu bạn có ý tưởng hoặc cải tiến, vui lòng:

Fork kho lưu trữ.
Tạo một nhánh mới (git checkout -b feature/tinh-nang-cua-ban).
Thực hiện thay đổi và commit (git commit -m "Thêm tính năng của bạn").
Đẩy lên nhánh của bạn (git push origin feature/tinh-nang-cua-ban).
Mở một Pull Request.

License
Dự án này được cấp phép theo Giấy phép MIT. Xem chi tiết trong file LICENSE.
