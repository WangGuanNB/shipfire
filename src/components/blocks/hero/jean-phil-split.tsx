"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Video } from "lucide-react";
import type { Hero as HeroType } from "@/types/blocks/hero";
import { cn } from "@/lib/utils";
import { LANDING_TOOL_OPEN_EVENT, useLandingToolActions } from "@/components/landing/interactions";

const serif = 'Georgia, "Times New Roman", Times, serif';

type Workflow = NonNullable<HeroType["workflows"]>[number];

function useWorkflowAction(workflow: Workflow | undefined, onOpen: () => void) {
  const { select, requestPhotoUpload, requestVideoUpload } = useLandingToolActions();

  return function handleAction() {
    if (!workflow || workflow.placeholder || workflow.disabled) return;
    onOpen();
    const action = workflow.action;
    if (!action) return;
    if (action.kind === "photo-upload" || !action.kind) {
      requestPhotoUpload(action.tool, action.values);
      return;
    }
    if (action.kind === "video-upload") {
      requestVideoUpload(action.tool, action.values);
      return;
    }
    select(action.tool, action.values);
  };
}

function WorkflowCard({
  workflow,
  onOpenTool,
}: {
  workflow: Workflow;
  onOpenTool: () => void;
}) {
  const isPlaceholder = workflow.placeholder || workflow.disabled;
  const actionLabel = workflow.action?.label || "Make it";
  const handleAction = useWorkflowAction(workflow, onOpenTool);

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-[1.35rem] border bg-card p-4 shadow-sm sm:flex sm:flex-row sm:gap-5 sm:p-5",
        isPlaceholder ? "border-dashed border-border/80 opacity-90" : "border-border/60",
      )}
    >
      <div className="flex shrink-0 items-center gap-2">
        {isPlaceholder ? (
          <>
            <div className="flex h-[64px] w-[46px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 sm:h-[88px] sm:w-[62px]">
              <Video className="size-5 text-muted-foreground/70" />
            </div>
            <ArrowRight className="size-4 shrink-0 text-[#E8B923]" strokeWidth={2.5} />
            <div className="h-[64px] w-[46px] overflow-hidden rounded-lg border border-border/70 bg-muted sm:h-[88px] sm:w-[62px]">
              {workflow.afterImage ? (
                <img src={workflow.afterImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">Preview</div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="h-[64px] w-[46px] overflow-hidden rounded-lg border border-border/70 bg-muted sm:h-[88px] sm:w-[62px]">
              {workflow.beforeImage ? (
                <img
                  src={workflow.beforeImage}
                  alt=""
                  className="h-full w-full object-cover object-center"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Video className="size-5 text-muted-foreground/70" />
                </div>
              )}
            </div>
            <ArrowRight className="size-4 shrink-0 text-[#E8B923]" strokeWidth={2.5} />
            <div className="h-[64px] w-[46px] overflow-hidden rounded-lg border border-border/70 bg-muted sm:h-[88px] sm:w-[62px]">
              {workflow.afterImage ? (
                <img
                  src={workflow.afterImage}
                  alt=""
                  className="h-full w-full object-cover object-center"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-muted/50">
                  <Video className="size-5 text-muted-foreground/70" />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="text-base font-semibold leading-snug text-foreground sm:text-[1.05rem] lg:text-[1.125rem]">
          {workflow.title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground lg:text-[0.9375rem] lg:leading-relaxed">
          {workflow.description}
        </p>
        {workflow.priceLabel && (
          <p
            className={cn(
              "text-sm font-medium",
              isPlaceholder ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {workflow.priceLabel}
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={isPlaceholder}
        onClick={handleAction}
        className={cn(
          "col-span-2 inline-flex w-full shrink-0 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-colors sm:w-auto sm:min-w-[120px] sm:py-2.5",
          isPlaceholder
            ? "cursor-not-allowed bg-muted text-muted-foreground"
            : "bg-[#F4C542] text-black hover:bg-[#e8b923]",
        )}
      >
        {isPlaceholder ? "Soon" : actionLabel}
      </button>
    </div>
  );
}

function FooterLinks({ links }: { links: NonNullable<HeroType["footerLinks"]> }) {
  const { select } = useLandingToolActions();

  return (
    <div className="space-y-2 pt-1 text-sm text-muted-foreground">
      {links.map((link, index) => {
        const content = (
          <>
            {link.prefix && <span>{link.prefix} </span>}
            <span className="font-medium text-foreground underline underline-offset-2">{link.highlight}</span>
            {link.suffix && <span> {link.suffix}</span>}
          </>
        );

        if (link.url) {
          return (
            <p key={index}>
              <a href={link.url} className="transition-colors hover:text-foreground">
                {content}
              </a>
            </p>
          );
        }

        if (link.action) {
          return (
            <p key={index}>
              <button
                type="button"
                className="text-left transition-colors hover:text-foreground"
                onClick={() => select(link.action!.tool, link.action!.values)}
              >
                {content}
              </button>
            </p>
          );
        }

        return <p key={index}>{content}</p>;
      })}
    </div>
  );
}

function titleWithMark(title: string | undefined, mark: string | undefined) {
  if (!title || !mark || !title.includes(mark)) {
    return { hasMark: false as const, title: title ?? "" };
  }
  const parts = title.split(mark);
  return { hasMark: true as const, before: parts[0], mark, after: parts.slice(1).join(mark) };
}

function TextWithBreaks({ text }: { text: string }) {
  const lines = text.split("\n");
  return lines.map((line, index) => (
    <Fragment key={index}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

function TitleMark({ mark }: { mark: string }) {
  return (
    <span className="relative mx-1 inline-block whitespace-nowrap">
      <span
        className="absolute -inset-x-1 bottom-1 top-[42%] -skew-y-1 rounded-sm bg-[#F5D565]/90 max-lg:bottom-0.5 max-lg:top-[68%]"
        aria-hidden
      />
      <span className="relative">{mark}</span>
    </span>
  );
}

export function JeanPhilSplitHero({
  hero,
  children,
}: {
  hero: HeroType;
  children?: ReactNode;
}) {
  const [toolVisible, setToolVisible] = useState(false);
  const [desktopPreviewSize, setDesktopPreviewSize] = useState<{ width: number; height: number } | null>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const preview = hero.preview;
  const marked = titleWithMark(hero.title, hero.title_mark);
  const primaryWorkflow = hero.workflows?.find((workflow) => !workflow.placeholder && !workflow.disabled);
  const handlePrimaryAction = useWorkflowAction(primaryWorkflow, () => setToolVisible(true));

  useEffect(() => {
    function openTool() {
      setToolVisible(true);
    }
    window.addEventListener(LANDING_TOOL_OPEN_EVENT, openTool);
    return () => window.removeEventListener(LANDING_TOOL_OPEN_EVENT, openTool);
  }, []);

  useEffect(() => {
    const column = leftColumnRef.current;
    if (!column) return;

    function syncPreviewSize() {
      const node = leftColumnRef.current;
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      if (!node || !desktop) {
        setDesktopPreviewSize(null);
        return;
      }
      const columnHeight = node.offsetHeight;
      const captionReserve = preview?.caption ? 40 : 0;
      const height = Math.max(320, columnHeight - captionReserve);
      const width = Math.round(height * (9 / 16));
      setDesktopPreviewSize({ width, height });
    }

    syncPreviewSize();
    const observer = new ResizeObserver(syncPreviewSize);
    observer.observe(column);
    window.addEventListener("resize", syncPreviewSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncPreviewSize);
    };
  }, [preview?.caption, hero.workflows?.length, hero.footerLinks?.length, hero.description]);

  return (
    <div className="relative overflow-hidden bg-background px-4 pb-10 pt-20 text-foreground md:pb-14 md:pt-24">
      <div className="container mx-auto max-w-7xl">
        <div className="mx-auto grid w-full max-w-[520px] grid-cols-1 gap-5 lg:max-w-none lg:grid-cols-[auto_auto] lg:items-start lg:justify-center lg:gap-6 xl:gap-8">
          <div
            ref={leftColumnRef}
            className="max-lg:contents lg:flex lg:min-w-0 lg:flex-col lg:space-y-7 lg:py-2 xl:max-w-[36rem]"
          >
            <div className="space-y-6 max-lg:z-10 max-lg:col-start-1 max-lg:row-start-1 max-lg:self-end max-lg:px-5 max-lg:pb-5 lg:space-y-6">
              {hero.announcement?.label && (
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground max-lg:hidden lg:text-[0.8125rem]">
                  <span className="inline-block h-px w-6 bg-[#F4C542] lg:w-8" aria-hidden />
                  {hero.announcement.label}
                </p>
              )}

              <div className="space-y-3 max-lg:space-y-1.5 lg:space-y-4">
                <h1
                  className="max-w-[18rem] text-pretty text-[1.9rem] font-normal leading-[1.12] tracking-[-0.02em] max-lg:max-w-none max-lg:text-white max-lg:drop-shadow-md sm:max-w-[22rem] sm:text-[2.35rem] lg:max-w-[22rem] lg:text-[2.75rem] lg:leading-[1.1] xl:max-w-[24rem] xl:text-[2.875rem] 2xl:text-[3rem]"
                  style={{ fontFamily: serif }}
                >
                  {marked.hasMark ? (
                    <>
                      <TextWithBreaks text={marked.before} />
                      <TitleMark mark={marked.mark} />
                      <TextWithBreaks text={marked.after} />
                    </>
                  ) : (
                    <TextWithBreaks text={marked.title} />
                  )}
                </h1>

                {hero.highlight_text && (
                  <p
                    className="text-lg italic leading-snug text-foreground/90 max-lg:text-[#F5D565] max-lg:drop-shadow sm:text-2xl lg:text-[1.65rem] lg:leading-snug xl:text-[1.75rem]"
                    style={{ fontFamily: serif }}
                  >
                    {hero.highlight_text}
                  </p>
                )}
              </div>
            </div>

            {hero.description && (
              <p className="max-w-xl text-[15px] leading-7 text-muted-foreground max-lg:row-start-3 sm:text-base lg:max-w-none lg:text-[1.0625rem] lg:leading-8">
                {hero.description.replace(/<[^>]+>/g, "")}
              </p>
            )}

            {hero.workflows && hero.workflows.length > 0 && (
              <div className="space-y-3 pt-1 max-lg:row-start-2 max-lg:pt-0">
                {hero.workflows.map((workflow) => (
                  <WorkflowCard key={workflow.id} workflow={workflow} onOpenTool={() => setToolVisible(true)} />
                ))}
              </div>
            )}

            {hero.footerLinks && hero.footerLinks.length > 0 && (
              <div className="max-lg:row-start-4">
                <FooterLinks links={hero.footerLinks} />
              </div>
            )}
          </div>

          {preview?.video && (
            <div className="flex w-full flex-col max-lg:col-start-1 max-lg:row-start-1 lg:shrink-0 lg:items-end">
              <div className="w-full max-lg:flex-none lg:flex lg:justify-end">
                <div
                  className="relative w-full overflow-hidden rounded-[1.35rem] border border-border/60 bg-black shadow-md max-lg:aspect-[4/5] lg:ml-auto lg:shrink-0"
                  style={
                    desktopPreviewSize
                      ? { width: desktopPreviewSize.width, height: desktopPreviewSize.height }
                      : undefined
                  }
                >
                  <video
                    src={preview.video}
                    poster={preview.poster}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    className="block size-full object-cover object-center"
                    aria-label={preview.badge || hero.title || "Sample video"}
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent lg:hidden"
                    aria-hidden
                  />
                  {preview.badge && (
                    <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-medium text-foreground shadow-sm max-lg:left-3 max-lg:top-3 max-lg:px-3 max-lg:text-xs sm:text-xs">
                      {preview.badge}
                    </span>
                  )}
                  {preview.overlayCta && (
                    <button
                      type="button"
                      onClick={handlePrimaryAction}
                      className="absolute bottom-3 left-1/2 max-w-[92%] -translate-x-1/2 rounded-full bg-[#F4C542] px-3 py-1.5 text-center text-[10px] font-semibold text-black shadow-md transition-colors hover:bg-[#e8b923] max-lg:bottom-auto max-lg:left-auto max-lg:right-3 max-lg:top-3 max-lg:translate-x-0 max-lg:px-4 max-lg:py-2 max-lg:text-sm lg:text-xs"
                    >
                      {preview.overlayCta}
                    </button>
                  )}
                </div>
              </div>
              {preview.caption && (
                <p className="mt-2 shrink-0 text-center text-[11px] leading-relaxed text-muted-foreground max-lg:hidden sm:text-xs lg:text-left">
                  {preview.caption}
                </p>
              )}
            </div>
          )}
        </div>

        {children && (
          <div className={cn("mx-auto mt-8 max-w-3xl transition-all", toolVisible ? "block" : "hidden")}>{children}</div>
        )}
      </div>
    </div>
  );
}
