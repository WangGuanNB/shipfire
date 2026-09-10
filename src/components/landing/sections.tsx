import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { LandingSection } from "@/types/blocks/landing";
import { ExampleAction } from "./interactions";

function SectionFrame({ section, children }: { section: LandingSection; children: ReactNode }) {
  return (
    <section id={section.name} className="landing-section scroll-mt-24">
      <div className="container space-y-8 md:space-y-12">
        {(section.label || section.title || section.description) && (
          <header className="mx-auto max-w-3xl space-y-4 text-center">
            {section.label && <p className="landing-eyebrow text-primary">{section.label}</p>}
            {section.title && <h2 className="landing-section-title">{section.title}</h2>}
            {section.description && <p className="whitespace-pre-line leading-7 text-muted-foreground">{section.description}</p>}
          </header>
        )}
        {children}
        <SectionButtons section={section} />
      </div>
    </section>
  );
}

export function SectionButtons({ section }: { section: LandingSection }) {
  if (!section.buttons?.length) return null;
  return <div className="flex flex-wrap justify-center gap-3">{section.buttons.filter(button => button.url && button.title).map((button, index) => (
    <Button asChild key={index} variant={button.variant || "outline"}>
      <Link href={button.url!} target={button.target} rel={button.target === "_blank" ? "noopener noreferrer" : undefined}>{button.title}</Link>
    </Button>
  ))}</div>;
}

/** Compact results strip: title above, three effect images across. */
export function Examples({ section }: { section: LandingSection }) {
  const items = (section.items ?? []).slice(0, 3);
  return (
    <SectionFrame section={section}>
      <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const image = item.image?.src
            ? item.image
            : item.output?.image?.src
              ? item.output.image
              : undefined;
          return (
            <article key={index} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                {image?.src ? (
                  <img
                    src={image.src}
                    alt={image.alt || item.title || ""}
                    width={image.width || 800}
                    height={image.height || 600}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                    {item.title || "Example"}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                {item.title && <h3 className="text-base font-semibold leading-snug sm:text-lg">{item.title}</h3>}
                {item.description && (
                  <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                )}
                {item.action && (
                  <div className="mt-auto pt-1">
                    <ExampleAction {...item.action} />
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </SectionFrame>
  );
}

/** Reusable explanatory body: paragraphs, arbitrary subheadings, lists and tables. */
export function ContentSection({ section }: { section: LandingSection }) {
  return <SectionFrame section={section}>
    <div className="mx-auto max-w-4xl space-y-8">
      {section.paragraphs?.map((paragraph, index) => <p key={index} className="whitespace-pre-line leading-8 text-muted-foreground">{paragraph}</p>)}
      {section.table && <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          {section.table.caption && <caption className="p-4 text-left text-muted-foreground">{section.table.caption}</caption>}
          <thead className="bg-muted/50"><tr>{section.table.columns.map((column, i) => <th key={i} scope="col" className="px-5 py-4 font-semibold">{column}</th>)}</tr></thead>
          <tbody>{section.table.rows.map((row, i) => <tr key={i} className="border-t border-border">{row.map((cell, j) => j === 0 ? <th key={j} scope="row" className="px-5 py-4 font-medium">{cell}</th> : <td key={j} className="px-5 py-4 leading-6 text-muted-foreground">{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>}
      {section.items?.map((item, index) => <article key={index} className="space-y-4 border-t border-border pt-8 first:border-0 first:pt-0">
        {item.label && <p className="landing-eyebrow text-primary">{item.label}</p>}
        {item.title && <h3 className="text-xl font-semibold sm:text-2xl">{item.title}</h3>}
        {item.description && <p className="whitespace-pre-line leading-8 text-muted-foreground">{item.description}</p>}
        {item.paragraphs?.map((paragraph, i) => <p key={i} className="whitespace-pre-line leading-8 text-muted-foreground">{paragraph}</p>)}
        {item.image?.src && <img src={item.image.src} alt={item.image.alt || item.title || ""} width={item.image.width} height={item.image.height} loading="lazy" className="max-h-96 w-full rounded-xl object-contain" />}
        {item.list && <ul className="list-inside list-disc space-y-2 leading-7 text-muted-foreground">{item.list.map((line, i) => <li key={i}>{line}</li>)}</ul>}
        <SectionButtons section={item} />
      </article>)}
    </div>
  </SectionFrame>;
}

export function Related({ section }: { section: LandingSection }) {
  return <SectionFrame section={section}>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {section.items?.filter(item => item.url).map((item, index) => <Link key={index} href={item.url!} target={item.target} rel={item.target === "_blank" ? "noopener noreferrer" : undefined} className="landing-surface block space-y-3 p-6 transition-colors hover:border-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        {item.label && <p className="landing-eyebrow text-primary">{item.label}</p>}
        <h3 className="text-lg font-semibold">{item.title}</h3>
        {item.description && <p className="text-sm leading-7 text-muted-foreground">{item.description}</p>}
      </Link>)}
    </div>
  </SectionFrame>;
}

export function Contents({ section, items }: { section: LandingSection; items: { id: string; title: string }[] }) {
  if (!items.length) return null;
  return <nav id={section.name} aria-label={section.title} className="container scroll-mt-24 py-8">
    <div className="landing-surface mx-auto max-w-4xl space-y-4 p-6">
      {section.title && <h2 className="text-lg font-semibold">{section.title}</h2>}
      <ol className="grid list-inside list-decimal gap-3 sm:grid-cols-2">{items.map(item => <li key={item.id} className="text-sm text-muted-foreground"><a href={`#${item.id}`} className="underline-offset-4 hover:text-primary hover:underline">{item.title}</a></li>)}</ol>
    </div>
  </nav>;
}
