export const BoardSkeleton = () => (
  <div className="relative overflow-hidden" data-testid="board-skeleton">
    <main className="relative mx-auto flex min-h-screen w-full max-w-[1800px] flex-col gap-6 px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-10 lg:flex-row lg:items-start">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 lg:gap-8">
        <div className="h-40 animate-pulse rounded-[32px] bg-[var(--surface-strong)] sm:h-48" />
        <div className="board-columns gap-4 overflow-hidden sm:gap-5 lg:gap-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-[420px] min-w-0 animate-pulse rounded-3xl bg-[var(--surface-strong)] sm:h-[520px]"
            />
          ))}
        </div>
      </div>
      <div className="h-[min(42vh,420px)] min-h-[280px] w-full shrink-0 animate-pulse rounded-3xl bg-[var(--surface-strong)] lg:h-[calc(100vh-3rem)] lg:w-[300px] xl:w-[340px] 2xl:w-[380px]" />
    </main>
  </div>
);
