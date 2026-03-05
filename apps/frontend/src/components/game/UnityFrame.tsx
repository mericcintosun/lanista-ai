import { forwardRef } from 'react';
import { Maximize2, RefreshCw } from 'lucide-react';

interface UnityFrameProps {
  onRefresh: () => void;
  onFullscreen: () => void;
  isLoading: boolean;
}

export const UnityFrame = forwardRef<HTMLIFrameElement, UnityFrameProps>(
  ({ onRefresh, onFullscreen, isLoading }, ref) => {
    return (
      <div className="relative group aspect-video lg:aspect-[16/9] w-full bg-black rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
        <iframe
          ref={ref}
          src="/lanista-build/game.html"
          className="w-full h-full border-none shadow-inner"
          title="Lanista AI Arena"
          allow="autoplay; fullscreen"
        />

        {/* HUD Overlay / Controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:border-white/30 transition-all active:scale-95 disabled:opacity-50"
            title="Reload Scene"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onFullscreen}
            className="p-2.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:border-white/30 transition-all active:scale-95"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Loading overlay if needed */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="font-mono text-xs text-primary animate-pulse tracking-widest uppercase">Initializing Neural Link...</div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

UnityFrame.displayName = 'UnityFrame';
