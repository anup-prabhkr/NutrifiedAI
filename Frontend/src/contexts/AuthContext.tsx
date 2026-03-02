import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    authApi,
    profileApi,
    setTokens,
    clearTokens,
    getAccessToken,
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
            clearTokens();
            setUser(null);
        }
    }, []);

    // Check for existing session on mount
    useEffect(() => {
        const token = getAccessToken();
        if (token) {
            refreshUser().finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [refreshUser]);

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
