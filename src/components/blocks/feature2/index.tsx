"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import Fade from "embla-carousel-fade";
import Icon from "@/components/icon";
import { Section as SectionType } from "@/types/blocks/section";

const DURATION = 5000;

export default function Feature2({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

  const [api, setApi] = useState<CarouselApi>();
  const [currentAccordion, setCurrentAccordion] = useState("1");

  useEffect(() => {
    api?.scrollTo(+currentAccordion - 1);
    const interval = setInterval(() => {
      setCurrentAccordion((prev) => {
        const next = parseInt(prev) + 1;
        return next > 3 ? "1" : next.toString();
      });
    }, DURATION);

    return () => clearInterval(interval);
  }, [api, currentAccordion]);

  return (
    <section id={section.name} className="py-32">
      <div className="container">
        <div className="mx-auto max-w-3xl lg:max-w-4xl">
          {section.label && (
            <Badge variant="outline" className="mb-4">
              {section.label}
            </Badge>
          )}
          <h2 className="mb-6 text-pretty text-3xl font-bold lg:text-4xl">
            {section.title}
          </h2>
          <p className="text-lg text-muted-foreground lg:text-xl">
            {section.description}
          </p>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:items-stretch">
          <div className="flex h-full flex-col">
            <Accordion
              type="single"
              value={currentAccordion}
              onValueChange={(value) => {
                setCurrentAccordion(value);
                if (value) {
                  api?.scrollTo(+value - 1);
                }
              }}
              className="space-y-4"
            >
              {section.items?.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={(i + 1).toString()}
                  className="rounded-xl border border-border/60 bg-background/90 px-4"
                >
                  <AccordionTrigger className="gap-4 py-4 text-left text-base font-semibold lg:text-lg">
                    <div className="flex items-center gap-3">
                      {item.icon && (
                        <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
                          <Icon
                            name={item.icon}
                            className="size-5 shrink-0 text-primary"
                          />
                        </span>
                      )}
                      <span>{item.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 text-sm text-muted-foreground lg:text-base">
                    {item.description}
                    <div className="mt-6 h-px w-full bg-muted">
                      <div
                        className="h-px animate-progress bg-primary"
                        style={{ animationDuration: `${DURATION}ms` }}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <div className="flex h-full items-center rounded-3xl border border-border/60 bg-background/90 p-3 shadow-sm">
            <Carousel
              opts={{
                duration: 50,
              }}
              setApi={setApi}
              plugins={[Fade()]}
            >
              <CarouselContent>
                {section.items?.map((item, i) => (
                  <CarouselItem key={i}>
                    <div className="h-full min-h-[320px] overflow-hidden rounded-2xl lg:min-h-[420px]">
                      <img
                        src={item.image?.src}
                        alt={item.image?.alt || item.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      </div>
    </section>
  );
}
