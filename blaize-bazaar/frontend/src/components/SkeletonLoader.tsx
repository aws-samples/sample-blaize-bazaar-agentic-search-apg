const SkeletonLoader = () => {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-purple-500/20 rounded w-3/4"></div>
      <div className="h-4 bg-purple-500/20 rounded w-1/2"></div>
      <div className="h-4 bg-purple-500/20 rounded w-5/6"></div>
    </div>
  )
}

export const ProductCardSkeleton = () => {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-purple-500/20 animate-pulse">
      <div className="flex gap-4">
        <div className="w-20 h-20 bg-purple-500/20 rounded-lg"></div>
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-purple-500/20 rounded w-3/4"></div>
          <div className="h-4 bg-purple-500/20 rounded w-1/2"></div>
          <div className="h-6 bg-purple-500/20 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  )
}

export default SkeletonLoader
