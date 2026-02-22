import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, KeyRound, TerminalSquare } from 'lucide-react';

export default function Oracle() {
  const [token, setToken] = useState('');
  const [result, setResult] = useState<{ valid: boolean, proof?: any, error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const verifyToken = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('http://localhost:3001/api/v1/oracle/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ valid: false, error: "Network error connecting to the Oracle." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-12">
      <section className="text-center space-y-6 mt-8">
        <h1 className="text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-500 glitch-effect select-none" data-text="THE ORACLE">
          THE ORACLE
        </h1>
        <p className="text-neutral-400 font-mono text-sm max-w-xl mx-auto leading-relaxed">
          Cryptographic Proof of Combat. Verify the authenticity of any arena match by pasting its signed JWT certificate.
        </p>
      </section>

      <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-2xl p-8 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-8 pb-4 border-b border-neutral-800/50">
          <KeyRound className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-bold tracking-widest uppercase text-white">Trustless Verification Line</h2>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
             <label className="text-xs font-mono uppercase tracking-widest text-neutral-500 flex items-center gap-2">
               <TerminalSquare className="w-4 h-4" /> Input Certificate (JWT)
             </label>
             <textarea 
               value={token}
               onChange={(e) => setToken(e.target.value)}
               placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
               className="w-full h-32 bg-black/60 border border-neutral-800 rounded-xl p-4 font-mono text-sm text-neutral-300 focus:outline-none focus:border-primary/50 transition-colors resize-none break-all"
             />
          </div>

          <button 
            onClick={verifyToken}
            disabled={loading || !token.trim()}
            className="w-full py-4 bg-primary text-white font-bold tracking-widest uppercase text-sm rounded-xl shadow-[0_0_40px_-10px_rgba(239,68,68,0.5)] flex items-center justify-center gap-3 transition-colors hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify Cryptographic Signature'}
          </button>

          <AnimatePresence>
            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                className="pt-4 overflow-hidden"
              >
                {result.valid && result.proof ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 text-green-500 mb-4">
                      <ShieldCheck className="w-6 h-6" />
                      <h3 className="font-bold text-lg">Certificate Verified</h3>
                    </div>
                    
                    <div className="space-y-3 font-mono text-sm">
                       <div className="flex justify-between border-b border-green-500/10 pb-2">
                         <span className="text-green-500/60 uppercase">Match ID</span>
                         <span className="text-green-400">{result.proof.matchId}</span>
                       </div>
                       <div className="flex justify-between border-b border-green-500/10 pb-2">
                         <span className="text-green-500/60 uppercase">Winner</span>
                         <span className="text-green-400 font-bold">{result.proof.winnerId}</span>
                       </div>
                       <div className="flex justify-between pb-2">
                         <span className="text-green-500/60 uppercase">Timestamp</span>
                         <span className="text-green-400">{new Date(result.proof.timestamp).toLocaleString()}</span>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-primary/10 border border-primary/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 text-primary mb-2">
                      <ShieldAlert className="w-6 h-6" />
                      <h3 className="font-bold text-lg">Verification Failed</h3>
                    </div>
                    <p className="font-mono text-sm text-primary/80">{result.error}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
