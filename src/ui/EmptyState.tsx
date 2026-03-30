import React, { memo, useState } from "react";
import { IconGrid } from "./icons";
import { VisualSettings } from "../settings/settings";

export interface EmptyStateProps {
  hasRows: boolean;
  hasValues: boolean;
  settings: VisualSettings;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
}

type OnboardingStep = "landing" | "customize";

export const EmptyState: React.FC<EmptyStateProps> = memo(({
  hasRows,
  hasValues,
  settings,
  onPersistProperty,
}) => {
  const [step, setStep] = useState<OnboardingStep>("landing");

  const handleApplyPreset = (preset: "default" | "financial" | "compact") => {
    if (preset === "default") {
      onPersistProperty("layout", "mode", "hierarchy");
      onPersistProperty("theme", "preset", "modern-light");
      onPersistProperty("theme", "density", "comfortable");
    } else if (preset === "financial") {
      onPersistProperty("layout", "mode", "hierarchy");
      onPersistProperty("theme", "preset", "finance-statement");
      onPersistProperty("theme", "density", "comfortable");
      onPersistProperty("totals", "showRowSubtotals", true);
      onPersistProperty("totals", "showColumnSubtotals", true);
      onPersistProperty("totals", "showGrandTotals", true);
      onPersistProperty("totals", "subtotalPosition", "bottom");
    } else if (preset === "compact") {
      onPersistProperty("layout", "mode", "table");
      onPersistProperty("theme", "preset", "modern-dark");
      onPersistProperty("theme", "density", "compact");
      onPersistProperty("totals", "showRowSubtotals", false);
      onPersistProperty("totals", "showColumnSubtotals", false);
    }
  };

  const handleRowSubtotalChange = (mode: "off" | "top" | "bottom") => {
    if (mode === "off") {
      onPersistProperty("totals", "showRowSubtotals", false);
    } else {
      onPersistProperty("totals", "showRowSubtotals", true);
      onPersistProperty("totals", "subtotalPosition", mode === "top" ? "top" : "bottom");
    }
  };

  const handleColumnSubtotalToggle = (enabled: boolean) => {
    onPersistProperty("totals", "showColumnSubtotals", enabled);
  };

  const handleGrandTotalToggle = (enabled: boolean) => {
    onPersistProperty("totals", "showGrandTotals", enabled);
  };

  const handleThemeToggle = (theme: "light" | "dark") => {
    onPersistProperty("theme", "preset", theme === "light" ? "modern-light" : "modern-dark");
  };

  // If user has partially configured data, still show a helpful message
  const needsRows = !hasRows;
  const needsValues = !hasValues;

  if (needsRows || needsValues) {
    const parts: string[] = [];
    if (needsRows) parts.push("Rows");
    if (needsValues) parts.push("Values");

    const message = "Add data fields to get started";
    const instruction = `Drag at least one field into the ${parts.join(" and ")} wells.`;

    return (
      <div className="empty-state onboarding-root">
        <div className="onboarding-logo-row">
          <div className="onboarding-logo-mark" aria-hidden="true">
            <IconGrid size={24} />
          </div>
          <div className="onboarding-logo-text">
            <div className="onboarding-brand">Onebit</div>
            <div className="onboarding-product">Advanced Reporting Matrix</div>
          </div>
        </div>
        <div className="empty-title">{message}</div>
        <div className="empty-message">{instruction}</div>
      </div>
    );
  }

  if (step === "landing") {
    return (
      <div className="empty-state onboarding-root">
        <div className="onboarding-logo-row">
          <div className="onboarding-logo-mark" aria-hidden="true">
            <IconGrid size={32} />
          </div>
          <div className="onboarding-logo-text">
            <div className="onboarding-brand">Onebit</div>
            <div className="onboarding-product">Advanced Reporting Matrix</div>
          </div>
        </div>

        <div className="onboarding-tagline">
          For management, financial, variance & paginated-style reports
        </div>

        <div className="onboarding-cards">
          <div className="onboarding-card">
            <div className="onboarding-card-title">New to Onebit?</div>
            <div className="onboarding-card-body">
              Learn how to build reports the fastest way.
            </div>
            <button
              type="button"
              className="onboarding-btn secondary"
              onClick={() => {
                // Placeholder: open documentation link if available
                // window.open("https://onebit-matrix.docs", "_blank");
              }}
            >
              Watch videos
            </button>
          </div>

          <div className="onboarding-card primary">
            <div className="onboarding-card-title">Get started</div>
            <div className="onboarding-card-body">
              Build your report in a few steps with the launch wizard.
            </div>
            <button
              type="button"
              className="onboarding-btn primary"
              onClick={() => setStep("customize")}
            >
              Start building
            </button>
          </div>
        </div>

        <div className="onboarding-footer-hint">
          ◦ Add data fields to get started
        </div>
        <div className="onboarding-footer-links">
          <span>Videos</span>
          <span>Community</span>
          <span>Learn more</span>
        </div>
      </div>
    );
  }

  // Customize step
  const rowSubtotalMode: "off" | "top" | "bottom" = !settings.totals.showRowSubtotals
    ? "off"
    : settings.totals.subtotalPosition === "top"
      ? "top"
      : "bottom";

  const columnSubtotalsOn = settings.totals.showColumnSubtotals;
  const grandTotalsOn = settings.totals.showGrandTotals;
  const lightTheme = settings.theme.preset === "modern-light" || settings.theme.preset === "finance-statement";

  return (
    <div className="empty-state onboarding-root customize-step">
      <div className="onboarding-panel">
        <div className="onboarding-panel-header">Customize Matrix</div>
        <div className="onboarding-panel-subtitle">
          Please configure your view and add data field(s).
        </div>

        <div className="onboarding-panel-body">
          <div className="onboarding-form">
            <div className="onboarding-field-group">
              <label className="onboarding-label">Preset</label>
              <select
                className="onboarding-select"
                value={"default"}
                onChange={(e) => handleApplyPreset(e.target.value as any)}
              >
                <option value="default">Default</option>
                <option value="financial">Financial Statement</option>
                <option value="compact">Compact Analytics</option>
              </select>
            </div>

            <div className="onboarding-field-group two-column">
              <div>
                <label className="onboarding-label">Row subtotals</label>
                <select
                  className="onboarding-select"
                  value={rowSubtotalMode}
                  onChange={(e) => handleRowSubtotalChange(e.target.value as any)}
                >
                  <option value="off">Off</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
              <div>
                <label className="onboarding-label">Column subtotals</label>
                <select
                  className="onboarding-select"
                  value={columnSubtotalsOn ? "on" : "off"}
                  onChange={(e) => handleColumnSubtotalToggle(e.target.value === "on")}
                >
                  <option value="off">Off</option>
                  <option value="on">On</option>
                </select>
              </div>
            </div>

            <div className="onboarding-field-group">
              <label className="onboarding-label">Grand totals</label>
              <label className="onboarding-checkbox">
                <input
                  type="checkbox"
                  checked={grandTotalsOn}
                  onChange={(e) => handleGrandTotalToggle(e.target.checked)}
                />
                <span>Show grand totals</span>
              </label>
            </div>

            <div className="onboarding-field-group">
              <label className="onboarding-label">Theme</label>
              <div className="onboarding-radio-row">
                <label className="onboarding-radio">
                  <input
                    type="radio"
                    name="onboarding-theme"
                    checked={lightTheme}
                    onChange={() => handleThemeToggle("light")}
                  />
                  <span>Light</span>
                </label>
                <label className="onboarding-radio">
                  <input
                    type="radio"
                    name="onboarding-theme"
                    checked={!lightTheme}
                    onChange={() => handleThemeToggle("dark")}
                  />
                  <span>Dark</span>
                </label>
              </div>
            </div>
          </div>

          <div className="onboarding-preview">
            <div className="onboarding-preview-title">Preview</div>
            <div className="onboarding-preview-grid">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Juice</th>
                    <th>Soda</th>
                    <th>Coffee</th>
                    <th>Water</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Region-1</strong></td>
                    <td>670</td>
                    <td>686</td>
                    <td>1282</td>
                    <td>898</td>
                  </tr>
                  <tr>
                    <td>US</td>
                    <td>487</td>
                    <td>499</td>
                    <td>326</td>
                    <td>168</td>
                  </tr>
                  <tr>
                    <td>East</td>
                    <td>183</td>
                    <td>187</td>
                    <td>956</td>
                    <td>730</td>
                  </tr>
                  <tr>
                    <td><strong>Region-2</strong></td>
                    <td>224</td>
                    <td>224</td>
                    <td>769</td>
                    <td>462</td>
                  </tr>
                  <tr>
                    <td>GrandTotal</td>
                    <td>897</td>
                    <td>910</td>
                    <td>2961</td>
                    <td>1360</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="onboarding-panel-footer">
          <button
            type="button"
            className="onboarding-link-button"
            onClick={() => setStep("landing")}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
});

EmptyState.displayName = "EmptyState";
