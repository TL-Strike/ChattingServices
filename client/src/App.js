import React, { Component } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import './App.scss';

class App extends Component {
  state = {
    currentScreen: 'login',
    username: '',
    password: '',
    phoneNumber: '',
  };

  handleRegister = (username, password, phoneNumber) => {
    console.log('Registering:', { username, password, phoneNumber }); // Thêm log
    this.setState({ username, password, phoneNumber, currentScreen: 'chat' });
  };

  handleLogin = (username, password) => {
    console.log('Logging in:', { username, password }); // Thêm log
    this.setState({ username, password, currentScreen: 'chat' });
  };

  handleBackToLogin = () => {
    this.setState({ currentScreen: 'login' });
  };

  render() {
    const { currentScreen, username, phoneNumber } = this.state;

    return (
      <div className="app">
        {currentScreen === 'login' && (
          <Login
            onLogin={this.handleLogin}
            onSwitchToRegister={() => this.setState({ currentScreen: 'register' })}
          />
        )}
        {currentScreen === 'register' && (
          <Register
            onRegister={this.handleRegister}
            onBackToLogin={this.handleBackToLogin}
          />
        )}
        {currentScreen === 'chat' && (
          <Chat username={username} phoneNumber={phoneNumber} />
        )}
      </div>
    );
  }
}

export default App;