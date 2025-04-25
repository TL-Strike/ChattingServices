import React, { Component } from 'react';
import axios from 'axios';
import '../styles/Register.scss';

class Register extends Component {
  state = {
    username: '',
    password: '',
    phoneNumber: '',
    fullName: '',
    gmail: '',
    error: '',
    success: '',
  };

  handleInputChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleRegister = async (e) => {
    e.preventDefault();
    const { username, password, phoneNumber, fullName, gmail } = this.state;

    this.setState({ error: '', success: '' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(gmail)) {
      this.setState({ error: 'Vui lòng nhập email hợp lệ' });
      return;
    }

    if (username && password && phoneNumber && fullName && gmail) {
      try {
        await axios.post('http://localhost:5001/register', {
          username,
          password,
          phoneNumber,
          fullName,
          gmail,
        });

        this.setState({ success: 'Đăng ký thành công! Đang chuyển đến trang đăng nhập...' });

        setTimeout(() => {
          this.props.onSwitchToLogin();
        }, 2000);
      } catch (err) {
        this.setState({ error: err.response?.data?.error || 'Đăng ký thất bại' });
      }
    } else {
      this.setState({ error: 'Vui lòng điền đầy đủ thông tin' });
    }
  };

  render() {
    const { username, password, phoneNumber, fullName, gmail, error, success } = this.state;

    return (
      <div className="register-container">
        <h2>Đăng ký</h2>
        <div className="register-form">
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <input
            type="text"
            name="username"
            placeholder="Tên người dùng"
            value={username}
            onChange={this.handleInputChange}
          />
          <input
            type="password"
            name="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={this.handleInputChange}
          />
          <input
            type="tel"
            name="phoneNumber"
            placeholder="Số điện thoại"
            value={phoneNumber}
            onChange={this.handleInputChange}
          />
          <input
            type="text"
            name="fullName"
            placeholder="Họ và Tên"
            value={fullName}
            onChange={this.handleInputChange}
          />
          <input
            type="email"
            name="gmail"
            placeholder="Gmail"
            value={gmail}
            onChange={this.handleInputChange}
          />
          <button onClick={this.handleRegister}>Đăng ký</button>
          <p>
            Đã có tài khoản?{' '}
            <span onClick={this.props.onSwitchToLogin}>Đăng nhập</span>
          </p>
        </div>
      </div>
    );
  }
}

export default Register;