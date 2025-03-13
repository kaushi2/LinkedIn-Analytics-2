import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [stats, setStats] = useState({ shares: 0, comments: 0, likes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState('');
  const [linkedInAuthenticated, setLinkedInAuthenticated] = useState(false); // Default to true, will be checked
  const [canFetchStats, setCanFetchStats] = useState(false); // New state

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    if (isLoggedIn && !linkedInAuthenticated) {
      window.location.href = `${API_BASE_URL}/linkedin/auth`;
      setLinkedInAuthenticated(async() => await axios.get(`${API_BASE_URL}/linkedin/isLinkedInAutheticated`).data.linkedInAuthenticated);
    } else if (isLoggedIn && linkedInAuthenticated){
        setCanFetchStats(true); // Allow stats fetch
    } else {
        setCanFetchStats(false);
    }
    // Check for successful LinkedIn authentication
    // if (window.location.origin === "/" && isLoggedIn && !linkedInAuthenticated) {
    //   setLinkedInAuthenticated(true);
    //   setCanFetchStats(true); // Allow stats fetch
    // }    
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
  }, [canFetchStats, API_BASE_URL]);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/register`, { username, password });
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
      //checkAuthorization(); // Check auth after login
    } catch (err) {
      setMessage(err.response.data.message);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.get(`${API_BASE_URL}/logout`);
      setIsLoggedIn(false);
      setLinkedInAuthenticated(false); // Reset auth on logout
      setMessage('Logout successful');
    } catch (err) {
      setMessage(err.response.data.message);
    }
  };

  const checkAuthorization = async () => {
    try {
      await axios.get(`${API_BASE_URL}/protected`);
      setLinkedInAuthenticated(true);
    } catch (err) {
      setLinkedInAuthenticated(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      //checkAuthorization(); // check authorization on initial login state.
    }
  }, [isLoggedIn, API_BASE_URL]);

  // if (loading) {
  //   return <div>Loading...</div>;
  // }

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