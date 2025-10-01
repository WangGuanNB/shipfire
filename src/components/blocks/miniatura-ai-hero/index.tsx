'use client';

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import HeroBg from "../hero/bg";

interface MiniaturaAIHeroImage {
  src: string;
  alt: string;
  title: string;
}

interface MiniaturaAIHeroBadge {
  label: string;
  icon: string;
  color: string;
}

interface MiniaturaAIHeroStat {
  value: string;
  label: string;
  icon: string;
}

interface MiniaturaAIHeroButton {
  title: string;
  icon?: string;
  url: string;
  target: string;
  variant: string;
}

interface MiniaturaAIHeroAnnouncement {
  label: string;
  title: string;
  url: string;
}

interface MiniaturaAIHeroType {
  title: string;
  highlight_text: string;
  description: string;
  announcement?: MiniaturaAIHeroAnnouncement;
  badges?: MiniaturaAIHeroBadge[];
  images?: MiniaturaAIHeroImage[];
  layout: string;
  enable_carousel: boolean;
  buttons?: MiniaturaAIHeroButton[];
  stats?: MiniaturaAIHeroStat[];
  show_happy_users: boolean;
  show_badge: boolean;
  disabled?: boolean;
}

export default function MiniaturaAIHero({ hero }: { hero: MiniaturaAIHeroType }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 图片轮播逻辑
  useEffect(() => {
    if (hero.enable_carousel && hero.images && hero.images.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => 
          prev === hero.images!.length - 1 ? 0 : prev + 1
        );
      }, 5000); // 5秒切换一次

      return () => clearInterval(interval);
    }
  }, [hero.enable_carousel, hero.images]);

  if (hero.disabled) {
    return null;
  }

  const highlightText = hero.highlight_text;
  let texts = null;
  if (highlightText) {
    texts = hero.title?.split(highlightText, 2);
  }

  const getBadgeColorClass = (color: string) => {
    const colorMap: { [key: string]: string } = {
      green: "bg-green-500/10 text-green-600 border-green-200",
      blue: "bg-blue-500/10 text-blue-600 border-blue-200", 
      purple: "bg-purple-500/10 text-purple-600 border-purple-200",
      orange: "bg-orange-500/10 text-orange-600 border-orange-200"
    };
    return colorMap[color] || "bg-gray-500/10 text-gray-600 border-gray-200";
  };

  return (
    <>
      <HeroBg />
      <section className="py-8 lg:py-16">
        <div className="container max-w-7xl">
          {hero.show_badge && (
            <div className="flex items-center justify-center mb-8">
              <img
                src="/imgs/badges/phdaily.svg"
                alt="AI Powered Badge"
                className="h-10 object-cover"
              />
            </div>
          )}

          {/* 主标题 */}
          <div className="text-center mb-8">
            {hero.announcement && (
              <Link
                href={hero.announcement.url as any}
                className="mx-auto mb-6 inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
              >
                <Badge className="bg-orange-500 text-white">
                  {hero.announcement.label}
                </Badge>
                {hero.announcement.title}
              </Link>
            )}

            {texts && texts.length > 1 ? (
              <h1 className="mx-auto mb-8 max-w-6xl text-balance text-3xl font-bold lg:text-6xl xl:text-7xl">
                {texts[0]?.split('\n').map((line, index, array) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < array.length - 1 && <br />}
                  </React.Fragment>
                ))}
                <span className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
                  {highlightText}
                </span>
                {texts[1]?.split('\n').map((line, index, array) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < array.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </h1>
            ) : (
              <h1 className="mx-auto mb-8 max-w-6xl text-balance text-3xl font-bold lg:text-6xl xl:text-7xl">
                {hero.title?.split('\n').map((line, index, array) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < array.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </h1>
            )}
          </div>

          {/* 中间徽章区域 */}
          {/* {hero.badges && (
            <div className="flex flex-wrap gap-4 justify-center mb-12">
              {hero.badges.map((badge, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className={`px-4 py-2 text-sm font-medium ${getBadgeColorClass(badge.color)}`}
                >
                  <Icon name={badge.icon} className="mr-2" />
                  {badge.label}
                </Badge>
              ))}
            </div>
          )} */}

          {/* 下方左图右内容布局 */}
          {hero.layout === "left-image-right-content" ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
              {/* 左侧图片区域 */}
              <div className="order-2 lg:order-1">
                {hero.images && hero.images.length > 0 ? (
                  <div className="relative w-full">
                    <Card className="overflow-hidden shadow-lg">
                      <CardContent className="p-0">
                        <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                          <img
                            src={hero.images[currentImageIndex]?.src}
                            alt={hero.images[currentImageIndex]?.alt}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // 如果图片加载失败，显示占位符
                              (e.target as HTMLImageElement).src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjMgZjQgZjYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TWluaWF0dXIgQUkgRXhhbXBsZTwvdGV4dD48L3N2Zz4=";
                            }}
                          />
                          {hero.images[currentImageIndex]?.title && (
                            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm">
                              {hero.images[currentImageIndex].title}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* 轮播指示器 */}
                    {hero.enable_carousel && hero.images.length > 1 && (
                      <div className="flex justify-center gap-2 mt-4">
                        {hero.images.map((_, index) => (
                          <button
                            key={index}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              index === currentImageIndex ? 'bg-primary' : 'bg-gray-300'
                            }`}
                            onClick={() => setCurrentImageIndex(index)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Card className="aspect-[16/10] flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                    <div className="text-center">
                      <Icon name="RiImageLine" className="mx-auto mb-4 text-4xl text-gray-400" />
                      <p className="text-gray-500">Miniatur AI Examples</p>
                      <p className="text-sm text-gray-400 mt-1">Coming Soon</p>
                    </div>
                  </Card>
                )}
              </div>

              {/* 右侧系统介绍区域 */}
              <div className="order-1 lg:order-2 flex flex-col justify-center h-full">
                {/* 描述文字 */}
                <p
                  className="text-base lg:text-lg xl:text-xl text-muted-foreground mb-8 leading-relaxed lg:text-left text-center"
                  dangerouslySetInnerHTML={{ __html: hero.description || "" }}
                />

                {/* 主要按钮 */}
                {hero.buttons && (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                    {hero.buttons.map((item, i) => (
                      <Link
                        key={i}
                        href={item.url as any}
                        target={item.target || ""}
                        className="flex items-center"
                      >
                        <Button
                          className="w-full sm:w-auto"
                          size="lg"
                          variant={item.variant as any || "default"}
                        >
                          {item.icon && <Icon name={item.icon} className="mr-2" />}
                          {item.title}
                        </Button>
                      </Link>
                    ))}
                  </div>
                )}

                {/* 统计数据 */}
                {hero.stats && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {hero.stats.map((stat, index) => (
                      <div key={index} className="text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start mb-2">
                          <Icon name={stat.icon} className="mr-2 text-primary text-xl" />
                          <span className="text-3xl font-bold text-primary">
                            {stat.value}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 原有居中布局作为备选 */
            <div className="text-center">
              <p
                className="mx-auto max-w-3xl text-muted-foreground lg:text-xl mb-8"
                dangerouslySetInnerHTML={{ __html: hero.description || "" }}
              />
              {hero.buttons && (
                <div className="flex flex-col justify-center gap-4 sm:flex-row mb-8">
                  {hero.buttons.map((item, i) => (
                    <Link
                      key={i}
                      href={item.url as any}
                      target={item.target || ""}
                      className="flex items-center"
                    >
                      <Button
                        className="w-full"
                        size="lg"
                        variant={item.variant as any || "default"}
                      >
                        {item.icon && <Icon name={item.icon} className="mr-2" />}
                        {item.title}
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
              {hero.stats && (
                <div className="flex justify-center gap-8 mt-8">
                  {hero.stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Icon name={stat.icon} className="mr-2 text-primary" />
                        <span className="text-2xl font-bold text-primary">
                          {stat.value}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
