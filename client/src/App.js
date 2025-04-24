import React, { Component } from 'react';
import Chat from './components/Chat';
import Login from './components/Login';
import Register from './components/Register';
import './App.scss';

class App extends Component {
  state = {
    view: 'login', // Điều khiển giao diện: 'login', 'register', hoặc 'chat'
    user: null, // Lưu thông tin người dùng sau khi đăng nhập/đăng ký thành công
  };

  handleLoginSuccess = (user) => {
    this.setState({ user, view: 'chat' });
  };

  handleRegisterSuccess = (user) => {
    this.setState({ user, view: 'chat' });
  };

  switchToRegister = () => {
    this.setState({ view: 'register' });
  };

  switchToLogin = () => {
    this.setState({ view: 'login' });
  };

  render() {
    const { view, user } = this.state;

    return (
      <div className="app">
        {view === 'login' && (
          <Login
            onLoginSuccess={this.handleLoginSuccess}
            onSwitchToRegister={this.switchToRegister}
          />
        )}
        {view === 'register' && (
          <Register
            onRegisterSuccess={this.handleRegisterSuccess}
            onSwitchToLogin={this.switchToLogin}
          />
        )}
        {view === 'chat' && user && (
          <Chat
            username={user.username}
            phoneNumber={user.phoneNumber}
            fullName={user.fullName}
            userId={user.userId}
          />
        )}
      </div>
    );
  }
}

export default App;