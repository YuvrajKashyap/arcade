export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="surface-panel h-80 animate-pulse rounded-[2rem]" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="surface-panel h-72 animate-pulse rounded-[1.75rem]" />
        <div className="surface-panel h-72 animate-pulse rounded-[1.75rem]" />
        <div className="surface-panel h-72 animate-pulse rounded-[1.75rem]" />
      </div>
    </div>
  );
}
