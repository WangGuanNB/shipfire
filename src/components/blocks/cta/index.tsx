import { Button } from "@/components/ui/button";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import { Section as SectionType } from "@/types/blocks/section";

export default function CTA({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

  return (
    <section id={section.name} className="landing-section relative overflow-hidden">
      <div aria-hidden className="landing-cta-mask pointer-events-none absolute inset-0" />
      <div className="container relative z-10">
        <div className="mx-auto max-w-(--breakpoint-md) text-center">
          {section.title && (
            <h2 className="landing-section-title mb-4">{section.title}</h2>
          )}
          {section.description && (
            <p className="mx-auto max-w-2xl text-muted-foreground md:text-lg">
              {section.description}
            </p>
          )}
          {section.buttons && section.buttons.length > 0 && (
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {section.buttons.map((item, idx) => (
                <Button
                  asChild
                  key={idx}
                  size="lg"
                  variant={item.variant || (idx === 0 ? "default" : "outline")}
                >
                  <Link
                    href={item.url || ""}
                    target={item.target}
                    className="flex items-center justify-center gap-2"
                  >
                    {item.icon && <Icon name={item.icon as string} className="size-5" />}
                    {item.title}
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
