"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function HomeRow({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;

    const update = () => {
      setCanPrev(element.scrollLeft > 4);
      setCanNext(
        element.scrollLeft + element.clientWidth < element.scrollWidth - 4
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, []);

  function scrollByPage(direction: -1 | 1) {
    const element = scroller.current;
    if (!element) return;
    element.scrollBy({
      left: direction * Math.round(element.clientWidth * 0.85),
      behavior: "smooth",
    });
  }

  return (
    <section className="group/row relative">
      <h2 className="px-6 text-[18px] font-bold text-[#1a1a1a] dark:text-white sm:px-12">
        {title}
      </h2>
      <div className="relative mt-1">
        {canPrev ? (
          <button
            type="button"
            aria-label="Ver anteriores"
            onClick={() => scrollByPage(-1)}
            className="absolute left-3 top-1/2 z-20 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#e8eaed] bg-white text-[#3c3c3c] shadow-md transition hover:bg-[#f6f7f9] sm:flex dark:border-[#373e47] dark:bg-[#2d333b] dark:text-white"
          >
            <ChevronLeft className="size-5" strokeWidth={2.5} />
          </button>
        ) : null}
        <div
          ref={scroller}
          className="flex items-start gap-3 overflow-x-auto scroll-smooth px-6 py-3 [scrollbar-width:none] sm:px-12 [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </div>
        {canNext ? (
          <button
            type="button"
            aria-label="Ver próximos"
            onClick={() => scrollByPage(1)}
            className="absolute right-3 top-1/2 z-20 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#e8eaed] bg-white text-[#3c3c3c] shadow-md transition hover:bg-[#f6f7f9] sm:flex dark:border-[#373e47] dark:bg-[#2d333b] dark:text-white"
          >
            <ChevronRight className="size-5" strokeWidth={2.5} />
          </button>
        ) : null}
      </div>
    </section>
  );
}
