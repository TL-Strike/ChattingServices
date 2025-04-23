import React, { Component } from 'react';
import '../styles/Register.scss';

class Register extends Component {
  state = {
    username: '',
    password: '',
    phoneNumber: '',
  };

  handleSubmit = (e) => {
    e.preventDefault();
    const { username, password, phoneNumber } = this.state;
    if (username.trim() && password.trim() && phoneNumber.trim()) {
      console.log('Submitting registration:', { username, password, phoneNumber }); // Thêm log
      this.props.onRegister(username, password, phoneNumber);
    }
  };

  render() {
    const { username, password, phoneNumber } = this.state;
    const { onBackToLogin } = this.props;

    return (
      <div className="register-container">
        <h2>Đăng ký</h2>
        <div className="register-form">
          <input
            type="text"
            placeholder="Tên người dùng"
            value={username}
            onChange={(e) => this.setState({ username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => this.setState({ password: e.target.value })}
          />
          <input
            type="tel"
            placeholder="Số điện thoại"
            value={phoneNumber}
            onChange={(e) => this.setState({ phoneNumber: e.target.value })}
          />
          <button onClick={this.handleSubmit}>Đăng ký</button>
          <p>
            Đã có tài khoản?{' '}
            <span onClick={onBackToLogin}>Đăng nhập</span>
          </p>
        </div>
      </div>
    );
  }
}

export default Register;