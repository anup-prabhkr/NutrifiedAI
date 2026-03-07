import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/lib/api';
import { setTokens } from '@/lib/api';
import { Flame, CheckCircle, XCircle, Loader2 } from 'lucide-react';

type Status = 'verifying' | 'success' | 'error';

const VerifyEmail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<Status>('verifying');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setErrorMsg('No verification token found in the link.');
            setStatus('error');
            return;
        }

        authApi.verifyEmail(token)
            .then((res) => {
                setTokens(res.accessToken, res.refreshToken);
                setStatus('success');
                // Navigate to app after a short delay so user sees the success state
                setTimeout(() => navigate('/'), 2000);
            })
            .catch((err: Error) => {
                setErrorMsg(err.message || 'Verification failed. The link may be invalid or expired.');
                setStatus('error');
            });
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps

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
                    {status === 'verifying' && (
                        <>
                            <div className="mb-4 flex justify-center">
                                <Loader2 size={40} className="animate-spin text-primary" />
                            </div>
                            <h2 className="text-lg font-semibold text-foreground">Verifying your email…</h2>
                            <p className="mt-2 text-sm text-muted-foreground">Please wait a moment.</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="mb-4 flex justify-center">
                                <CheckCircle size={40} className="text-green-500" />
                            </div>
                            <h2 className="text-lg font-semibold text-foreground">Email verified!</h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Your account is now active. Redirecting you to the app…
                            </p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="mb-4 flex justify-center">
                                <XCircle size={40} className="text-destructive" />
                            </div>
                            <h2 className="text-lg font-semibold text-foreground">Verification failed</h2>
                            <p className="mt-2 mb-5 text-sm text-muted-foreground">{errorMsg}</p>
                            <Link
                                to="/register"
                                className="inline-block rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                                Back to Register
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
