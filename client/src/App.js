import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

function App() {
  const [stats, setStats] = useState({ shares: 0, comments: 0, likes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState('');
  const [linkedInAuthenticated, setLinkedInAuthenticated] = useState(false);
  const [canFetchStats, setCanFetchStats] = useState(false);
  const location = useLocation();

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  axios.defaults.withCredentials = true;
   
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const isLoggedInParam = queryParams.get('isLoggedIn');
    const linkedInAuthenticatedParam = queryParams.get('linkedInAuthenticated');

    if (isLoggedInParam === 'true') {
      setIsLoggedIn(true);
    }
    if (linkedInAuthenticatedParam === 'true') {
      setLinkedInAuthenticated(true);
    }
  }, [location.search]);

  useEffect(() => {
    if (isLoggedIn && !linkedInAuthenticated) {
      window.location.href = `${API_BASE_URL}/linkedin/auth`;
    } else if (isLoggedIn && linkedInAuthenticated) {
      setCanFetchStats(true);
    } else {
      setCanFetchStats(false);
    }
  }, [isLoggedIn, linkedInAuthenticated, API_BASE_URL]);

  useEffect(() => {
    if (canFetchStats) { 
      const fetchStats = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/linkedin/stats`);
          setStats(response.data);
          setLoading(false);
        } catch (err) {
          setError(err);
          setLoading(false);
          if (err.response && err.response.status === 401) {
            setLinkedInAuthenticated(false);
          }
        }
      };
  
      fetchStats();
    }
  }, [canFetchStats, API_BASE_URL]);  // ✅ Use `canFetchStats` instead of `isLoggedIn`

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/register`, { username, password }, { withCredentials: true });
      setMessage(response.data.message);
    } catch (err) {
      setMessage(err.response.data.error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/login`, { username, password });
      setIsLoggedIn(true);
      setMessage('Login successful');
    } catch (err) {
      setMessage(err.response.data.message);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.get(`${API_BASE_URL}/logout`);
      setIsLoggedIn(false);
      setLinkedInAuthenticated(false);
      setMessage('Logout successful');
    } catch (err) {
      setMessage(err.response.data.message);
    }
  };

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>LinkedIn Post Statistics</h1>
      <p>{message}</p>
      {isLoggedIn ? (
        linkedInAuthenticated ? (
          <>
            <p>Shares: {stats.shares}</p>
            <p>Comments: {stats.comments}</p>
            <p>Likes: {stats.likes}</p>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <p>You are not authorized to view this content.</p>
        )
      ) : (
        <>
          <form onSubmit={handleRegister}>
            <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit">Register</button>
          </form>
          <form onSubmit={handleLogin}>
            <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit">Login</button>
          </form>
        </>
      )}
    </div>
  );
}

export default App;