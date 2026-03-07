import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/lib/api';
import { Flame, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const Register: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
    const [resendLoading, setResendLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const res = await authApi.register({ name, email, password });
            setRegisteredEmail(res.email);
        } catch (err: any) {
            toast.error(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!registeredEmail) return;
        setResendLoading(true);
        try {
            await authApi.resendVerification(registeredEmail);
            toast.success('Verification email resent!');
        } catch {
            toast.error('Failed to resend email. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    if (registeredEmail) {
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
                        <div className="mb-4 flex justify-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                                <Mail size={28} className="text-primary" />
                            </div>
                        </div>
                        <h2 className="mb-2 text-lg font-semibold text-foreground">Check your email</h2>
                        <p className="mb-1 text-sm text-muted-foreground">
                            We sent a verification link to
                        </p>
                        <p className="mb-5 text-sm font-medium text-foreground">{registeredEmail}</p>
                        <p className="mb-6 text-xs text-muted-foreground">
                            Click the link in the email to activate your account. The link expires in 24 hours.
                        </p>
                        <button
                            onClick={handleResend}
                            disabled={resendLoading}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                        >
                            {resendLoading && <Loader2 size={14} className="animate-spin" />}
                            Resend verification email
                        </button>
                    </div>
                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Already verified?{' '}
                        <Link to="/login" className="font-medium text-primary hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
                        <Flame size={32} className="text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">NutrifiedAI</h1>
                    <p className="text-sm text-muted-foreground">Start tracking your nutrition</p>
                </div>

                {/* Form */}
                <div className="glass-card p-6">
                    <h2 className="mb-1 text-lg font-semibold text-foreground">Create account</h2>
                    <p className="mb-6 text-sm text-muted-foreground">Sign up to get started</p>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Alex Johnson"
                                required
                                minLength={2}
                                className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                            />
                        </div>

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

                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            Create Account
                        </button>
                    </form>

                    <div className="mt-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground">or</span>
                        <div className="h-px flex-1 bg-border" />
                    </div>

                    <a
                        href={`${API_BASE}/auth/google`}
                        className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-secondary py-2.5 text-sm font-medium text-foreground transition-all hover:bg-secondary/80"
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335"/>
                        </svg>
                        Sign up with Google
                    </a>
                </div>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-primary hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
