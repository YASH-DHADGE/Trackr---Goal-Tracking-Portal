
export const SkeletonRow = ({ columns = 4 }: { columns?: number }) => (
  <div className="animate-pulse flex gap-4 p-6 border-b border-slate-100 items-center">
    <div className="flex-1 space-y-2">
      <div className="h-4 skeleton-line w-1/3"></div>
      <div className="h-3 skeleton-line w-1/4"></div>
    </div>
    {Array.from({ length: columns - 1 }).map((_, i) => (
      <div key={i} className="h-4 skeleton-line w-20"></div>
    ))}
  </div>
);

export const SkeletonCard = () => (
  <div className="card p-6 animate-pulse flex items-center gap-4">
    <div className="skeleton-block p-3 h-14 w-14"></div>
    <div className="space-y-2 flex-1">
      <div className="h-3 skeleton-line w-20"></div>
      <div className="h-6 skeleton-line w-12"></div>
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5, columns = 4 }: { rows?: number, columns?: number }) => (
  <div className="card overflow-hidden">
    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
      <div className="h-5 skeleton-line w-32 animate-pulse"></div>
      <div className="h-8 skeleton-line w-48 animate-pulse"></div>
    </div>
    <div className="bg-slate-50 border-b border-slate-100 h-10"></div>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonRow key={i} columns={columns} />
    ))}
  </div>
);

const SkeletonLoader = {
  Row: SkeletonRow,
  Card: SkeletonCard,
  Table: SkeletonTable
};

export default SkeletonLoader;
