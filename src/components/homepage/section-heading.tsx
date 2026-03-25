type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-accent">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-[2.15rem]">
        {title}
      </h2>
      <p className="mt-4 text-base leading-8 text-foreground-soft">
        {description}
      </p>
    </div>
  );
}
