import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import { API_URL } from '../../lib/api';

interface OnboardingFlowProps {
  session: any;
  onComplete: () => void;
}

export default function OnboardingFlow({ session, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    role: '',
    callsign: '',
    bio: '',
    sector: 'Sector 0x77-B'
  });

  const steps = [
    { title: 'Identity', desc: 'How should the arena recognize you?' },
    { title: 'Role', desc: 'What is your primary objective?' },
    { title: 'Bio', desc: 'A brief brief of your philosophy.' },
    { title: 'Sector', desc: 'Where will you be stationed?' }
  ];

  const handleComplete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/user/profile/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else handleComplete();
  };

  const isNextDisabled = () => {
    if (step === 0) return !formData.callsign.trim();
    if (step === 1) return !formData.role;
    return false;
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      {/* Simple Progress Indicator */}
      <div className="flex justify-center gap-2 mb-12">
        {steps.map((_, i) => (
          <div 
            key={i} 
            className={`h-1 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-primary' : 'w-2 bg-zinc-800'
            }`} 
          />
        ))}
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-white tracking-tight">{steps[step].title}</h1>
              <p className="text-zinc-500 text-sm">{steps[step].desc}</p>
            </div>

            {/* Content */}
            <div className="min-h-[240px] flex flex-col justify-center">
              {step === 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Combat Callsign</label>
                  <input
                    type="text"
                    placeholder="E.g. NEON_SHADOW"
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-5 text-xl font-mono text-white focus:border-primary/50 transition-all outline-none"
                    value={formData.callsign}
                    onChange={(e) => setFormData({ ...formData, callsign: e.target.value.toUpperCase() })}
                    autoFocus
                  />
                </div>
              )}

              {step === 1 && (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'commander', name: 'Commander', icon: Shield, info: 'Manages bot gladiator teams' },
                    { id: 'observer', name: 'Analyst', icon: Eye, info: 'Tracks data & Oracle markets' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setFormData({ ...formData, role: r.id })}
                      className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 text-center ${
                        formData.role === r.id ? 'border-primary bg-primary/5 text-white' : 'border-white/5 bg-zinc-900/30 text-zinc-500 hover:border-white/10'
                      }`}
                    >
                      <r.icon className="w-8 h-8" />
                      <div>
                        <div className="font-bold uppercase text-xs tracking-widest">{r.name}</div>
                        <div className="text-[10px] opacity-60 mt-1">{r.info}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Bio / Philosophy</label>
                  <textarea
                    placeholder="Short description of your tactical approach..."
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-5 text-white focus:border-primary/50 transition-all outline-none h-32 resize-none"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="grid grid-cols-1 gap-2">
                  {['Sector 0x77-B', 'Core-Alpha', 'Outer-Rim'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFormData({ ...formData, sector: s })}
                      className={`p-4 rounded-xl border-2 transition-all text-left font-mono text-xs uppercase tracking-widest ${
                        formData.sector === s ? 'border-primary bg-primary/5 text-white' : 'border-white/5 bg-zinc-900/30 text-zinc-500 hover:border-white/10'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex flex-col gap-4">
          <button
            onClick={nextStep}
            disabled={loading || isNextDisabled()}
            className="w-full py-5 bg-white text-black rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all disabled:opacity-20"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
              <>
                {step === steps.length - 1 ? 'Finish Registration' : 'Continue'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
          
          {step > 0 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="flex items-center justify-center gap-2 text-zinc-500 text-[10px] uppercase font-bold tracking-widest hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Go Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
