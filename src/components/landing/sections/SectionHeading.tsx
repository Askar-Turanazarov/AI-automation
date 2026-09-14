import clsx from "clsx";
import type { ReactNode } from "react";
import { Reveal } from "@/components/landing/Reveal";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow"><span className="h-px w-8 bg-forge" /> {children}</span>;
}

/** Надзаголовок + h2 «titleA <molten>titleB</molten>»; lead — абзац справа от заголовка */
export function SectionHeading({ text }: { text: { eyebrow: string; titleA: string; titleB: string; lead?: string } }) {
  const title = (
    <h2 className={clsx(text.lead ? "max-w-2xl" : "mt-5", "font-display text-4xl font-bold uppercase leading-none md:text-6xl")}>
      {text.titleA} <span className="text-molten">{text.titleB}</span>
    </h2>
  );
  return (
    <Reveal>
      <Eyebrow>{text.eyebrow}</Eyebrow>
      {text.lead ? (
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          {title}
          <p className="max-w-md text-fog">{text.lead}</p>
        </div>
      ) : (
        title
      )}
    </Reveal>
  );
}
