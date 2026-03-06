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
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const profile = await profileApi.get();
            setUser(profile);
        } catch {
            // Don't clear tokens here — apiFetch already clears them and fires
            // the 'auth:session-expired' event if the refresh token is invalid.
            // For transient errors (network issues), we keep tokens so the user
            // stays logged in and can retry.
            setUser(null);
        }
    }, []);

    // Check for existing session on mount — access OR refresh token is enough
    useEffect(() => {
        const hasSession = getAccessToken() || getRefreshToken();
        if (hasSession) {
            refreshUser().finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [refreshUser]);

    // Listen for session expiry fired by apiFetch when refresh token is invalid
    useEffect(() => {
        const handleSessionExpired = () => {
            setUser(null);
        };
        window.addEventListener('auth:session-expired', handleSessionExpired);
        return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
    }, []);

    const login = async (email: string, password: string) => {
        const res = await authApi.login({ email, password });
        setTokens(res.accessToken, res.refreshToken);
        setUser(res.user);
    };

    const register = async (name: string, email: string, password: string) => {
        const res = await authApi.register({ name, email, password });
        setTokens(res.accessToken, res.refreshToken);
        setUser(res.user);
    };

    const logout = async () => {
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
                isLoading,
                login,
                register,
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
