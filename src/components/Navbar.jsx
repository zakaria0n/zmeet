import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

export default function Navbar() {
    const { user, logout } = useAuth();
    const location = useLocation();

    // Do not show standard navbar on meeting or dashboard pages if they have their own, 
    // but actually it's fine to just render it on specific pages (like Home, Auth).
    
    return (
        <header className="top-nav">
            <Link to="/" className="dashboard-brand" style={{ textDecoration: 'none' }}>
                <img src={logo} alt="ZMeet logo" className="dashboard-logo" style={{ width: '40px', height: '40px' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="dashboard-brand-title" style={{ fontSize: '1.4rem' }}>ZMeet</div>
                </div>
            </Link>

            <div className="nav-actions" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {user ? (
                    <>
                        {location.pathname !== '/dashboard' && (
                            <Link to="/dashboard" className="btn dashboard-secondary-btn">
                                Go to Dashboard
                            </Link>
                        )}
                        <button onClick={logout} className="btn danger-btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/auth?mode=login" className="btn dashboard-secondary-btn" style={{ background: 'transparent', border: 'none' }}>
                            Log in
                        </Link>
                        <Link to="/auth?mode=signup" className="btn primary-btn" style={{ padding: '10px 24px', width: 'auto' }}>
                            Sign up
                        </Link>
                    </>
                )}
            </div>
        </header>
    );
}
