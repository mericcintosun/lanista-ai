import { forwardRef, useRef, useState, useEffect } from 'react';
import { Maximize2, RefreshCw } from 'lucide-react';

interface UnityFrameProps {
  onRefresh: () => void;
  onFullscreen: () => void;
  isLoading: boolean;
  hudOverlay?: React.ReactNode;
}

export const UnityFrame = forwardRef<HTMLIFrameElement, UnityFrameProps>(
  ({ onRefresh, onFullscreen, isLoading, hudOverlay }, ref) => {
    const fullscreenRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
      const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', handleChange);
      return () => document.removeEventListener('fullscreenchange', handleChange);
    }, []);

    const handleFullscreen = () => {
      if (fullscreenRef.current) {
        fullscreenRef.current.requestFullscreen?.();
      } else {
        onFullscreen();
      }
    };

    return (
      <>
      <style>{`
        /* Normal fullscreen (no HUD): center the game full-screen */
        .unity-fullscreen-wrapper:fullscreen {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: #000 !important;
          border-radius: 0 !important;
          border: none !important;
        }
        .unity-fullscreen-wrapper:fullscreen .unity-game-inner {
          width: min(100vw, 177.78vh) !important;
          height: min(100vh, 56.25vw) !important;
          max-width: 100vw !important;
          max-height: 100vh !important;
          aspect-ratio: 16/9 !important;
        }

        /* HUD active fullscreen: game fills entire screen, HUD overlays on top */
        .unity-fullscreen-wrapper:fullscreen.has-hud .unity-game-inner {
          width: min(100vw, 177.78vh) !important;
          height: min(100vh, 56.25vw) !important;
          max-width: 100vw !important;
          max-height: 100vh !important;
          aspect-ratio: 16/9 !important;
        }
      `}</style>
      <div
        ref={fullscreenRef}
        className={`unity-fullscreen-wrapper relative group aspect-video lg:aspect-[16/9] w-full bg-black rounded-2xl overflow-hidden border border-blue-500/20 shadow-2xl flex items-center justify-center${isFullscreen && hudOverlay ? ' has-hud' : ''}`}
      >
        <div className="unity-game-container absolute inset-0 w-full h-full flex items-center justify-center">
          <div className="unity-game-inner w-full h-full aspect-video max-w-full max-h-full">
            <iframe
              ref={ref}
              src="/lanista-build/game.html"
              className="w-full h-full border-none shadow-inner"
              title="Lanista AI Arena"
              allow="autoplay; fullscreen"
              loading="eager"
            />
          </div>
        </div>

        {/* Fullscreen HUD overlay */}
        {isFullscreen && hudOverlay}

        {/* Default hover controls (hidden in fullscreen since HUD provides its own) */}
        {!isFullscreen && (
          <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-10">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:border-white/30 transition-all active:scale-95 disabled:opacity-50"
              title="Reload Scene"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleFullscreen}
              className="p-2.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:border-white/30 transition-all active:scale-95"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <div className="font-mono text-xs text-blue-400 animate-pulse tracking-widest uppercase">Loading...</div>
            </div>
          </div>
        )}
      </div>
      </>
    );
  }
);

UnityFrame.displayName = 'UnityFrame';
