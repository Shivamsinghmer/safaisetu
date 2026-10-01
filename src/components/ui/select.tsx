"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional second line under the label */
  hint?: string;
}

/**
 * Themed dropdown that replaces the native <select> everywhere: a button that opens a
 * listbox styled with the theme tokens (light and dark). Keyboard: Enter/Space/↓ opens,
 * ↑/↓/Home/End move, Enter picks, Esc or Tab closes. With `name` it submits a hidden input,
 * so it works inside server-action forms like a native select.
 */
export function Select({
  id,
  name,
  options,
  value,
  defaultValue,
  onChange,
  placeholder = "Choose…",
  ariaLabel,
  variant = "field",
  icon,
  align = "start",
  className,
}: {
  id?: string;
  name?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** "field" matches form inputs; "pill" is a compact rounded trigger for toolbars and navs */
  variant?: "field" | "pill";
  icon?: ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value ?? inner;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const uid = useId();
  const listId = `${uid}-list`;
  const selected = options.find((o) => o.value === current);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted option in view and the list focused while open
  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function openList() {
    const i = options.findIndex((o) => o.value === current);
    setActive(i >= 0 ? i : 0);
    setOpen(true);
  }

  function pick(v: string) {
    if (value === undefined) setInner(v);
    onChange?.(v);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKey(e: KeyboardEvent) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  }

  function onListKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown")
      setActive((i) => Math.min(options.length - 1, i + 1));
    else if (e.key === "ArrowUp") setActive((i) => Math.max(0, i - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(options.length - 1);
    else if (e.key === "Enter" || e.key === " ") {
      const o = options[active];
      if (o) pick(o.value);
    } else if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "Tab") setOpen(false);
    else return;
    e.preventDefault();
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative", variant === "field" && "w-full", className)}
    >
      {name && <input type="hidden" name={name} value={current} />}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onTriggerKey}
        className={cn(
          "flex cursor-pointer items-center gap-2 text-left transition-[border-color,box-shadow,background-color] duration-150 focus:outline-none",
          variant === "field"
            ? "h-10 w-full rounded-md border border-input bg-white px-3 text-[15px] text-ink focus-visible:border-blue focus-visible:ring-3 focus-visible:ring-blue/15"
            : "h-9 rounded-full border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:ring-3 focus-visible:ring-blue/20",
          open && variant === "field" && "border-blue ring-3 ring-blue/15",
        )}
      >
        {icon}
        <span
          className={cn("min-w-0 flex-1 truncate", !selected && "text-fog")}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-ash transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={`${uid}-opt-${active}`}
          onKeyDown={onListKey}
          className={cn(
            "absolute top-[calc(100%+6px)] z-50 max-h-72 min-w-full overflow-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg focus:outline-none",
            "dropdown-pop",
            align === "end" ? "right-0" : "left-0",
            variant === "pill" && "w-max min-w-40",
          )}
        >
          {options.map((o, i) => {
            const isSelected = o.value === current;
            return (
              <li
                key={o.value}
                id={`${uid}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o.value)}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-[14px]",
                  i === active ? "bg-muted text-foreground" : "text-foreground",
                  isSelected && "font-semibold",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block">{o.label}</span>
                  {o.hint && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {o.hint}
                    </span>
                  )}
                </span>
                <Check
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 text-brand",
                    isSelected ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
