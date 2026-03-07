import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { setTokens, profileApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Flame, Loader2, XCircle } from 'lucide-react';

const GoogleCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');

        if (!accessToken || !refreshToken) {
            setError('Google sign-in failed. Missing authentication tokens.');
            return;
        }

        setTokens(accessToken, refreshToken);
        localStorage.removeItem('nv_guest_mode');

        refreshUser()
            .then(() => navigate('/', { replace: true }))
            .catch(() => {
                setError('Failed to load your profile. Please try signing in again.');
            });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
                        <Flame size={32} className="text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">NutrifiedAI</h1>
                </div>

                <div className="glass-card p-6 text-center">
                    {error ? (
                        <>
                            <div className="mb-4 flex justify-center">
                                <XCircle size={40} className="text-destructive" />
                            </div>
                            <h2 className="text-lg font-semibold text-foreground">Sign-in failed</h2>
                            <p className="mt-2 mb-5 text-sm text-muted-foreground">{error}</p>
                            <a
                                href="/login"
                                className="inline-block rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                                Back to Login
                            </a>
                        </>
                    ) : (
                        <>
                            <div className="mb-4 flex justify-center">
                                <Loader2 size={40} className="animate-spin text-primary" />
                            </div>
                            <h2 className="text-lg font-semibold text-foreground">Signing you in…</h2>
                            <p className="mt-2 text-sm text-muted-foreground">Please wait a moment.</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GoogleCallback;
