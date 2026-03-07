import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    authApi,
    profileApi,
    setTokens,
    clearTokens,
    getAccessToken,
    getRefreshToken,
    type UserData,
} from '@/lib/api';

interface AuthContextType {
    user: UserData | null;
    isAuthenticated: boolean;
    isGuest: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    loginAsGuest: () => void;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const GUEST_KEY = 'nv_guest_mode';

const guestUser: UserData = {
    id: 'guest',
    name: 'Guest',
    email: 'guest@local',
    profile: {},
    subscription: { tier: 'free', status: 'active' },
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserData | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const profile = await profileApi.get();
            setUser(profile);
        } catch {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        const guestMode = localStorage.getItem(GUEST_KEY);
        if (guestMode === 'true') {
            setUser(guestUser);
            setIsGuest(true);
            setIsLoading(false);
            return;
        }
        const hasSession = getAccessToken() || getRefreshToken();
        if (hasSession) {
            refreshUser().finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [refreshUser]);

    useEffect(() => {
        const handleSessionExpired = () => {
            setUser(null);
            setIsGuest(false);
        };
        window.addEventListener('auth:session-expired', handleSessionExpired);
        return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
    }, []);

    const login = async (email: string, password: string) => {
        const res = await authApi.login({ email, password });
        setTokens(res.accessToken, res.refreshToken);
        localStorage.removeItem(GUEST_KEY);
        setIsGuest(false);
        setUser(res.user);
    };

    const register = async (name: string, email: string, password: string) => {
        const res = await authApi.register({ name, email, password });
        setTokens(res.accessToken, res.refreshToken);
        localStorage.removeItem(GUEST_KEY);
        setIsGuest(false);
        setUser(res.user);
    };

    const loginAsGuest = () => {
        localStorage.setItem(GUEST_KEY, 'true');
        setIsGuest(true);
        setUser(guestUser);
    };

    const logout = async () => {
        if (isGuest) {
            localStorage.removeItem(GUEST_KEY);
            setIsGuest(false);
            setUser(null);
            return;
        }
        try {
            await authApi.logout();
        } catch {
            // Logout even if API call fails
        }
        clearTokens();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isGuest,
                isLoading,
                login,
                register,
                loginAsGuest,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
