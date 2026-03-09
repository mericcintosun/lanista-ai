import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { X, Mail, Lock, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

interface UserAuthModalProps {
  onClose: () => void;
}

import { useNavigate } from 'react-router-dom';

export function UserAuthModal({ onClose }: UserAuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  useLockBodyScroll(true);

  const handleAuthSuccess = () => {
    onClose();
    navigate('/profile?newAuth=true');
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        handleAuthSuccess();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            },
            emailRedirectTo: `${window.location.origin}/profile?newAuth=true`,
          },
        });
        if (signUpError) throw signUpError;
        
        // If email confirmation is enabled, session will be null
        if (data.session === null) {
          setSuccess("Success! Please check your email (and spam folder) for a confirmation link to activate your account.");
          setLoading(false);
          return; // Don't close modal, let them read the message
        }
        
        handleAuthSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/profile?newAuth=true`,
        },
      });
      if (googleError) throw googleError;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] grid place-items-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          layout
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Subtle grid background & glow */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

          {/* Top glowing accent line */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

          {/* Header */}
          <div className="relative flex justify-between items-center px-8 pt-8 pb-4">
            <motion.div layout="position">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                {isLogin ? 'Welcome Back' : 'Join Lanista'}
              </h2>
              <p className="text-zinc-500 text-sm mt-1 font-mono">
                {isLogin ? 'Authenticate to enter the arena.' : 'Register your player identity.'}
              </p>
            </motion.div>
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative px-8 pb-8 pt-2">
            {error && (
              <motion.div 
                layout="position"
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div 
                layout="position"
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{success}</p>
              </motion.div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <AnimatePresence initial={false}>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ ease: "easeInOut", duration: 0.3 }}
                    className="flex gap-4 overflow-hidden"
                  >
                    <div className="space-y-1.5 flex-1 pt-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">First Name</label>
                      <div className="relative group">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                        <input
                          type="text"
                          required={!isLogin}
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-primary/50 focus:bg-zinc-900 transition-all text-sm"
                          placeholder="Lany"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1 pt-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Last Name</label>
                      <div className="relative group">
                        <input
                          type="text"
                          required={!isLogin}
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-3 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-primary/50 focus:bg-zinc-900 transition-all text-sm"
                          placeholder="Cintosun"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div layout="position" className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-primary/50 focus:bg-zinc-900 transition-all text-sm"
                    placeholder="lany@lanista.com"
                  />
                </div>
              </motion.div>

              <motion.div layout="position" className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-primary/50 focus:bg-zinc-900 transition-all text-sm"
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
              </motion.div>

              <motion.button
                layout="position"
                type="submit"
                disabled={loading}
                className="group relative w-full py-3.5 px-4 bg-primary text-white font-bold rounded-xl transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 overflow-hidden"
              >
                {/* Button shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isLogin ? 'Complete Login' : 'Create Identity'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </motion.button>
            </form>

            <motion.div layout="position" className="mt-8 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                <span className="bg-[#0a0a0a] px-4 text-zinc-600">Or continue with</span>
              </div>
            </motion.div>

            <motion.button
              layout="position"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="mt-6 w-full py-3.5 px-4 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google Account
            </motion.button>

            <motion.div layout="position" className="mt-8 flex items-center justify-center gap-2 text-sm font-mono border-t border-white/5 pt-6">
              <span className="text-zinc-500">
                {isLogin ? "New to the arena?" : 'Already a player?'}
              </span>
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:text-primary/80 font-bold transition-colors uppercase text-xs tracking-wider"
              >
                {isLogin ? 'Sign Up Now' : 'Sign In'}
              </button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
