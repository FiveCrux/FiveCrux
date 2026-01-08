"use client";

import { cn } from "@/lib/utils";
import React, { ReactNode, useEffect, useState } from "react";

type InfiniteMovingCardsItem = {
  quote: string;
  name: string;
  title: string;
};

type InfiniteMovingCardsProps<T = InfiniteMovingCardsItem> = {
  items: T[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
  /**
   * Optional custom renderer for each item. When provided, the default
   * quote-style card layout is skipped and this render function is used instead.
   */
  renderItem?: (item: T, index: number) => ReactNode;
  /**
   * Optional key extractor for each item. Falls back to array index when not provided.
   */
  getKey?: (item: T, index: number) => string | number;
};

export const InfiniteMovingCards = <T,>({
  items,
  direction = "left",
  speed = "fast",
  pauseOnHover = true,
  className,
  renderItem,
  getKey,
}: InfiniteMovingCardsProps<T>) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLUListElement>(null);

  // When using renderItem, duplicate items multiple times in React instead of using cloneNode
  // This ensures React components (like Next.js Image, Avatar) render correctly
  // Using 3 sets ensures seamless infinite scrolling
  const duplicatedItems = renderItem ? [...items, ...items, ...items] : items;

  const [start, setStart] = useState(false);
  
  const getDirection = () => {
    if (containerRef.current) {
      if (direction === "left") {
        containerRef.current.style.setProperty(
          "--animation-direction",
          "forwards",
        );
      } else {
        containerRef.current.style.setProperty(
          "--animation-direction",
          "reverse",
        );
      }
    }
  };
  
  const getSpeed = () => {
    if (containerRef.current) {
      if (speed === "fast") {
        containerRef.current.style.setProperty("--animation-duration", "20s");
      } else if (speed === "normal") {
        containerRef.current.style.setProperty("--animation-duration", "40s");
      } else {
        containerRef.current.style.setProperty("--animation-duration", "80s");
      }
    }
  };

  function addAnimation() {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);

      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem);
        }
      });

      getDirection();
      getSpeed();
      setStart(true);
    }
  }

  useEffect(() => {
    if (renderItem) {
      // For custom renderItem, we already duplicated in React (3 sets)
      // Set animation to move exactly 1/3 of the width for seamless loop
      if (containerRef.current) {
        containerRef.current.style.setProperty("--animation-distance", "-33.333%");
      }
      getDirection();
      getSpeed();
      setStart(true);
    } else {
      // For default quote cards, use cloneNode approach
      if (containerRef.current) {
        containerRef.current.style.setProperty("--animation-distance", "calc(-100% - 1rem)");
      }
      addAnimation();
    }
  }, [renderItem, direction, speed]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        className,
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex w-max min-w-full shrink-0 flex-nowrap py-4",
          renderItem ? "gap-6" : "gap-4",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]",
        )}
      >
        {duplicatedItems.map((item, idx) => {
          const originalIdx = idx % items.length;
          const setNumber = Math.floor(idx / items.length);
          const key = getKey 
            ? `${getKey(item, originalIdx)}-set${setNumber}` 
            : `${originalIdx}-set${setNumber}`;

          if (renderItem) {
            return (
              <li
                className="relative shrink-0"
                key={key}
              >
                {renderItem(item, originalIdx)}
              </li>
            );
          }

          const defaultItem = item as unknown as InfiniteMovingCardsItem;

          return (
            <li
              className="relative w-[350px] max-w-full shrink-0 rounded-2xl border border-b-0 border-zinc-200 bg-[linear-gradient(180deg,#fafafa,#f5f5f5)] px-8 py-6 md:w-[450px] dark:border-zinc-700 dark:bg-[linear-gradient(180deg,#27272a,#18181b)]"
              key={defaultItem.name ?? key}
            >
              <blockquote>
                <div
                  aria-hidden="true"
                  className="user-select-none pointer-events-none absolute -top-0.5 -left-0.5 -z-1 h-[calc(100%_+_4px)] w-[calc(100%_+_4px)]"
                ></div>
                <span className="relative z-20 text-sm leading-[1.6] font-normal text-neutral-800 dark:text-gray-100">
                  {defaultItem.quote}
                </span>
                <div className="relative z-20 mt-6 flex flex-row items-center">
                  <span className="flex flex-col gap-1">
                    <span className="text-sm leading-[1.6] font-normal text-neutral-500 dark:text-gray-400">
                      {defaultItem.name}
                    </span>
                    <span className="text-sm leading-[1.6] font-normal text-neutral-500 dark:text-gray-400">
                      {defaultItem.title}
                    </span>
                  </span>
                </div>
              </blockquote>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
