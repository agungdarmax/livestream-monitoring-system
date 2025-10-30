export default function StreamSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Table Skeleton */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="bg-white/5 p-4">
          <div className="grid grid-cols-5 gap-4">
            <div className="h-4 bg-white/10 rounded"></div>
            <div className="h-4 bg-white/10 rounded"></div>
            <div className="h-4 bg-white/10 rounded"></div>
            <div className="h-4 bg-white/10 rounded"></div>
            <div className="h-4 bg-white/10 rounded"></div>
          </div>
        </div>

        {/* Table Rows */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border-t border-white/10">
            <div className="grid grid-cols-5 gap-4 items-center">
              <div className="h-4 bg-white/10 rounded"></div>
              <div className="h-4 bg-white/10 rounded"></div>
              <div className="h-3 bg-white/10 rounded"></div>
              <div className="h-6 bg-white/10 rounded-full w-20"></div>
              <div className="flex gap-2">
                <div className="h-8 bg-white/10 rounded w-16"></div>
                <div className="h-8 bg-white/10 rounded w-16"></div>
                <div className="h-8 bg-white/10 rounded w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}