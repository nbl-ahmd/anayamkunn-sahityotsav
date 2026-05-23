"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getVisiblePlacementsFromValues,
  markerDefaultsFromFields,
  positionFieldKeys,
} from "@/lib/results-layout";
import {
  RESULT_FIELD_KEYS,
  ResultAdConfig,
  ResultFieldKey,
  ResultPositionKey,
  ResultPositionMarker,
  ResultTemplateConfig,
  ResultTextBox,
} from "@/lib/results-types";

interface ResultPosterPreviewProps {
  template: ResultTemplateConfig;
  values: Record<ResultFieldKey, string>;
  ad?: ResultAdConfig | null;
  className?: string;
  editable?: boolean;
  dragEnabled?: boolean;
  activeField?: ResultFieldKey | null;
  activeMarker?: ResultPositionKey | null;
  onSelectField?: (key: ResultFieldKey) => void;
  onSelectMarker?: (key: ResultPositionKey) => void;
  onFieldChange?: (key: ResultFieldKey, patch: Partial<ResultTextBox>) => void;
  onMarkerChange?: (key: ResultPositionKey, marker: ResultPositionMarker) => void;
}

function resolvePreviewFontFamily(fontFamily: string): string {
  if (fontFamily.includes("Cooper Black Poster")) {
    return '"Cooper Black Poster", serif';
  }
  if (fontFamily.includes("Poppins")) {
    return "Poppins";
  }
  if (fontFamily.includes("Montserrat")) {
    return "Montserrat";
  }
  if (fontFamily.includes("Inter")) {
    return "Inter";
  }
  if (fontFamily.includes("Noto Sans Malayalam")) {
    return "Noto Sans Malayalam";
  }
  return "Noto Sans";
}

export function ResultPosterPreview({
  template,
  values,
  ad,
  className,
  editable = false,
  dragEnabled = false,
  activeField,
  activeMarker,
  onSelectField,
  onSelectMarker,
  onFieldChange,
  onMarkerChange,
}: ResultPosterPreviewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const dragRef = useRef<
    | { type: "field"; key: ResultFieldKey; offsetX: number; offsetY: number }
    | { type: "marker"; key: ResultPositionKey; offsetX: number; offsetY: number }
    | null
  >(null);
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
  const visiblePlacements = getVisiblePlacementsFromValues(values);
  const positionMarkers = template.positionMarkers ?? markerDefaultsFromFields(template.fields);
  const positionFieldSet = new Set<ResultFieldKey>(Object.values(positionFieldKeys));

  const patchMarkerPosition = (key: ResultPositionKey, rawX: number, rawY: number) => {
    const marker = positionMarkers[key];
    if (marker.mode === "hidden") {
      return;
    }
    if (marker.mode === "text") {
      onMarkerChange?.(key, {
        ...marker,
        box: {
          ...marker.box,
          x: Math.min(1 - marker.box.width, Math.max(0, rawX)),
          y: Math.min(1 - marker.box.height, Math.max(0, rawY)),
        },
      });
      return;
    }
    onMarkerChange?.(key, {
      ...marker,
      x: Math.min(1 - marker.width, Math.max(0, rawX)),
      y: Math.min(1 - marker.height, Math.max(0, rawY)),
    });
  };

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

          {visiblePlacements.map((key) => {
            const marker = positionMarkers[key];
            if (marker.mode === "hidden") {
              return null;
            }

            const markerBox = marker.mode === "text"
              ? marker.box
              : {
                  x: marker.x,
                  y: marker.y,
                  width: marker.mode === "shape" && marker.direction === "horizontal"
                    ? marker.width * marker.repeat + marker.gap * (marker.repeat - 1)
                    : marker.width,
                  height: marker.mode === "shape" && marker.direction === "vertical"
                    ? marker.height * marker.repeat + marker.gap * (marker.repeat - 1)
                    : marker.height,
                };
            const isActive = activeMarker === key;

            const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
              if (!editable) {
                return;
              }
              onSelectMarker?.(key);
              if (!dragEnabled || !posterRef.current) {
                return;
              }
              const rect = posterRef.current.getBoundingClientRect();
              const x = event.clientX - rect.left - markerBox.x * rect.width;
              const y = event.clientY - rect.top - markerBox.y * rect.height;
              dragRef.current = { type: "marker", key, offsetX: x, offsetY: y };
              event.currentTarget.setPointerCapture(event.pointerId);
            };

            const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
              if (!dragEnabled || !editable || !posterRef.current || !dragRef.current) {
                return;
              }
              if (dragRef.current.type !== "marker" || dragRef.current.key !== key) {
                return;
              }
              const rect = posterRef.current.getBoundingClientRect();
              const rawX = (event.clientX - rect.left - dragRef.current.offsetX) / rect.width;
              const rawY = (event.clientY - rect.top - dragRef.current.offsetY) / rect.height;
              patchMarkerPosition(key, rawX, rawY);
            };

            const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
              if (dragRef.current?.type === "marker" && dragRef.current.key === key) {
                dragRef.current = null;
              }
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            };

            return (
              <div
                key={`marker-${key}`}
                className={`absolute ${editable ? "cursor-move" : ""} ${isActive ? "ring-2 ring-sky-400/70" : ""}`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClick={() => editable && onSelectMarker?.(key)}
                style={{
                  left: `${markerBox.x * 100}%`,
                  top: `${markerBox.y * 100}%`,
                  width: `${markerBox.width * 100}%`,
                  height: `${markerBox.height * 100}%`,
                  opacity: marker.mode === "text" ? 1 : marker.opacity,
                  transform: marker.mode === "shape" ? `rotate(${marker.rotation}deg)` : undefined,
                }}
              >
                {marker.mode === "text" ? (
                  <div
                    className="flex h-full w-full overflow-hidden"
                    style={{
                      color: marker.box.color,
                      fontFamily: resolvePreviewFontFamily(marker.box.fontFamily),
                      fontSize: Math.max(7, marker.box.fontSize * scale),
                      fontWeight: marker.box.fontWeight,
                      lineHeight: marker.box.lineHeight,
                      textAlign: marker.box.textAlign,
                      alignItems:
                        marker.box.verticalAlign === "top"
                          ? "flex-start"
                          : marker.box.verticalAlign === "bottom"
                            ? "flex-end"
                            : "center",
                      justifyContent:
                        marker.box.textAlign === "left"
                          ? "flex-start"
                          : marker.box.textAlign === "right"
                            ? "flex-end"
                            : "center",
                      textTransform: marker.box.textTransform === "uppercase" ? "uppercase" : "none",
                    }}
                  >
                    <span className="line-clamp-2 w-full break-words">{marker.text}</span>
                  </div>
                ) : marker.mode === "shape" ? (
                  <div
                    className={`flex h-full w-full ${marker.direction === "vertical" ? "flex-col" : "flex-row"}`}
                    style={{
                      gap: marker.direction === "vertical"
                        ? `${(marker.gap / Math.max(markerBox.height, 0.001)) * 100}%`
                        : `${(marker.gap / Math.max(markerBox.width, 0.001)) * 100}%`,
                    }}
                  >
                    {Array.from({ length: marker.repeat }, (_, index) => (
                      <div
                        key={index}
                        className={marker.shape === "circle" ? "rounded-full" : marker.shape === "roundedSquare" ? "rounded-[18%]" : ""}
                        style={{
                          width: marker.direction === "horizontal" ? `${(marker.width / markerBox.width) * 100}%` : "100%",
                          height: marker.direction === "vertical" ? `${(marker.height / markerBox.height) * 100}%` : "100%",
                          backgroundColor: marker.colors[index % marker.colors.length] ?? "#f43f5e",
                          flex: "0 0 auto",
                        }}
                      />
                    ))}
                  </div>
                ) : marker.imageUrl ? (
                  <img src={marker.imageUrl} alt="" className="h-full w-full object-contain" draggable={false} />
                ) : null}
              </div>
            );
          })}

          {RESULT_FIELD_KEYS.filter((key) => !positionFieldSet.has(key)).map((key) => {
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
              dragRef.current = { type: "field", key, offsetX: x, offsetY: y };
              event.currentTarget.setPointerCapture(event.pointerId);
            };

            const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
              if (!dragEnabled || !editable || !posterRef.current || !dragRef.current) {
                return;
              }
              if (dragRef.current.type !== "field" || dragRef.current.key !== key) {
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
              if (dragRef.current?.type === "field" && dragRef.current.key === key) {
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
