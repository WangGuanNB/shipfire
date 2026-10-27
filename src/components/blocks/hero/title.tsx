import * as React from "react";

/** Content selects the emphasis; the theme owns its color and typography. */
export function HeroTitle({ title = "", mark }: { title?: string; mark?: string }) {
  const index = mark ? title.indexOf(mark) : -1;

  return (
    <h1 className="landing-hero-title">
      {index >= 0 && mark ? (
        <>
          {title.slice(0, index)}
          <span className="landing-title-mark">{mark}</span>
          {title.slice(index + mark.length)}
        </>
      ) : title}
    </h1>
  );
}
