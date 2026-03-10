import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DoorOpen, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import logo from '../assets/logo.png';

export default function Dashboard() {
    const { user, logout, getValidToken } = useAuth();
    const [roomCode, setRoomCode] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleCreateRoom = async () => {
        setLoading(true);
        try {
            const token = await getValidToken();
            if (!token) throw new Error('Session expired. Please log in again.');

            const res = await fetch(`${API_URL}/rooms/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ created_by: user.id })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('Room created!');
            navigate(`/meeting/${data.room_code}`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        if (!roomCode.trim()) {
            toast.error('Please enter a room code');
            return;
        }

        setLoading(true);
        try {
            const token = await getValidToken();
            if (!token) throw new Error('Session expired. Please log in again.');

            const res = await fetch(`${API_URL}/rooms/${roomCode.trim()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Room not found');
            }

            toast.success('Joining room...');
            navigate(`/meeting/${roomCode.trim()}`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-shell">
            <div className="dashboard-orb orb-one" />
            <div className="dashboard-orb orb-two" />

            <header className="top-nav dashboard-nav">
                <Link to="/" className="dashboard-brand" style={{ textDecoration: 'none' }}>
                    <img src={logo} alt="ZMeet logo" className="dashboard-logo" />
                    <div>
                        <div className="dashboard-brand-title">ZMeet</div>
                        <div className="dashboard-brand-subtitle">Meet. Share. Record.</div>
                    </div>
                </Link>

                <div className="user-menu dashboard-user-menu">
                    <div className="dashboard-user-chip">
                        <span className="dashboard-user-label">Signed in</span>
                        <strong>{user.name || user.email}</strong>
                    </div>
                    <Link to="/recordings" className="btn dashboard-secondary-btn">
                        My Recordings
                    </Link>
                    <button onClick={logout} className="btn danger-btn" style={{ padding: '10px 14px' }}>
                        Logout
                    </button>
                </div>
            </header>

            <main className="main-content dashboard-main">
                <section className="dashboard-actions-grid" style={{ marginTop: '20px' }}>
                    <section className="glass-panel dashboard-action-card primary animate-in delay-100">
                        <div className="dashboard-action-icon">
                            <Video size={22} />
                        </div>
                        <div>
                            <h2>Start a Meeting</h2>
                            <p>Create a fresh room code and jump straight into your live workspace.</p>
                        </div>
                        <button
                            onClick={handleCreateRoom}
                            disabled={loading}
                            className="btn primary-btn"
                            style={{ padding: '15px' }}
                        >
                            {loading ? 'Creating...' : 'Create Meeting'}
                        </button>
                    </section>

                    <section className="glass-panel dashboard-action-card animate-in delay-200">
                        <div className="dashboard-action-icon">
                            <DoorOpen size={22} />
                        </div>
                        <div>
                            <h2>Join a Meeting</h2>
                            <p>Enter a room code to reconnect with your team or jump into an active call.</p>
                        </div>
                        <form onSubmit={handleJoinRoom} className="dashboard-join-form">
                            <input
                                type="text"
                                placeholder="Enter room code"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toLowerCase())}
                                maxLength={6}
                                className="dashboard-room-input"
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn dashboard-join-btn"
                            >
                                Join Room
                            </button>
                        </form>
                    </section>
                </section>
            </main>
        </div>
    );
}
