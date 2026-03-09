/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

function loadStoredAuth() {
    const storedToken = localStorage.getItem('zmeet_token');
    const storedUser = localStorage.getItem('zmeet_user');

    if (!storedToken || !storedUser) {
        return { user: null, token: null };
    }

    try {
        return {
            token: storedToken,
            user: JSON.parse(storedUser)
        };
    } catch (e) {
        console.error("Failed to parse user", e);
        localStorage.removeItem('zmeet_token');
        localStorage.removeItem('zmeet_user');
        return { user: null, token: null };
    }
}

export const AuthProvider = ({ children }) => {
    const [{ user, token }, setAuth] = useState(loadStoredAuth);

    const login = (newUser, newToken) => {
        localStorage.setItem('zmeet_token', newToken);
        localStorage.setItem('zmeet_user', JSON.stringify(newUser));
        setAuth({ user: newUser, token: newToken });
    };

    const logout = () => {
        localStorage.removeItem('zmeet_token');
        localStorage.removeItem('zmeet_user');
        setAuth({ user: null, token: null });
    };

    return (
        <AuthContext.Provider value={{ user, token, loading: false, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
