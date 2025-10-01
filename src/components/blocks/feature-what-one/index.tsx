'use client';
import { useTranslations } from 'next-intl';
import Icon from "@/components/icon";
import { Section as SectionType } from "@/types/blocks/section";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

export default function FeatureWhatOne({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }
  

  return (
    <section id={section.name} className="py-8 bg-muted/30">
      <div className="container">
        <div className="mx-auto max-w-7xl">
          {/* Title area */}
          <div className="text-center mb-8">
            {section.label && (
              <Badge variant="outline" className="mb-2 text-sm font-medium">
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
              <p className="text-base text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                {section.description}
              </p>
            )}
          </div>

          {/* Cards grid */}
          {section.items && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"> 
              {section.items.map((item, i) => (
                <Card 
                  key={i} 
                  className="group transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-border bg-card shadow-lg h-full flex flex-col"
                >
                  <CardHeader className="pb-2 pt-3 px-3">
                    <div className="flex items-center justify-between mb-2">
                      {item.icon && (
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Icon name={item.icon} className="size-5" />
                        </div>
                      )}
                    </div>
                    {item.title && (
                      <CardTitle className="text-base group-hover:text-primary transition-colors leading-tight">
                        {item.title}
                      </CardTitle>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0 px-3 pb-3 flex-1 flex flex-col justify-between">
                    {item.description && (
                      <p className="text-sm text-muted-foreground leading-snug">
                        {item.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}