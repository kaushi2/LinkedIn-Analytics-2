import React from 'react';

const Dashboard = ({ user, onLogout, handleConnectLinkedIn }) => {
    return (
        <div>
            <h1>Dashboard</h1>
            {user && (
                <div>
                    <p>Welcome, {user.username}!</p>
                </div>
            )}
            <button onClick={onLogout}>Logout</button>
            <button onClick={handleConnectLinkedIn}>Connect with LinkedIn</button>
        </div>
    );
};

export default Dashboard;