"use client";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import Link from "next/link";

import React, { useRef, useState } from "react";


interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface NavItemsProps {
  items: {
    name: string;
    link: string;
  }[];
  className?: string;
  onItemClick?: () => void;
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileNavMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const Navbar = ({ children, className }: NavbarProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const [visible, setVisible] = useState<boolean>(false);
  const [isScrollingDown, setIsScrollingDown] = useState<boolean>(false);
  const lastScrollYRef = useRef<number>(0);

  // Track window scroll position for direction detection
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const lastY = lastScrollYRef.current;
          
          // Only apply hide/show behavior after scrolling past 100px
          if (currentY > 100) {
            const scrollDifference = currentY - lastY;
            
            if (scrollDifference > 5) {
              // Scrolling down - hide navbar
              setIsScrollingDown(true);
            } else if (scrollDifference < -5) {
              // Scrolling up - show navbar
              setIsScrollingDown(false);
            }
          } else {
            // Always show navbar when near top (within 100px)
            setIsScrollingDown(false);
          }
          
          lastScrollYRef.current = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    lastScrollYRef.current = window.scrollY;
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 100) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  });

  return (
    <motion.div
      ref={ref}
      className={cn("fixed inset-x-0 top-0 z-[60] w-full flex justify-center", className)}
      initial={{ y: 0, opacity: 1 }}
      animate={{
        y: isScrollingDown ? "-110%" : "0%",
        opacity: isScrollingDown ? 0 : 1,
      }}
      transition={{
        type: "spring",
        bounce: 0,
        duration: 0.5,
      }}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean }>,
              { visible },
            )
          : child,
      )}
    </motion.div>
  );
};

export const NavBody = ({ children, className, visible }: NavBodyProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(16px)" : "blur(0px)",
        boxShadow: visible
          ? "0 0 0 1px rgba(249,115,22,0.15), 0 8px 40px rgba(0,0,0,0.45), 0 2px 8px rgba(249,115,22,0.08)"
          : "0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)",
        width: visible ? "min(960px, 92vw)" : "min(1280px, 96vw)",
        y: visible ? 12 : 8,
        borderRadius: visible ? "9999px" : "16px",
      }}
      transition={{
        type: "spring",
        bounce: 0,
        duration: 0.5,
      }}
      style={{
        minWidth: "min(900px, 94vw)",
      }}
      className={cn(
        "relative z-[60] hidden w-full flex-row items-center justify-between self-start px-5 py-2.5 gap-6 lg:flex",
        // Dark glassmorphism background
        "bg-[#1a1a1a]/80 border border-white/[0.06]",
        visible && "bg-[#1c1c1c]/90 border-orange-500/20",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const NavItems = ({ items, className, onItemClick }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-1 text-sm font-medium lg:flex lg:space-x-1 px-2",
        className,
      )}
    >
      {items.map((item, idx) => (
        <Link
          onMouseEnter={() => setHovered(idx)}
          onClick={onItemClick}
          className="relative px-3 py-2 text-neutral-300 hover:text-white whitespace-nowrap transition-colors duration-200"
          key={`link-${idx}`}
          href={item.link}
        >
          {hovered === idx && (
            <motion.div
              layoutId="hovered"
              className="absolute inset-0 h-full w-full rounded-full bg-white/[0.07]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            />
          )}
          <span className="relative z-20">{item.name}</span>
        </Link>
      ))}
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(16px)" : "blur(0px)",
        boxShadow: visible
          ? "0 0 0 1px rgba(249,115,22,0.15), 0 8px 40px rgba(0,0,0,0.45)"
          : "0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)",
        width: visible ? "92%" : "100%",
        borderRadius: visible ? "9999px" : "16px",
        y: visible ? 12 : 8,
      }}
      transition={{
        type: "spring",
        bounce: 0,
        duration: 0.5,
      }}
      className={cn(
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-1.5rem)] flex-col items-center justify-between px-4 py-2.5 lg:hidden",
        "bg-[#1a1a1a]/80 border border-white/[0.06]",
        visible && "bg-[#1c1c1c]/90 border-orange-500/20",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({
  children,
  className,
}: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
  onClose,
}: MobileNavMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          className={cn(
            "absolute inset-x-0 top-[calc(100%+8px)] z-50 flex w-full flex-col items-start justify-start gap-4 rounded-2xl px-5 py-6",
            "bg-[#1c1c1c]/95 border border-white/[0.08] backdrop-blur-2xl",
            "shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(249,115,22,0.1)]",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.07] hover:bg-white/[0.12] transition-colors duration-200 cursor-pointer"
      aria-label={isOpen ? "Close menu" : "Open menu"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isOpen ? (
          <motion.span
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <X className="text-white h-4 w-4" />
          </motion.span>
        ) : (
          <motion.span
            key="menu"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Menu className="text-white h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};

export const NavbarLogo = () => {
  return (
    <Link
      href="/"
      className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-normal text-black"
    >
      <img
        src="https://assets.aceternity.com/logo-dark.png"
        alt="logo"
        width={30}
        height={30}
      />
      <span className="font-medium text-black dark:text-white">Startup</span>
    </Link>
  );
};

export const NavbarButton = ({
  href,
  as: Tag,
  children,
  className,
  variant = "primary",
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "dark" | "gradient";
} & (
  | React.ComponentPropsWithoutRef<"a">
  | React.ComponentPropsWithoutRef<"button">
)) => {
  const baseStyles =
    "px-4 py-1.5 rounded-full text-sm font-semibold relative cursor-pointer transition-all duration-200 inline-block text-center";

  const variantStyles = {
    primary:
      "bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-[0_2px_12px_rgba(249,115,22,0.4),0_0_0_1px_rgba(249,115,22,0.3)] hover:shadow-[0_4px_20px_rgba(249,115,22,0.55)] hover:-translate-y-0.5 active:translate-y-0",
    secondary:
      "bg-white/[0.07] text-neutral-200 border border-white/[0.1] hover:bg-white/[0.12] hover:text-white hover:-translate-y-0.5 active:translate-y-0",
    dark: "bg-neutral-800 text-white border border-white/10 hover:bg-neutral-700 hover:-translate-y-0.5 active:translate-y-0",
    gradient:
      "bg-gradient-to-b from-orange-500 to-yellow-500 text-white shadow-[0_2px_12px_rgba(249,115,22,0.4)] hover:shadow-[0_4px_20px_rgba(249,115,22,0.6)] hover:-translate-y-0.5 active:translate-y-0",
  };

  // Use Link if href is provided, otherwise use the provided Tag or default to button
  const Component = href ? Link : (Tag || "button");

  return (
    <Component
      href={href || undefined}
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Component>
  );
};