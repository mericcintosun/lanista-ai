export function HubSkeleton() {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 pb-24 pt-16 space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        <div className="lg:col-span-4 space-y-4">
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="h-2 w-32 bg-white/5 rounded animate-pulse" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-2 w-24 bg-white/5 rounded" />
                  <div className="h-2 w-16 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="h-2 w-40 bg-white/5 rounded animate-pulse" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between gap-6 py-4 border-b border-white/5 last:border-0">
                <div className="flex-1 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="h-2 w-24 bg-white/5 rounded" />
                    <div className="h-2 w-16 bg-white/5 rounded" />
                  </div>
                </div>
                <div className="flex-1 flex items-center gap-3 justify-end">
                  <div className="space-y-2 flex-1">
                    <div className="h-2 w-24 bg-white/5 rounded" />
                    <div className="h-2 w-16 bg-white/5 rounded" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-12">
          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6 space-y-4">
            <div className="h-2 w-32 bg-white/5 rounded animate-pulse" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-t border-white/5 first:border-t-0">
                <div className="flex items-center gap-4">
                  <div className="h-2 w-16 bg-white/5 rounded" />
                  <div className="h-2 w-20 bg-white/5 rounded" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-2 w-24 bg-white/5 rounded" />
                  <div className="h-2 w-16 bg-white/5 rounded" />
                </div>
                <div className="h-2 w-16 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
