import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDown, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { useTranslation } from "react-i18next";

export interface EllipsisMenuItem {
  /**
   * Unique identifier for the menu item
   */
  id: string;
  /**
   * Display label
   */
  label: string;
  /**
   * Optional icon component
   */
  icon?: React.ComponentType<{ className?: string }>;
  /**
   * Click handler
   */
  onClick: () => void;
  /**
   * Whether this is a destructive action (red styling)
   * @default false
   */
  destructive?: boolean;
  /**
   * Whether the item is disabled
   * @default false
   */
  disabled?: boolean;
}

export interface EllipsisMenuProps {
  /**
   * Menu items to display
   */
  items: EllipsisMenuItem[];
  /**
   * Additional class name for the trigger button
   */
  triggerClassName?: string;
  /**
   * Additional class name for the menu dropdown
   */
  menuClassName?: string;
  /**
   * Size of the trigger button
   * @default "default"
   */
  size?: "sm" | "default";
  /**
   * Alignment of the dropdown menu
   * @default "right"
   */
  align?: "left" | "right";
  /**
   * Controlled open state
   */
  open?: boolean;
  /**
   * Callback when open state changes
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Aria label for the trigger button
   * @default "More options"
   */
  ariaLabel?: string;
  /**
   * Render the trigger as this text instead of an ellipsis icon.
   *
   * A section heading's own menu reads as a word ("Manage"), not as a floating
   * glyph: the icon alone gives no clue what it governs when it sits next to a
   * title rather than on the row it acts on.
   */
  triggerLabel?: string;
}

interface MenuPosition {
  top: number;
  left?: number;
  right?: number;
}

/**
 * Reusable ellipsis (three dots) menu component.
 * Uses a React Portal mounted into document.body with fixed positioning
 * so it cleanly renders in front and on top of table rows, headers, and
 * overflow scroll containers without z-index clipping.
 */
export function EllipsisMenu({
  items,
  triggerClassName,
  menuClassName,
  size = "default",
  align = "right",
  open: controlledOpen,
  onOpenChange,
  ariaLabel,
  triggerLabel,
}: EllipsisMenuProps) {
  const { t } = useTranslation();

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = React.useState<MenuPosition | null>(null);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (open: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(open);
      }
      onOpenChange?.(open);
    },
    [isControlled, onOpenChange],
  );

  const handleToggle = React.useCallback(() => {
    setOpen(!isOpen);
  }, [isOpen, setOpen]);

  const handleClose = React.useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleItemClick = React.useCallback(
    (item: EllipsisMenuItem) => {
      if (item.disabled) return;
      item.onClick();
      handleClose();
    },
    [handleClose],
  );

  // Position calculation relative to viewport
  const updatePosition = React.useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = items.length * 40 + 16;

    // Flip upwards if cramped below and more room above
    const openUpwards = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    const top = openUpwards
      ? Math.max(8, rect.top - (menuRef.current?.offsetHeight || estimatedHeight) - 4)
      : Math.min(window.innerHeight - 8, rect.bottom + 4);

    if (align === "left") {
      setMenuPosition({
        top,
        left: Math.max(8, Math.min(window.innerWidth - 200, rect.left)),
      });
    } else {
      setMenuPosition({
        top,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
  }, [align, items.length]);

  // Recalculate position on scroll and resize while open
  React.useEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return;
    }
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Dual-ref click outside detection (checking container trigger & portaled menu)
  React.useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      handleClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen, handleClose]);

  // Keyboard navigation
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen) {
        if (
          event.key === "Enter" ||
          event.key === " " ||
          event.key === "ArrowDown"
        ) {
          event.preventDefault();
          setOpen(true);
        }
        return;
      }

      const menuItems = menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not([disabled])',
      );
      if (!menuItems?.length) return;

      const currentIndex = Array.from(menuItems).findIndex(
        (el) => el === document.activeElement,
      );

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          if (currentIndex < menuItems.length - 1) {
            menuItems[currentIndex + 1].focus();
          } else {
            menuItems[0].focus();
          }
          break;
        case "ArrowUp":
          event.preventDefault();
          if (currentIndex > 0) {
            menuItems[currentIndex - 1].focus();
          } else {
            menuItems[menuItems.length - 1].focus();
          }
          break;
        case "Home":
          event.preventDefault();
          menuItems[0].focus();
          break;
        case "End":
          event.preventDefault();
          menuItems[menuItems.length - 1].focus();
          break;
        case "Escape":
          event.preventDefault();
          handleClose();
          break;
      }
    },
    [isOpen, setOpen, handleClose],
  );

  // Focus first item when menu opens
  React.useEffect(() => {
    if (isOpen) {
      const firstItem = menuRef.current?.querySelector<HTMLButtonElement>(
        '[role="menuitem"]:not([disabled])',
      );
      firstItem?.focus();
    }
  }, [isOpen]);

  const buttonSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div ref={containerRef} className="relative inline-block" onKeyDown={handleKeyDown}>
      {triggerLabel ? (
        <button
          type="button"
          onClick={handleToggle}
          aria-label={ariaLabel ?? triggerLabel}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className={cn(
            "inline-flex items-center gap-0.5 text-xs font-medium text-whatsapp-teal-green hover:underline",
            triggerClassName,
          )}
        >
          {triggerLabel}
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          aria-label={ariaLabel ?? t("common.moreOptions", "More options")}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className={cn(buttonSize, triggerClassName)}
        >
          <MoreVertical className={iconSize} />
        </Button>
      )}

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-orientation="vertical"
            style={{
              position: "fixed",
              top: menuPosition ? `${menuPosition.top}px` : "-9999px",
              ...(menuPosition?.left !== undefined
                ? { left: `${menuPosition.left}px` }
                : {}),
              ...(menuPosition?.right !== undefined
                ? { right: `${menuPosition.right}px` }
                : {}),
              zIndex: 9999,
            }}
            className={cn(
              "w-48 rounded-md border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-elevated py-1 shadow-xl",
              menuClassName,
            )}
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  role="menuitem"
                  type="button"
                  disabled={item.disabled}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-whatsapp-green focus:bg-gray-100 dark:focus:bg-dark-tertiary",
                    item.destructive
                      ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                      : "text-gray-700 dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-tertiary",
                    item.disabled && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
