import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, getErrorMessage, TOKEN_KEY } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function loadProfile() {
            const token = localStorage.getItem(TOKEN_KEY);

            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const response = await api.get('/user');
                if (mounted) {
                    setUser(response.data.data);
                }
            } catch (error) {
                if (error.response?.status !== 401 && mounted) {
                    toast.error(getErrorMessage(error));
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        function clearUser() {
            setUser(null);
        }

        window.addEventListener('booksales:unauthorized', clearUser);
        loadProfile();

        return () => {
            mounted = false;
            window.removeEventListener('booksales:unauthorized', clearUser);
        };
    }, []);

    const signIn = useCallback(async (credentials) => {
        const response = await api.post('/login', credentials);
        localStorage.setItem(TOKEN_KEY, response.data.data.token);
        setUser(response.data.data.user);

        return response.data.data.user;
    }, []);

    const register = useCallback(async (details) => {
        const response = await api.post('/register', details);
        localStorage.setItem(TOKEN_KEY, response.data.data.token);
        setUser(response.data.data.user);

        return response.data.data.user;
    }, []);

    const signOut = useCallback(async () => {
        try {
            if (localStorage.getItem(TOKEN_KEY)) {
                await api.post('/logout');
            }
        } finally {
            localStorage.removeItem(TOKEN_KEY);
            setUser(null);
        }
    }, []);

    const value = useMemo(() => ({
        user,
        loading,
        signIn,
        register,
        signOut,
    }), [user, loading, signIn, register, signOut]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within AuthProvider.');
    }

    return context;
}
