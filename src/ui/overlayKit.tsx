// ════════════════════════════════════════════════════════════════════════════
// Overlay kit — the one shell and control set every dialog, side sheet, wizard
// and popover uses, so they read as the same product as the command bar.
// All color comes from theme tokens (--mx-*) via style/overlayKit.less; the
// components here only carry structure and behavior.
// ════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "./icons";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Renders children into the nearest `.advanced-matrix-visual`, so overlays
 * inherit the theme tokens but escape the grid's zoom transform (which would
 * otherwise re-anchor `position: fixed` to the scaled stage).
 */
export const VisualPortal: React.FC<React.PropsWithChildren> = ({ children }) => {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const found = anchorRef.current?.closest<HTMLElement>(".advanced-matrix-visual");
    setHost(found ?? null);
  }, []);

  return (
    <>
      <span ref={anchorRef} hidden />
      {host ? createPortal(children, host) : null}
    </>
  );
};

// ── Shell ───────────────────────────────────────────────────────────────────

export interface OverlayProps {
  /** "sheet" docks to the right edge and keeps the grid visible; "dialog" is centered and modal. */
  kind?: "dialog" | "sheet";
  title: string;
  subtitle?: React.ReactNode;
  /** Width in px. Defaults: dialog 480, sheet 380. */
  width?: number;
  onClose: () => void;
  /** Right-aligned footer content, usually Buttons. Omit for live-apply sheets. */
  footer?: React.ReactNode;
  /** Left side of the footer (a reset link, a status line). */
  footerStart?: React.ReactNode;
  /** Rendered under the title row, e.g. Tabs. */
  toolbar?: React.ReactNode;
  /** Header actions placed before the close button. */
  headerActions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Body without padding, for panels that lay out their own columns. */
  flush?: boolean;
  dismissOnScrim?: boolean;
  children?: React.ReactNode;
}

export const Overlay: React.FC<OverlayProps> = ({
  kind = "dialog",
  title,
  subtitle,
  width,
  onClose,
  footer,
  footerStart,
  toolbar,
  headerActions,
  className,
  bodyClassName,
  flush,
  dismissOnScrim = true,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Focus the first field (or [data-autofocus]) on open; restore focus on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const preferred =
        panel.querySelector<HTMLElement>("[data-autofocus]") ||
        panel.querySelector<HTMLElement>(".mx-ov-body " + FOCUSABLE);
      (preferred || panel).focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Keep typing inside the overlay from reaching the grid's document-level shortcuts.
    e.stopPropagation();
    if (e.key === "Escape" && !e.defaultPrevented) {
      e.preventDefault();
      onCloseRef.current();
      return;
    }
    if (e.key === "Tab" && kind === "dialog") {
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const panelWidth = width ?? (kind === "sheet" ? 380 : 480);

  return (
    <VisualPortal>
      <div
        className={cx("mx-ov-scrim", `is-${kind}`)}
        onMouseDown={(e) => {
          if (dismissOnScrim && e.target === e.currentTarget) onCloseRef.current();
        }}
      >
        <div
          ref={panelRef}
          className={cx("mx-ov", `mx-ov-${kind}`, className)}
          style={{ width: panelWidth }}
          role="dialog"
          aria-modal={kind === "dialog" ? true : undefined}
          aria-labelledby={titleId}
          tabIndex={-1}
          onKeyDown={onKeyDown}
        >
          <header className="mx-ov-header">
            <div className="mx-ov-heading">
              <h2 id={titleId} className="mx-ov-title">{title}</h2>
              {subtitle ? <p className="mx-ov-subtitle">{subtitle}</p> : null}
            </div>
            {headerActions}
            <IconButton label="Close" icon={<IconClose size={14} />} onClick={onClose} />
          </header>
          {toolbar ? <div className="mx-ov-toolbar">{toolbar}</div> : null}
          <div className={cx("mx-ov-body", flush && "is-flush", bodyClassName)}>{children}</div>
          {footer || footerStart ? (
            <footer className="mx-ov-footer">
              <div className="mx-ov-footer-start">{footerStart}</div>
              <div className="mx-ov-footer-end">{footer}</div>
            </footer>
          ) : null}
        </div>
      </div>
    </VisualPortal>
  );
};

// ── Buttons ─────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: React.ReactNode;
  block?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ variant = "secondary", size = "md", icon, block, className, children, type = "button", ...rest }) => (
  <button
    type={type}
    className={cx("mx-btn", `is-${variant}`, size === "sm" && "is-sm", block && "is-block", className)}
    {...rest}
  >
    {icon ? <span className="mx-btn-icon">{icon}</span> : null}
    {children}
  </button>
);

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Accessible name; also the tooltip. */
  label: string;
  icon: React.ReactNode;
  tone?: "default" | "danger";
}

export const IconButton: React.FC<IconButtonProps> = ({ label, icon, tone = "default", className, type = "button", ...rest }) => (
  <button type={type} className={cx("mx-icon-btn", tone === "danger" && "is-danger", className)} aria-label={label} title={label} {...rest}>
    {icon}
  </button>
);

// ── Layout ──────────────────────────────────────────────────────────────────

export const Section: React.FC<{
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}> = ({ title, description, actions, className, children }) => (
  <section className={cx("mx-section", className)}>
    {title || actions ? (
      <div className="mx-section-head">
        <div>
          {title ? <h3 className="mx-section-title">{title}</h3> : null}
          {description ? <p className="mx-section-desc">{description}</p> : null}
        </div>
        {actions ? <div className="mx-section-actions">{actions}</div> : null}
      </div>
    ) : null}
    {children}
  </section>
);

/** A labelled control. `inline` puts the label left of the control on one row. */
export const Field: React.FC<{
  label: React.ReactNode;
  hint?: React.ReactNode;
  inline?: boolean;
  htmlFor?: string;
  className?: string;
  children?: React.ReactNode;
}> = ({ label, hint, inline, htmlFor, className, children }) => (
  <div className={cx("mx-field", inline && "is-inline", className)}>
    <label className="mx-field-label" htmlFor={htmlFor}>{label}</label>
    <div className="mx-field-control">{children}</div>
    {hint ? <p className="mx-field-hint">{hint}</p> : null}
  </div>
);

export const EmptyNote: React.FC<{ title: string; hint?: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode }> = ({ title, hint, icon, action }) => (
  <div className="mx-empty">
    {icon ? <div className="mx-empty-icon">{icon}</div> : null}
    <p className="mx-empty-title">{title}</p>
    {hint ? <p className="mx-empty-hint">{hint}</p> : null}
    {action ? <div className="mx-empty-action">{action}</div> : null}
  </div>
);

// ── Choice controls ─────────────────────────────────────────────────────────

export interface ChoiceOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  title?: string;
  disabled?: boolean;
}

/** Mutually exclusive options shown side by side (2–5 short choices). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  block,
  size = "md",
}: {
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  block?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div className={cx("mx-seg", block && "is-block", size === "sm" && "is-sm")} role="radiogroup" aria-label={ariaLabel}>
      {options.map(opt => (
        <button
          key={String(opt.value)}
          type="button"
          role="radio"
          aria-checked={opt.value === value}
          className={cx("mx-seg-item", opt.value === value && "is-on")}
          title={opt.title}
          disabled={opt.disabled}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Underline tabs for switching an overlay between views. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
}: {
  tabs: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="mx-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map(tab => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === value}
          className={cx("mx-tab", tab.value === value && "is-on")}
          disabled={tab.disabled}
          title={tab.title}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** On/off setting. The whole row is the hit target. */
export const Switch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
  /** Accessible name when there is no visible label. */
  ariaLabel?: string;
  className?: string;
}> = ({ checked, onChange, label, hint, disabled, ariaLabel, className }) => (
  <label className={cx("mx-switch", disabled && "is-disabled", className)}>
    {label ? (
      <span className="mx-switch-text">
        <span className="mx-switch-label">{label}</span>
        {hint ? <span className="mx-switch-hint">{hint}</span> : null}
      </span>
    ) : null}
    <input type="checkbox" role="switch" aria-label={label ? undefined : ariaLabel} checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
    <span className="mx-switch-track" aria-hidden="true" />
  </label>
);

/** Small color well: native picker behind a swatch. */
export const ColorWell: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}> = ({ value, onChange, label, disabled }) => (
  <label className={cx("mx-color", disabled && "is-disabled")} title={label}>
    <span className="mx-color-swatch" style={{ background: value || "transparent" }} />
    <input type="color" aria-label={label} value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} disabled={disabled} onChange={e => onChange(e.target.value)} />
  </label>
);
