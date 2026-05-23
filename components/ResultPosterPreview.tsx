"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { RESULT_FIELD_KEYS, ResultFieldKey, ResultTemplateConfig } from "@/lib/results-types";

interface ResultPosterPreviewProps {
  template: ResultTemplateConfig;
  values: Record<ResultFieldKey, string>;
  className?: string;
}

export function ResultPosterPreview({ template, values, className }: ResultPosterPreviewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }
    const update = () => setWidth(Math.max(220, wrap.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  const scale = width / template.size.width;
  const aspectRatio = useMemo(
    () => `${template.size.width} / ${template.size.posterHeight}`,
    [template.size.posterHeight, template.size.width],
  );

  return (
    <div ref={wrapRef} className={className}>
      <div
        className="relative w-full overflow-hidden border border-slate-200 bg-orange-50 shadow-sm"
        style={{ aspectRatio }}
      >
        {template.backgroundImage ? (
          <img
            src={template.backgroundImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#fff7ed,#f8fafc_58%,#ecfeff)]">
            <div className="absolute left-[10%] top-[39%] h-[51%] w-[80%] rounded-[3.5%] border border-slate-200 bg-white" />
            <div className="absolute left-[14%] top-[57%] h-px w-[72%] bg-slate-200" />
            <div className="absolute left-[14%] top-[71%] h-px w-[72%] bg-slate-200" />
            <div className="absolute left-[14%] top-[85%] h-px w-[72%] bg-slate-200" />
          </div>
        )}

        {RESULT_FIELD_KEYS.map((key) => {
          const layout = template.fields[key];
          const text = values[key]?.trim();
          if (!text) {
            return null;
          }

          return (
            <div
              key={key}
              className="absolute flex overflow-hidden leading-tight"
              style={{
                left: `${layout.x * 100}%`,
                top: `${layout.y * 100}%`,
                width: `${layout.width * 100}%`,
                height: `${layout.height * 100}%`,
                color: layout.color,
                fontFamily: "'Noto Sans Malayalam', sans-serif",
                fontSize: Math.max(7, layout.fontSize * scale),
                fontWeight: layout.fontWeight,
                lineHeight: layout.lineHeight,
                textAlign: layout.textAlign,
                alignItems:
                  layout.verticalAlign === "top"
                    ? "flex-start"
                    : layout.verticalAlign === "bottom"
                      ? "flex-end"
                      : "center",
                justifyContent:
                  layout.textAlign === "left"
                    ? "flex-start"
                    : layout.textAlign === "right"
                      ? "flex-end"
                      : "center",
                textTransform: layout.textTransform === "uppercase" ? "uppercase" : "none",
              }}
            >
              <span className="line-clamp-2 w-full break-words">{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
