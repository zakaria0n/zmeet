import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { API_URL } from '../config';

export default function Auth() {
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode');
    
    const [isLogin, setIsLogin] = useState(mode !== 'signup');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (mode === 'signup') setIsLogin(false);
        else if (mode === 'login') setIsLogin(true);
    }, [mode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const endpoint = isLogin ? '/auth/login' : '/auth/signup';
        const body = isLogin ? { email, password } : { name, email, password };

        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || `Failed to ${isLogin ? 'log in' : 'sign up'}`);
            }

            if (isLogin) {
                login(data.user, data.session);
                toast.success("Logged in successfully!");
                navigate('/dashboard');
            } else {
                toast.success("Account created successfully! Please log in.");
                setIsLogin(true);
                setPassword('');
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative' }}>
                {/* Background glows */}
                <div className="dashboard-orb orb-one" style={{ width: '400px', height: '400px', opacity: 0.3, top: '20%', left: '20%' }}></div>
                <div className="dashboard-orb orb-two" style={{ width: '500px', height: '500px', opacity: 0.2, bottom: '20%', right: '20%' }}></div>

                <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '40px', position: 'relative', zIndex: 10 }}>
                    <h2 style={{ marginBottom: '8px', fontWeight: '700', fontSize: '1.8rem' }}>
                        {isLogin ? 'Welcome back' : 'Create an account'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
                        {isLogin ? 'Enter your details to access your workspace' : 'Sign up to start hosting premium meetings'}
                    </p>

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="input-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Zmeet User"
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@example.com"
                        />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="********"
                        />
                    </div>

                    <button type="submit" className="btn primary-btn" disabled={loading} style={{ marginTop: '10px' }}>
                        {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
                    </button>
                </form>

                <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <span
                        onClick={() => setIsLogin(!isLogin)}
                        style={{ color: 'var(--accent-light)', cursor: 'pointer', fontWeight: '600' }}
                    >
                        {isLogin ? "Sign Up" : "Log In"}
                    </span>
                </p>
            </div>
            </div>
        </div>
    );
}
