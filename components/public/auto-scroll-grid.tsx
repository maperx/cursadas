"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface AutoScrollGridProps {
  children: ReactNode;
  enabled: boolean;
  speed?: number;
}

export function AutoScrollGrid({
  children,
  enabled,
  speed = 50,
}: AutoScrollGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const updateViewportHeight = () => {
      if (containerRef.current) {
        const top = containerRef.current.getBoundingClientRect().top;
        setViewportHeight(window.innerHeight - top);
      }
    };

    updateViewportHeight();
    window.addEventListener("resize", updateViewportHeight);
    return () => window.removeEventListener("resize", updateViewportHeight);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !contentRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContentHeight(entry.target.scrollHeight);
      }
    });

    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [enabled]);

  if (!enabled) {
    return <>{children}</>;
  }

  const shouldScroll = viewportHeight > 0 && contentHeight > viewportHeight;
  const duration = contentHeight / speed;

  return (
    <div
      ref={containerRef}
      className={shouldScroll ? "overflow-hidden" : undefined}
      style={shouldScroll ? { height: viewportHeight } : undefined}
    >
      {shouldScroll ? (
        <div
          className="auto-scroll-track"
          style={{ animationDuration: `${duration}s` }}
        >
          <div ref={contentRef} className="pb-4">
            {children}
          </div>
          <div aria-hidden="true" className="pb-4">
            {children}
          </div>
        </div>
      ) : (
        <div ref={contentRef}>{children}</div>
      )}
    </div>
  );
}
