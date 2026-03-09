import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Eye, Loader2, CheckCircle2, AlertCircle, ImagePlus, Link2 } from 'lucide-react';
import { API_URL } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

interface EditProfileModalProps {
  onClose: () => void;
  session: { access_token: string; user: { id: string } };
  profileData: {
    role?: string | null;
    callsign?: string;
    bio?: string;
    avatarUrl?: string | null;
    xUrl?: string | null;
    discordUrl?: string | null;
    websiteUrl?: string | null;
    publicUsername?: string | null;
  } | null;
  onSuccess: () => void;
}

export function EditProfileModal({
  onClose,
  session,
  profileData,
  onSuccess,
}: EditProfileModalProps) {
  useLockBodyScroll(true);
  const [formData, setFormData] = useState({
    role: '',
    callsign: '',
    bio: '',
    xUrl: '',
    discordUrl: '',
    websiteUrl: '',
    publicUsername: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profileData) {
      setFormData({
        role: profileData.role || '',
        callsign: profileData.callsign || '',
        bio: profileData.bio || '',
        xUrl: profileData.xUrl || '',
        discordUrl: profileData.discordUrl || '',
        websiteUrl: profileData.websiteUrl || '',
        publicUsername: profileData.publicUsername || '',
      });
      setAvatarPreview(profileData.avatarUrl || null);
    }
  }, [profileData]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 5 * 1024 * 1024 && /^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let avatarUrl = profileData?.avatarUrl ?? null;
      const userId = session.user.id;

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() || 'jpg';
        const path = `${userId}/avatar.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('profile-media')
          .upload(path, avatarFile, { upsert: true });
        if (uploadErr) throw new Error(uploadErr.message);
        const { data: urlData } = supabase.storage.from('profile-media').getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      const res = await fetch(`${API_URL}/user/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          role: formData.role || profileData?.role || 'commander',
          callsign: formData.callsign,
          bio: formData.bio,
          avatarUrl: avatarUrl || undefined,
          xUrl: formData.xUrl || undefined,
          discordUrl: formData.discordUrl || undefined,
          websiteUrl: formData.websiteUrl || undefined,
          publicUsername: formData.publicUsername || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setSuccess('Profile updated successfully.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
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
          transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

          <div className="relative flex justify-between items-center px-8 pt-8 pb-4">
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                Edit Profile
              </h2>
              <p className="text-zinc-500 text-sm mt-1 font-mono">
                Update your player identity.
              </p>
            </div>
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
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{success}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
                    Avatar
                  </label>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-white/20 bg-zinc-900/50 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-all"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus className="w-8 h-8 text-zinc-500" />
                    )}
                  </button>
                  <p className="text-[9px] text-zinc-600">Max 5MB</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
                  Combat Callsign
                </label>
                <input
                  type="text"
                  placeholder="E.g. NEON_SHADOW"
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3.5 text-white font-mono focus:border-primary/50 transition-all outline-none"
                  value={formData.callsign}
                  onChange={(e) =>
                    setFormData({ ...formData, callsign: e.target.value.toUpperCase() })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'commander', name: 'Player', icon: Shield, info: 'Manages Lany teams' },
                    { id: 'observer', name: 'Spectator', icon: Eye, info: 'Follows matches & stats' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: r.id })}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-center ${
                        formData.role === r.id
                          ? 'border-primary bg-primary/5 text-white'
                          : 'border-white/5 bg-zinc-900/30 text-zinc-500 hover:border-white/10'
                      }`}
                    >
                      <r.icon className="w-6 h-6" />
                      <div>
                        <div className="font-bold uppercase text-xs tracking-widest">{r.name}</div>
                        <div className="text-[10px] opacity-60 mt-0.5">{r.info}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
                  Bio / Philosophy
                </label>
                <textarea
                  placeholder="Short description of your tactical approach..."
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3.5 text-white focus:border-primary/50 transition-all outline-none h-24 resize-none"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <Link2 className="w-3 h-3" /> Social Links
                </label>
                <input
                  type="url"
                  placeholder="https://x.com/username"
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-primary/50 transition-all outline-none placeholder:text-zinc-600"
                  value={formData.xUrl}
                  onChange={(e) => setFormData({ ...formData, xUrl: e.target.value })}
                />
                <input
                  type="url"
                  placeholder="https://discord.gg/..."
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-primary/50 transition-all outline-none placeholder:text-zinc-600"
                  value={formData.discordUrl}
                  onChange={(e) => setFormData({ ...formData, discordUrl: e.target.value })}
                />
                <input
                  type="url"
                  placeholder="https://your-website.com"
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-primary/50 transition-all outline-none placeholder:text-zinc-600"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
                  Public Profile URL
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm font-mono shrink-0">/profile/</span>
                  <input
                    type="text"
                    placeholder="username"
                    className="flex-1 bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white font-mono text-sm focus:border-primary/50 transition-all outline-none placeholder:text-zinc-600 lowercase"
                    value={formData.publicUsername}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        publicUsername: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
                      })
                    }
                  />
                </div>
                <p className="text-[9px] text-zinc-600">Letters, numbers, underscore, hyphen only. Unique.</p>
              </div>

              <button
                type="submit"
                disabled={loading || !formData.callsign.trim()}
                className="group relative w-full py-3.5 px-4 bg-primary text-white font-bold rounded-xl transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 overflow-hidden"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Save Changes</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
