import React, { Component } from 'react';
import axios from 'axios';
import '../styles/Login.scss';

class Login extends Component {
  state = {
    username: '',
    password: '',
    error: '',
  };

  handleInputChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleLogin = async (e) => {
    e.preventDefault();
    const { username, password } = this.state;

    if (username && password) {
      try {
        const response = await axios.post('http://localhost:5001/login', { username, password });
        sessionStorage.setItem('token', response.data.token); // Sửa localStorage thành sessionStorage
        this.props.onLoginSuccess({
          username: response.data.username,
          phoneNumber: response.data.phoneNumber,
          fullName: response.data.fullName,
          userId: response.data.userId,
        });
      } catch (err) {
        this.setState({ error: err.response?.data?.error || 'Đăng nhập thất bại' });
      }
    } else {
      this.setState({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu' });
    }
  };

  render() {
    const { username, password, error } = this.state;

    return (
      <div className="login-container">
        <h2>Đăng nhập</h2>
        <div className="login-form">
          {error && <p className="error">{error}</p>}
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
          <button onClick={this.handleLogin}>Đăng nhập</button>
          <p>
            Chưa có tài khoản?{' '}
            <span onClick={this.props.onSwitchToRegister}>Đăng ký</span>
          </p>
        </div>
      </div>
    );
  }
}

export default Login;