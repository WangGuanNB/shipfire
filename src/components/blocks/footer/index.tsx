import { Footer as FooterType, Badge } from "@/types/blocks/footer";
import Icon from "@/components/icon";

function BadgeLink({
  badge,
  inert = false,
}: {
  badge: Badge;
  /** Duplicate marquee copy: skip tab stops, keep href for seamless loop only */
  inert?: boolean;
}) {
  return (
    <a
      href={badge.url}
      target={badge.target || "_blank"}
      data-footer-badge=""
      {...(badge.dofollow ? { "data-dofollow": "" } : {})}
      rel={
        badge.dofollow
          ? "noopener noreferrer"
          : "noopener noreferrer nofollow"
      }
      title={badge.title}
      tabIndex={inert ? -1 : undefined}
      className="block truncate text-sm font-medium underline underline-offset-2 hover:text-primary hover:opacity-100"
    >
      {badge.image?.src ? (
        <img
          src={badge.image.src}
          alt={badge.image.alt || badge.title}
          width={Math.round((badge.image.width || 171) * 0.8)}
          height={Math.round((badge.image.height || 54) * 0.8)}
          className="h-auto max-h-8"
          loading="lazy"
          decoding="async"
        />
      ) : (
        badge.title
      )}
    </a>
  );
}

export default function Footer({ footer }: { footer: FooterType }) {
  if (footer.disabled) {
    return null;
  }

  const badges = footer.badges?.length ? footer.badges : null;

  return (
    <section id={footer.name} className="py-16">
      <div className="max-w-7xl mx-auto px-8">
        <footer>
          <div className="flex flex-col items-center justify-between gap-10 text-center lg:flex-row lg:text-left">
            <div className="flex w-full max-w-96 shrink flex-col items-center justify-between gap-6 lg:items-start">
              {footer.brand && (
                <div>
                  <div className="flex items-center justify-center gap-2 lg:justify-start">
                    {footer.brand.logo && (
                      <img
                        src={footer.brand.logo.src}
                        alt={footer.brand.logo.alt || footer.brand.title}
                        width={44}
                        height={44}
                        loading="lazy"
                        decoding="async"
                        className="h-11 w-11"
                      />
                    )}
                    {footer.brand.title && (
                      <p className="text-3xl font-semibold">
                        {footer.brand.title}
                      </p>
                    )}
                  </div>
                  {footer.brand.description && (
                    <p className="mt-6 text-md text-muted-foreground">
                      {footer.brand.description}
                    </p>
                  )}
                </div>
              )}
              {footer.social && (
                <ul className="flex items-center space-x-6 text-muted-foreground">
                  {footer.social.items?.map((item, i) => (
                    <li key={i} className="font-medium hover:text-primary">
                      <a
                        href={item.url}
                        target={item.target}
                        aria-label={item.title}
                        rel={
                          item.target === "_blank"
                            ? "noopener noreferrer"
                            : undefined
                        }
                      >
                        {item.icon && (
                          <Icon name={item.icon} className="size-4" />
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="grid grid-cols-3 gap-6 lg:gap-20">
              {footer.nav?.items?.map((item, i) => (
                <div key={i}>
                  <p className="mb-6 font-bold">{item.title}</p>
                  <ul className="space-y-4 text-sm text-muted-foreground">
                    {item.children?.map((iitem, ii) => (
                      <li key={ii} className="font-medium hover:text-primary">
                        <a href={iitem.url} target={iitem.target}>
                          {iitem.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t pt-8 text-center text-sm font-medium text-muted-foreground lg:flex-row lg:text-left">
            {footer.copyright && (
              <p className="shrink-0 lg:max-w-56">{footer.copyright}</p>
            )}

            {/* Partner badges: SSR links + 2-row vertical marquee */}
            {badges && (
              <div
                className="footer-badge-marquee w-full max-w-xs shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Partner listings"
              >
                <div className="h-11 overflow-hidden">
                  <div className="footer-badge-marquee__track flex flex-col gap-1">
                    <ul className="flex flex-col gap-1">
                      {badges.map((badge, i) => (
                        <li key={`badge-${i}`} className="h-5 leading-5">
                          <BadgeLink badge={badge} />
                        </li>
                      ))}
                    </ul>
                    {/* Visual clone for seamless loop; primary list above remains crawlable */}
                    <ul className="flex flex-col gap-1" aria-hidden="true">
                      {badges.map((badge, i) => (
                        <li key={`badge-clone-${i}`} className="h-5 leading-5">
                          <BadgeLink badge={badge} inert />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Legacy single badge (image only) */}
            {!badges && footer.badge?.image?.src && (
              <div className="opacity-60 hover:opacity-80 transition-opacity">
                <a
                  href={footer.badge.url}
                  target={footer.badge.target || "_blank"}
                  data-footer-badge=""
                  {...(footer.badge.dofollow
                    ? { "data-dofollow": "" }
                    : {})}
                  rel={
                    footer.badge.dofollow
                      ? "noopener noreferrer"
                      : "noopener noreferrer nofollow"
                  }
                  title={footer.badge.title}
                  className="inline-block"
                >
                  <img
                    src={footer.badge.image.src}
                    alt={footer.badge.image.alt || footer.badge.title}
                    width={Math.round((footer.badge.image.width || 200) * 0.8)}
                    height={Math.round((footer.badge.image.height || 54) * 0.8)}
                    className="h-auto max-h-10"
                    loading="lazy"
                    decoding="async"
                  />
                </a>
              </div>
            )}

            {footer.agreement && (
              <ul className="flex shrink-0 justify-center gap-4 lg:justify-start">
                {footer.agreement.items?.map((item, i) => (
                  <li key={i} className="hover:text-primary">
                    <a href={item.url} target={item.target}>
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </footer>
      </div>
    </section>
  );
}
