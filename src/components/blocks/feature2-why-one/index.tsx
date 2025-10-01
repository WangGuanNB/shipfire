"use client";

import { Badge } from "@/components/ui/badge";
import Icon from "@/components/icon";
import { Section as SectionType } from "@/types/blocks/section";
import { Sparkles } from 'lucide-react';

export default function Feature2WhyOne({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

  const getGridClass = (itemCount: number) => {
    if (itemCount === 3) {
      return "grid gap-8 grid-cols-1 md:grid-cols-3";
    } else if (itemCount === 4) {
      return "grid gap-8 sm:grid-cols-2 lg:grid-cols-4";
    } else {
      return "grid gap-8 sm:grid-cols-2 lg:grid-cols-3";
    }
  };

  return (
    <section id={section.name} className="py-16 bg-muted/20">
      <div className="container">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            {section.label && (
              <Badge variant="outline" className="mb-4 text-sm font-medium">
                <Sparkles className="mr-2 size-4" />
                {section.label}
              </Badge>
            )}
            {section.title && (
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-2">
                {section.title}
              </h2>
            )}
            {section.description && (
              <p className="mx-auto max-w-4xl text-lg text-muted-foreground">
                {section.description}
              </p>
            )}
          </div>
          

          {section.items && (
            <div className={getGridClass(section.items.length)}>
              {section.items.map((item, i) => (
                <div key={i} className="text-center group h-full flex flex-col">
                  <div className="mx-auto mb-6 flex size-16 items-center justify-center cursor-pointer">
                    <div className="relative flex size-full items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                      <div className="absolute inset-0 bg-primary rounded-2xl shadow-lg transition-all duration-300 group-hover:shadow-xl"></div>
                      
                      {item.icon && (
                        <div className="relative z-10 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                          <Icon
                            name={item.icon}
                            className="size-8 text-white drop-shadow-sm transition-all duration-300 group-hover:drop-shadow-md"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 transition-all duration-300 group-hover:transform group-hover:-translate-y-1 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      {item.title && (
                        <h3 className="text-xl font-bold text-foreground transition-colors duration-300 group-hover:text-primary">
                          {item.title}
                        </h3>
                      )}
                      {item.description && (
                        <p className="text-muted-foreground leading-relaxed text-sm px-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}