import React, { Component } from 'react';
import '../styles/Login.scss';

class Login extends Component {
    state = {
        username: '',
        password: '',
    };

    handleSubmit = (e) => {
        e.preventDefault();
        const { username, password } = this.state;
        if (username.trim() && password.trim()) {
        this.props.onLogin(username, password);
        }
    };

    render() {
        const { username, password } = this.state;
        const { onSwitchToRegister } = this.props;

        return (
        <div className="login-container">
            <h2>Đăng nhập</h2>
            <div className="login-form">
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
            <button onClick={this.handleSubmit}>Đăng nhập</button>
            <p>
                Chưa có tài khoản?{' '}
                <span onClick={onSwitchToRegister}>Đăng ký</span>
            </p>
            </div>
        </div>
        );
    }
}

export default Login;