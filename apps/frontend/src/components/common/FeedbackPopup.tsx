import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircleHeart, ThumbsUp, ThumbsDown } from 'lucide-react';

const FEEDBACK_STORAGE_KEY = 'lanista_feedback_state';

interface FeedbackState {
  shownCount: number;
  lastShown: number;
  answered: boolean;
}

export function FeedbackPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [isThanks, setIsThanks] = useState(false);
  const [showFormLink, setShowFormLink] = useState(false);

  useEffect(() => {
    // Wait a bit before showing to not overwhelm the user immediately on load
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
        const state: FeedbackState = stored ? JSON.parse(stored) : { shownCount: 0, lastShown: 0, answered: false };

        if (state.answered || state.shownCount >= 3) {
          return;
        }

        const twelveHoursInMs = 12 * 60 * 60 * 1000;
        const timeSinceLastSeen = Date.now() - state.lastShown;

        if (timeSinceLastSeen >= twelveHoursInMs || state.shownCount === 0) {
          setIsVisible(true);
          const newState = {
            ...state,
            shownCount: state.shownCount + 1,
            lastShown: Date.now(),
          };
          localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(newState));
        }
      } catch (err) {
        console.error('Failed to read feedback state', err);
      }
    }, 5000); // show after 5 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleAnswer = (satisfied: boolean) => {
    try {
      const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      const state: FeedbackState = stored ? JSON.parse(stored) : { shownCount: 1, lastShown: Date.now(), answered: false };
      
      // Do not set answered to true automatically while testing.
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify({ ...state, answered: true }));
    } catch (err) {
      console.error('Failed to save feedback state', err);
    }

    if (!satisfied) {
      setShowFormLink(true);
    } else {
      setIsThanks(true);
      setTimeout(() => setIsVisible(false), 3000);
    }
  };

  const submitFormAndClose = () => {
    window.open('https://forms.gle/HkhSb6SsZ53SK1FJ9', '_blank');
    setIsThanks(true);
    setShowFormLink(false);
    setTimeout(() => setIsVisible(false), 3000);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
          className="fixed bottom-6 left-6 sm:bottom-8 sm:left-8 z-[100] w-[calc(100vw-3rem)] sm:w-[320px] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-5 flex flex-col"
        >
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {!isThanks && !showFormLink ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
                  <MessageCircleHeart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-white font-bold italic tracking-tight leading-tight">Enjoying Lanista?</h4>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">We'd love your feedback!</p>
                </div>
              </div>

              <p className="text-sm text-zinc-300 font-mono leading-relaxed mb-5">
                Are you satisfied with your experience on Lanista so far?
              </p>

              <div className="flex gap-3 mt-auto">
                <button
                  onClick={() => handleAnswer(false)}
                  className="flex-1 py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/40 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <ThumbsDown className="w-4 h-4" /> Nope
                </button>
                <button
                  onClick={() => handleAnswer(true)}
                  className="flex-1 py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <ThumbsUp className="w-4 h-4" /> Yes!
                </button>
              </div>
            </>
          ) : showFormLink ? (
            <div className="py-2 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                 <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30">
                   <ThumbsDown className="w-5 h-5 text-red-500" />
                 </div>
                 <div>
                   <h4 className="text-white font-bold italic tracking-tight leading-tight">We're sorry to hear that</h4>
                   <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Help us improve</p>
                 </div>
              </div>
              <p className="text-sm text-zinc-300 font-mono leading-relaxed mb-4">
                Please let us know how we can make Lanista better for you by filling out a quick feedback form.
              </p>
              <button
                onClick={submitFormAndClose}
                className="w-full py-3 px-4 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-all text-center"
              >
                Provide Feedback
              </button>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3 border border-emerald-500/30">
                <MessageCircleHeart className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="text-white font-bold italic text-lg tracking-tight mb-1">Thank You!</h4>
              <p className="text-xs text-zinc-400 font-mono max-w-[200px]">
                Your feedback helps us make Lanista Arena better.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
