const DashboardLoading = () => (
  <section className="main-container min-h-[calc(100dvh-6rem)] space-y-6 pb-24 pt-6 md:pb-8">
    <div className="h-9 w-48 animate-pulse rounded bg-neutral-200" />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-[210px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="hidden space-y-2 md:block">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-11 animate-pulse rounded bg-neutral-100" />
        ))}
      </div>
      <div className="col-span-2 space-y-4 md:col-span-1">
        <div className="h-24 animate-pulse rounded-lg bg-neutral-100" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default DashboardLoading;