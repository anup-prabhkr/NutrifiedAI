import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Flame, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Login: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            toast.error(err.message || 'Login failed');
        } finally {
            setLoading(false);
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
