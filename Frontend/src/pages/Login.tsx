import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import { Flame, Eye, EyeOff, Loader2, UserRound } from 'lucide-react';
import { toast } from 'sonner';

const Login: React.FC = () => {
    const { login, loginAsGuest } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setUnverifiedEmail(null);
        try {
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            if (err.message === 'EMAIL_NOT_VERIFIED') {
                setUnverifiedEmail(email);
            } else {
                toast.error(err.message || 'Login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!unverifiedEmail) return;
        setResendLoading(true);
        try {
            await authApi.resendVerification(unverifiedEmail);
            toast.success('Verification email sent!');
        } catch {
            toast.error('Failed to resend email. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
                        <Flame size={32} className="text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">NutrifiedAI</h1>
                    <p className="text-sm text-muted-foreground">AI-powered nutrition tracking</p>
                </div>

                {/* Form */}
                <div className="glass-card p-6">
                    <h2 className="mb-1 text-lg font-semibold text-foreground">Welcome back</h2>
                    <p className="mb-6 text-sm text-muted-foreground">Sign in to your account</p>

                {/* Unverified email notice */}
                {unverifiedEmail && (
                    <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm">
                        <p className="font-medium text-yellow-400">Email not verified</p>
                        <p className="mt-0.5 text-yellow-400/80">
                            Please check your inbox for the verification link.
                        </p>
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resendLoading}
                            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                        >
                            {resendLoading && <Loader2 size={12} className="animate-spin" />}
                            Resend verification email
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    className="w-full rounded-lg bg-secondary px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            Sign In
                        </button>
                    </form>

                    <div className="mt-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground">or</span>
                        <div className="h-px flex-1 bg-border" />
                    </div>

                    <button
                        type="button"
                        onClick={() => { loginAsGuest(); navigate('/'); }}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-primary bg-primary/10 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/20 animate-pulse hover:animate-none"
                    >
                        <UserRound size={16} />
                        Continue as Guest
                    </button>
                    <p className="mt-2 text-center text-[11px] text-muted-foreground">
                        No sign-up needed — data stays in your browser
                    </p>
                </div>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-medium text-primary hover:underline">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
