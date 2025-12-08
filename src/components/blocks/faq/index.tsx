import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Section as SectionType } from "@/types/blocks/section";
import { Link } from "@/i18n/navigation";

export default function FAQ({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

  return (
    <section id={section.name} className="py-12 md:py-20">
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-start">
          {/* 左侧：标题和描述 */}
          <div className="space-y-6">
            {section.label && (
              <Badge variant="outline" className="mb-4">
                {section.label}
              </Badge>
            )}
            <h2 className="text-balance text-4xl font-medium lg:text-5xl">
              {section.title}
            </h2>
            {section.description && (
              <p className="text-muted-foreground lg:text-lg">
                {section.description}
              </p>
            )}
            {section.buttons && section.buttons.length > 0 && (
              <div className="pt-4">
                <Button asChild size="lg">
                  <Link href={section.buttons[0].url || "#"}>
                    {section.buttons[0].title}
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* 右侧：问题列表 */}
          <div className="lg:pl-8">
            <Accordion type="single" collapsible className="w-full">
              {section.items?.map((item, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border-0 border-b border-border last:border-b-0 py-4 first:pt-0"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-0">
                    <span className="text-base font-semibold pr-8">
                      {item.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-0">
                    <p className="text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
