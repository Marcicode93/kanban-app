export const BoardSkeleton = () => (
  <div className="relative overflow-hidden" data-testid="board-skeleton">
    <main className="relative mx-auto flex min-h-screen max-w-[1800px] gap-6 px-6 pb-16 pt-12">
      <div className="flex min-w-0 flex-1 flex-col gap-10">
        <div className="h-48 animate-pulse rounded-[32px] bg-white/80" />
        <div className="flex gap-6 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-[520px] min-w-[260px] flex-1 animate-pulse rounded-3xl bg-white/70"
            />
          ))}
        </div>
      </div>
      <div className="hidden h-[calc(100vh-6rem)] w-[380px] animate-pulse rounded-3xl bg-white/70 lg:block" />
    </main>
  </div>
);
