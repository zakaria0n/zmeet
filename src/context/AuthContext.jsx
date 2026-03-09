import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load from local storage
        const storedToken = localStorage.getItem('zmeet_token');
        const storedUser = localStorage.getItem('zmeet_user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user", e);
            }
        }
        setLoading(false);
    }, []);

    const login = (newUser, newToken) => {
        localStorage.setItem('zmeet_token', newToken);
        localStorage.setItem('zmeet_user', JSON.stringify(newUser));
        setUser(newUser);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('zmeet_token');
        localStorage.removeItem('zmeet_user');
        setUser(null);
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
