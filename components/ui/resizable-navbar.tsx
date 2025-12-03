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
import { usePathname } from "next/navigation";

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
    icon?: React.ReactNode;
  }[];
  className?: string;
  onItemClick?: () => void;
  currentPath?: string;
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
            // Check scroll direction with a threshold to avoid flickering
            const scrollDifference = currentY - lastY;
            
            if (scrollDifference > 5) {
              // Scrolling down - hide navbar
              setIsScrollingDown(true);
            } else if (scrollDifference < -5) {
              // Scrolling up - show navbar
              setIsScrollingDown(false);
            }
            // If scrollDifference is between -5 and 5, keep current state (no change)
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

    // Initialize last scroll position
    lastScrollYRef.current = window.scrollY;
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    // Set visible state for resizing effect
    if (latest > 100) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  });

  return (
    <motion.div
      ref={ref}
      className={cn("fixed inset-x-0 top-0 z-40 w-full", className)}
      initial={{ y: 0, opacity: 1 }}
      animate={{
        y: isScrollingDown ? "-100%" : "0%",
        opacity: isScrollingDown ? 0 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 35,
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
        backdropFilter: visible ? "blur(10px)" : "none",
        boxShadow: visible
          ? "0 0 24px rgba(34, 42, 53, 0.06), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.04), 0 0 4px rgba(34, 42, 53, 0.08), 0 16px 68px rgba(47, 48, 55, 0.05), 0 1px 0 rgba(255, 255, 255, 0.1) inset"
          : "none",
        width: visible ? "30%" : "100%",
        y: visible ? 20 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 50,
      }}
      className={cn(
        "relative z-[60] mx-auto hidden w-auto flex-row items-center justify-center self-start rounded-lg bg-transparent px-4 py-2 gap-4 lg:flex dark:bg-transparent",
        visible && "bg-white/80 dark:bg-neutral-800",
        !visible && "justify-between",
        className,
      )}
    >
      {React.Children.map(children, (child, index) => {
        // When visible (compact mode), only show NavItems (middle child, index 1)
        if (visible && index !== 1) {
          return null;
        }
        return child;
      })}
    </motion.div>
  );
};

export const NavItems = ({ items, className, onItemClick, textColorClassName, currentPath }: NavItemsProps & { textColorClassName?: string }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const pathname = usePathname();
  const activePath = currentPath || pathname;
  
  // Default text colors if not provided
  const defaultTextColor = "text-zinc-600 dark:text-neutral-300"
  const textColor = textColorClassName || defaultTextColor
  const hoverTextColor = textColorClassName 
    ? (textColorClassName.includes("text-white") ? "hover:text-gray-200" : "hover:text-zinc-800 dark:hover:text-neutral-100")
    : "hover:text-zinc-800 dark:hover:text-neutral-100"

  const isActive = (link: string) => {
    if (link === "/") {
      return activePath === "/";
    }
    return activePath?.startsWith(link);
  };

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "hidden flex-1 flex-row items-center justify-center space-x-1 text-sm font-medium transition duration-200 lg:flex lg:space-x-2 px-2",
        textColor,
        hoverTextColor,
        className,
      )}
    >
      {items.map((item, idx) => {
        const active = isActive(item.link);
        return (
          <Link
            onMouseEnter={() => setHovered(idx)}
            onClick={onItemClick}
            className={cn("relative px-2 py-2 whitespace-nowrap flex flex-row items-center gap-2", textColor)}
            key={`link-${idx}`}
            href={item.link}
          >
            {hovered === idx && (
              <motion.div
                layoutId="hovered"
                className="absolute inset-0 h-full w-full rounded-lg bg-gray-100 dark:bg-neutral-400"
              />
            )}
            {active && (
              <motion.div
                layoutId="active-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white z-30"
              />
            )}
            {item.icon && (
              <span className="relative z-20">{item.icon}</span>
            )}
            <span className="relative z-20">{item.name}</span>
          </Link>
        );
      })}
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(10px)" : "none",
        boxShadow: visible
          ? "0 0 24px rgba(34, 42, 53, 0.06), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.04), 0 0 4px rgba(34, 42, 53, 0.08), 0 16px 68px rgba(47, 48, 55, 0.05), 0 1px 0 rgba(255, 255, 255, 0.1) inset"
          : "none",
        width: visible ? "90%" : "100%",
        paddingRight: visible ? "12px" : "0px",
        paddingLeft: visible ? "12px" : "0px",
        borderRadius: visible ? "4px" : "2rem",
        y: visible ? 20 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 50,
      }}
      className={cn(
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-between bg-transparent px-0 py-2 lg:hidden",
        visible && "bg-white/80 dark:bg-neutral-950/80",
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "absolute inset-x-0 top-16 z-50 flex w-full flex-col items-start justify-start gap-4 rounded-lg bg-white px-4 py-8 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] dark:bg-neutral-950",
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
  textColorClassName,
}: {
  isOpen: boolean;
  onClick: () => void;
  textColorClassName?: string;
}) => {
  const defaultTextColor = "text-black dark:text-white"
  const textColor = textColorClassName || defaultTextColor
  
  return isOpen ? (
    <X className={cn(textColor, "h-6 w-6 cursor-pointer")} onClick={onClick} />
  ) : (
    <Menu className={cn(textColor, "h-6 w-6 cursor-pointer")} onClick={onClick} />
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
  textColorClassName,
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "dark" | "gradient";
  textColorClassName?: string;
} & (
  | React.ComponentPropsWithoutRef<"a">
  | React.ComponentPropsWithoutRef<"button">
)) => {
  const baseStyles =
    "px-4 py-2 rounded-md bg-white button bg-white text-black text-sm font-bold relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-block text-center";

  const variantStyles = {
    primary:
      "shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]",
    secondary: cn("bg-transparent shadow-none", textColorClassName || "text-neutral-600 dark:text-neutral-300"),
    dark: "bg-black text-white shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]",
    gradient:
      "bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset]",
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