export function HubSkeleton() {
  return (
    <div className="w-full max-w-[1480px] mx-auto px-3 sm:px-5 lg:px-6 pb-24 pt-4">
      {/* Title */}
      <div className="pb-8 space-y-4">
        <div className="h-3 w-40 rounded bg-white/5 animate-pulse" />
        <div className="h-12 w-48 rounded-lg bg-white/[0.06] animate-pulse" />
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[
            'rgba(126,203,90,0.08)', 'rgba(79,163,227,0.08)',
            'rgba(232,129,60,0.08)', 'rgba(212,169,74,0.08)'
          ].map((bg, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 rounded-xl animate-pulse"
              style={{ background: bg, border: `1px solid ${bg.replace('0.08)', '0.15)')}` }}>
              <div className="w-2 h-2 rounded-full bg-white/10" />
              <div className="flex-1 h-2.5 rounded bg-white/10" />
              <div className="h-5 w-5 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
        {/* Queue */}
        <div className="lg:col-span-4 rounded-2xl overflow-hidden"
          style={{ background: 'rgba(14,16,14,0.8)', border: '1px solid rgba(126,203,90,0.18)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#7ecb5a]/30 animate-pulse" />
              <div className="h-2.5 w-28 rounded bg-white/8 animate-pulse" />
            </div>
          </div>
          <div className="p-3 space-y-1.5">
            {[0,1,2,3].map(i => (
              <div key={i} className="flex items-center gap-3.5 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(126,203,90,0.04)', border: '1px solid rgba(126,203,90,0.06)' }}>
                <div className="w-4 h-2 rounded bg-white/6 animate-pulse" />
                <div className="w-9 h-9 rounded-xl bg-white/6 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-2.5 w-24 rounded bg-white/8 animate-pulse" />
                  <div className="h-2 w-14 rounded bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lobby + Live */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {[
            { bg: 'rgba(10,14,20,0.85)', border: 'rgba(79,163,227,0.18)', dot: '#4fa3e3', w: 'w-24' },
            { bg: 'rgba(18,12,8,0.85)',  border: 'rgba(232,129,60,0.18)',  dot: '#e8813c', w: 'w-28' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl overflow-hidden"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
                <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: s.dot + '50' }} />
                <div className={`h-2.5 ${s.w} rounded bg-white/8 animate-pulse`} />
              </div>
              <div className="p-3">
                {i === 0 ? (
                  <div className="flex items-center px-4 py-4 rounded-xl gap-4"
                    style={{ background: 'rgba(79,163,227,0.04)', border: '1px solid rgba(79,163,227,0.08)' }}>
                    <div className="flex-1 flex justify-end gap-3 items-center">
                      <div className="h-3 w-20 rounded bg-white/8 animate-pulse" />
                      <div className="w-10 h-10 rounded-xl bg-white/6 animate-pulse" />
                    </div>
                    <div className="h-4 w-7 rounded bg-white/6 animate-pulse mx-3" />
                    <div className="flex-1 flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-xl bg-white/6 animate-pulse" />
                      <div className="h-3 w-20 rounded bg-white/8 animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <div className="min-h-[80px] flex items-center justify-center">
                    <div className="h-3 w-36 rounded bg-white/5 animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* History */}
        <div className="lg:col-span-12 rounded-2xl overflow-hidden"
          style={{ background: 'rgba(16,13,6,0.85)', border: 'rgba(212,169,74,0.18)' }}>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
            <div className="w-4 h-4 rounded bg-white/8 animate-pulse" />
            <div className="h-2.5 w-28 rounded bg-white/8 animate-pulse" />
          </div>
          <div className="p-3 space-y-1">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl">
                <div className="w-24 space-y-2 shrink-0">
                  <div className="h-2.5 w-16 rounded bg-white/6 animate-pulse" />
                  <div className="h-2 w-12 rounded bg-white/4 animate-pulse" />
                </div>
                <div className="flex-1 flex items-center justify-center gap-4">
                  <div className="flex-1 flex justify-end gap-2 items-center">
                    <div className="h-3 w-20 rounded bg-white/6 animate-pulse" />
                    <div className="w-7 h-7 rounded-lg bg-white/5 animate-pulse" />
                  </div>
                  <div className="h-3 w-8 rounded bg-white/4 animate-pulse" />
                  <div className="flex-1 flex gap-2 items-center">
                    <div className="w-7 h-7 rounded-lg bg-white/5 animate-pulse" />
                    <div className="h-3 w-20 rounded bg-white/6 animate-pulse" />
                  </div>
                </div>
                <div className="w-24 flex justify-end shrink-0">
                  <div className="h-7 w-20 rounded-lg bg-white/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
