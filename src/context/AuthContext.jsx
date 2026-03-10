/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

function loadStoredAuth() {
    const storedUser = localStorage.getItem('zmeet_user');
    const storedSession = localStorage.getItem('zmeet_session');
    const legacyToken = localStorage.getItem('zmeet_token');

    if (!storedUser) {
        return { user: null, session: null };
    }

    try {
        return {
            user: JSON.parse(storedUser),
            session: storedSession ? JSON.parse(storedSession) : (legacyToken ? { access_token: legacyToken } : null)
        };
    } catch (e) {
        console.error("Failed to parse user", e);
        localStorage.removeItem('zmeet_user');
        localStorage.removeItem('zmeet_session');
        localStorage.removeItem('zmeet_token');
        return { user: null, session: null };
    }
}

export const AuthProvider = ({ children }) => {
    const [{ user, session }, setAuth] = useState(loadStoredAuth);
    const [loading, setLoading] = useState(Boolean(session?.access_token && session?.refresh_token));

    useEffect(() => {
        let cancelled = false;

        if (session?.access_token && session?.refresh_token) {
            supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token
            }).catch((error) => {
                console.error('Failed to restore auth session', error);
            }).finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });
        } else {
            setLoading(false);
        }

        return () => {
            cancelled = true;
        };
    }, [session]);

    const persistAuth = (nextUser, nextSession) => {
        localStorage.setItem('zmeet_user', JSON.stringify(nextUser));

        if (nextSession) {
            localStorage.setItem('zmeet_session', JSON.stringify(nextSession));
            localStorage.setItem('zmeet_token', nextSession.access_token);
        } else {
            localStorage.removeItem('zmeet_session');
            localStorage.removeItem('zmeet_token');
        }

        setAuth({ user: nextUser, session: nextSession });
    };

    const login = useCallback((newUser, newSession) => {
        persistAuth(newUser, newSession);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('zmeet_user');
        localStorage.removeItem('zmeet_session');
        localStorage.removeItem('zmeet_token');
        setAuth({ user: null, session: null });
    }, []);

    const getValidToken = useCallback(async () => {
        if (!session?.access_token) {
            return null;
        }

        if (!session.refresh_token || !session.expires_at) {
            return session.access_token;
        }

        const nowInSeconds = Math.floor(Date.now() / 1000);
        const hasExpired = session.expires_at <= nowInSeconds + 60;

        if (!hasExpired) {
            return session.access_token;
        }

        const { data, error } = await supabase.auth.refreshSession({
            refresh_token: session.refresh_token
        });

        if (error || !data.session) {
            console.error('Failed to refresh auth session', error);
            logout();
            return null;
        }

        persistAuth(user, data.session);
        return data.session.access_token;
    }, [logout, session, user]);

    const token = session?.access_token || null;

    return (
        <AuthContext.Provider value={{ user, token, session, loading, login, logout, getValidToken }}>
            {children}
        </AuthContext.Provider>
    );
};
