"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { RESULT_FIELD_KEYS, ResultAdConfig, ResultFieldKey, ResultTemplateConfig, ResultTextBox } from "@/lib/results-types";

interface ResultPosterPreviewProps {
  template: ResultTemplateConfig;
  values: Record<ResultFieldKey, string>;
  ad?: ResultAdConfig | null;
  className?: string;
  editable?: boolean;
  dragEnabled?: boolean;
  activeField?: ResultFieldKey | null;
  onSelectField?: (key: ResultFieldKey) => void;
  onFieldChange?: (key: ResultFieldKey, patch: Partial<ResultTextBox>) => void;
}

function resolvePreviewFontFamily(fontFamily: string): string {
  if (fontFamily.includes("Cooper Black Poster")) {
    return '"Cooper Black Poster", serif';
  }
  return "Noto Sans Malayalam";
}

export function ResultPosterPreview({
  template,
  values,
  ad,
  className,
  editable = false,
  dragEnabled = false,
  activeField,
  onSelectField,
  onFieldChange,
}: ResultPosterPreviewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const dragRef = useRef<{ key: ResultFieldKey; offsetX: number; offsetY: number } | null>(null);
  const hasAd = Boolean(ad?.imageUrl);
  const outputHeight = template.size.posterHeight + (hasAd ? template.size.adHeight : 0);
  const posterHeightPercent = (template.size.posterHeight / outputHeight) * 100;
  const adHeightPercent = 100 - posterHeightPercent;

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
    () => `${template.size.width} / ${outputHeight}`,
    [outputHeight, template.size.width],
  );

  return (
    <div ref={wrapRef} className={className}>
      <div
        className="relative w-full overflow-hidden border border-slate-200 bg-white shadow-sm"
        style={{ aspectRatio }}
      >
        <div
          ref={posterRef}
          className="absolute left-0 top-0 w-full overflow-hidden bg-orange-50"
          style={{ height: `${posterHeightPercent}%` }}
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

            const isActive = activeField === key;

            const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
              if (!editable) {
                return;
              }
              onSelectField?.(key);
              if (!dragEnabled || !posterRef.current) {
                return;
              }
              const rect = posterRef.current.getBoundingClientRect();
              const left = rect.left;
              const top = rect.top;
              const x = event.clientX - left - layout.x * rect.width;
              const y = event.clientY - top - layout.y * rect.height;
              dragRef.current = { key, offsetX: x, offsetY: y };
              event.currentTarget.setPointerCapture(event.pointerId);
            };

            const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
              if (!dragEnabled || !editable || !posterRef.current || !dragRef.current) {
                return;
              }
              if (dragRef.current.key !== key) {
                return;
              }
              const rect = posterRef.current.getBoundingClientRect();
              const rawX = (event.clientX - rect.left - dragRef.current.offsetX) / rect.width;
              const rawY = (event.clientY - rect.top - dragRef.current.offsetY) / rect.height;
              const nextX = Math.min(1 - layout.width, Math.max(0, rawX));
              const nextY = Math.min(1 - layout.height, Math.max(0, rawY));
              onFieldChange?.(key, { x: nextX, y: nextY });
            };

            const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
              if (dragRef.current?.key === key) {
                dragRef.current = null;
              }
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            };

            return (
              <div
                key={key}
                className={`absolute flex overflow-hidden leading-tight ${editable ? "cursor-move" : ""} ${isActive ? "ring-2 ring-sky-400/70" : ""}`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClick={() => editable && onSelectField?.(key)}
                style={{
                  left: `${layout.x * 100}%`,
                  top: `${layout.y * 100}%`,
                  width: `${layout.width * 100}%`,
                  height: `${layout.height * 100}%`,
                  color: layout.color,
                  fontFamily: resolvePreviewFontFamily(layout.fontFamily),
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

        {hasAd ? (
          <div
            className="absolute left-0 w-full bg-white"
            style={{ top: `${posterHeightPercent}%`, height: `${adHeightPercent}%` }}
          >
            <img
              src={ad?.imageUrl}
              alt=""
              className="h-full w-full object-contain"
              draggable={false}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
