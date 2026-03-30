// @ts-nocheck
import powerbi from "powerbi-visuals-api";
import { VisualSettings } from "./settings";

export function getFormattingModel(settings: VisualSettings): powerbi.visuals.FormattingModel {
  const formattingModel: powerbi.visuals.FormattingModel = {
    cards: [
      {
        displayName: "General",
        uid: "general_card",
        groups: [
          {
            displayName: undefined,
            uid: "general_group",
            slices: [
              {
                uid: "general_rowHeight",
                displayName: "Row Height",
                control: {
                  type: powerbi.visuals.FormattingComponent.NumUpDown,
                  properties: {
                    descriptor: {
                      objectName: "general",
                      propertyName: "rowHeight",
                    },
                    value: settings.general.rowHeight,
                  },
                },
              },
              {
                uid: "general_defaultColumnWidth",
                displayName: "Default Column Width",
                control: {
                  type: powerbi.visuals.FormattingComponent.NumUpDown,
                  properties: {
                    descriptor: {
                      objectName: "general",
                      propertyName: "defaultColumnWidth",
                    },
                    value: settings.general.defaultColumnWidth,
                  },
                },
              },
              {
                uid: "general_rowHeaderWidth",
                displayName: "Row Header Width",
                control: {
                  type: powerbi.visuals.FormattingComponent.NumUpDown,
                  properties: {
                    descriptor: {
                      objectName: "general",
                      propertyName: "rowHeaderWidth",
                    },
                    value: settings.general.rowHeaderWidth,
                  },
                },
              },
              {
                uid: "general_freezeFirstColumn",
                displayName: "Freeze First Column",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "general",
                      propertyName: "freezeFirstColumn",
                    },
                    value: settings.general.freezeFirstColumn,
                  },
                },
              },
              {
                uid: "general_showGridlines",
                displayName: "Show Gridlines",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "general",
                      propertyName: "showGridlines",
                    },
                    value: settings.general.showGridlines,
                  },
                },
              },
              {
                uid: "general_rowBanding",
                displayName: "Row Banding",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "general",
                      propertyName: "rowBanding",
                    },
                    value: settings.general.rowBanding,
                  },
                },
              },
            ],
          },
        ],
      },
      {
        displayName: "Layout",
        uid: "layout_card",
        groups: [
          {
            displayName: undefined,
            uid: "layout_group",
            slices: [
              {
                uid: "layout_mode",
                displayName: "Layout Mode",
                control: {
                  type: powerbi.visuals.FormattingComponent.Dropdown,
                  properties: {
                    descriptor: {
                      objectName: "layout",
                      propertyName: "mode",
                    },
                    value: settings.layout.mode,
                  },
                },
              },
            ],
          },
        ],
      },
      {
        displayName: "Appearance",
        uid: "appearance_card",
        groups: [
          {
            displayName: undefined,
            uid: "appearance_group",
            slices: [
              {
                uid: "appearance_surfaceColor",
                displayName: "Surface Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "appearance",
                      propertyName: "surfaceColor",
                    },
                    value: { value: settings.appearance.surfaceColor },
                  },
                },
              },
              {
                uid: "appearance_toolbarBackgroundColor",
                displayName: "Toolbar Background",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "appearance",
                      propertyName: "toolbarBackgroundColor",
                    },
                    value: { value: settings.appearance.toolbarBackgroundColor },
                  },
                },
              },
              {
                uid: "appearance_borderColor",
                displayName: "Border Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "appearance",
                      propertyName: "borderColor",
                    },
                    value: { value: settings.appearance.borderColor },
                  },
                },
              },
              {
                uid: "appearance_accentColor",
                displayName: "Accent Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "appearance",
                      propertyName: "accentColor",
                    },
                    value: { value: settings.appearance.accentColor },
                  },
                },
              },
              {
                uid: "appearance_cornerRadius",
                displayName: "Corner Radius",
                control: {
                  type: powerbi.visuals.FormattingComponent.NumUpDown,
                  properties: {
                    descriptor: {
                      objectName: "appearance",
                      propertyName: "cornerRadius",
                    },
                    value: settings.appearance.cornerRadius,
                  },
                },
              },
              {
                uid: "appearance_showToolbar",
                displayName: "Show Toolbar",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "appearance",
                      propertyName: "showToolbar",
                    },
                    value: settings.appearance.showToolbar,
                  },
                },
              },
            ],
          },
        ],
      },
      {
        displayName: "Headers",
        uid: "headers_card",
        groups: [
          {
            displayName: undefined,
            uid: "headers_group",
            slices: [
              {
                uid: "headers_fontSize",
                displayName: "Font Size",
                control: {
                  type: powerbi.visuals.FormattingComponent.NumUpDown,
                  properties: {
                    descriptor: {
                      objectName: "headers",
                      propertyName: "fontSize",
                    },
                    value: settings.headers.fontSize,
                  },
                },
              },
              {
                uid: "headers_bold",
                displayName: "Bold",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "headers",
                      propertyName: "bold",
                    },
                    value: settings.headers.bold,
                  },
                },
              },
              {
                uid: "headers_backgroundColor",
                displayName: "Background Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "headers",
                      propertyName: "backgroundColor",
                    },
                    value: { value: settings.headers.backgroundColor },
                  },
                },
              },
              {
                uid: "headers_textColor",
                displayName: "Text Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "headers",
                      propertyName: "textColor",
                    },
                    value: { value: settings.headers.textColor },
                  },
                },
              },
            ],
          },
        ],
      },
      {
        displayName: "Values",
        uid: "values_card",
        groups: [
          {
            displayName: undefined,
            uid: "values_group",
            slices: [
              {
                uid: "values_fontSize",
                displayName: "Font Size",
                control: {
                  type: powerbi.visuals.FormattingComponent.NumUpDown,
                  properties: {
                    descriptor: {
                      objectName: "values",
                      propertyName: "fontSize",
                    },
                    value: settings.values.fontSize,
                  },
                },
              },
              {
                uid: "values_alignment",
                displayName: "Alignment",
                control: {
                  type: powerbi.visuals.FormattingComponent.Dropdown,
                  properties: {
                    descriptor: {
                      objectName: "values",
                      propertyName: "alignment",
                    },
                    value: settings.values.alignment,
                  },
                },
              },
              {
                uid: "values_numberFormat",
                displayName: "Number Format",
                control: {
                  type: powerbi.visuals.FormattingComponent.TextInput,
                  properties: {
                    descriptor: {
                      objectName: "values",
                      propertyName: "numberFormat",
                    },
                    value: settings.values.numberFormat,
                    placeholder: "Auto",
                  },
                },
              },
            ],
          },
        ],
      },
      {
        displayName: "Totals",
        uid: "totals_card",
        groups: [
          {
            displayName: undefined,
            uid: "totals_group",
            slices: [
              {
                uid: "totals_showRowSubtotals",
                displayName: "Show Row Subtotals",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "totals",
                      propertyName: "showRowSubtotals",
                    },
                    value: settings.totals.showRowSubtotals,
                  },
                },
              },
              {
                uid: "totals_showColumnSubtotals",
                displayName: "Show Column Subtotals",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "totals",
                      propertyName: "showColumnSubtotals",
                    },
                    value: settings.totals.showColumnSubtotals,
                  },
                },
              },
              {
                uid: "totals_showGrandTotals",
                displayName: "Show Grand Totals",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "totals",
                      propertyName: "showGrandTotals",
                    },
                    value: settings.totals.showGrandTotals,
                  },
                },
              },
              {
                uid: "totals_subtotalPosition",
                displayName: "Subtotal Position",
                control: {
                  type: powerbi.visuals.FormattingComponent.Dropdown,
                  properties: {
                    descriptor: {
                      objectName: "totals",
                      propertyName: "subtotalPosition",
                    },
                    value: settings.totals.subtotalPosition,
                  },
                },
              },
              {
                uid: "totals_backgroundColor",
                displayName: "Background Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "totals",
                      propertyName: "backgroundColor",
                    },
                    value: { value: settings.totals.backgroundColor },
                  },
                },
              },
              {
                uid: "totals_textColor",
                displayName: "Text Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "totals",
                      propertyName: "textColor",
                    },
                    value: { value: settings.totals.textColor },
                  },
                },
              },
            ],
          },
        ],
      },
      {
        displayName: "Conditional Formatting",
        uid: "conditionalFormatting_card",
        groups: [
          {
            displayName: undefined,
            uid: "conditionalFormatting_group",
            slices: [
              {
                uid: "conditionalFormatting_enabled",
                displayName: "Enable",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "conditionalFormatting",
                      propertyName: "enabled",
                    },
                    value: settings.conditionalFormatting.enabled,
                  },
                },
              },
              {
                uid: "conditionalFormatting_ruleType",
                displayName: "Rule Type",
                control: {
                  type: powerbi.visuals.FormattingComponent.Dropdown,
                  properties: {
                    descriptor: {
                      objectName: "conditionalFormatting",
                      propertyName: "ruleType",
                    },
                    value: settings.conditionalFormatting.ruleType,
                  },
                },
              },
              {
                uid: "conditionalFormatting_lowColor",
                displayName: "Low Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "conditionalFormatting",
                      propertyName: "lowColor",
                    },
                    value: { value: settings.conditionalFormatting.lowColor },
                  },
                },
              },
              {
                uid: "conditionalFormatting_midColor",
                displayName: "Mid Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "conditionalFormatting",
                      propertyName: "midColor",
                    },
                    value: { value: settings.conditionalFormatting.midColor },
                  },
                },
              },
              {
                uid: "conditionalFormatting_highColor",
                displayName: "High Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "conditionalFormatting",
                      propertyName: "highColor",
                    },
                    value: { value: settings.conditionalFormatting.highColor },
                  },
                },
              },
              {
                uid: "conditionalFormatting_lowThreshold",
                displayName: "Low Threshold (%)",
                control: {
                  type: powerbi.visuals.FormattingComponent.NumUpDown,
                  properties: {
                    descriptor: {
                      objectName: "conditionalFormatting",
                      propertyName: "lowThreshold",
                    },
                    value: settings.conditionalFormatting.lowThreshold,
                  },
                },
              },
              {
                uid: "conditionalFormatting_highThreshold",
                displayName: "High Threshold (%)",
                control: {
                  type: powerbi.visuals.FormattingComponent.NumUpDown,
                  properties: {
                    descriptor: {
                      objectName: "conditionalFormatting",
                      propertyName: "highThreshold",
                    },
                    value: settings.conditionalFormatting.highThreshold,
                  },
                },
              },
              {
                uid: "conditionalFormatting_applyToAllMeasures",
                displayName: "Apply to All Measures",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "conditionalFormatting",
                      propertyName: "applyToAllMeasures",
                    },
                    value: settings.conditionalFormatting.applyToAllMeasures,
                  },
                },
              },
            ],
          },
        ],
      },
      {
        displayName: "Quick Calcs",
        uid: "quickCalcs_card",
        groups: [
          {
            displayName: undefined,
            uid: "quickCalcs_group",
            slices: [
              {
                uid: "quickCalcs_enabled",
                displayName: "Enable",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "quickCalcs",
                      propertyName: "enabled",
                    },
                    value: settings.quickCalcs.enabled,
                  },
                },
              },
              {
                uid: "quickCalcs_type",
                displayName: "Calculation",
                control: {
                  type: powerbi.visuals.FormattingComponent.Dropdown,
                  properties: {
                    descriptor: {
                      objectName: "quickCalcs",
                      propertyName: "type",
                    },
                    value: settings.quickCalcs.type,
                  },
                },
              },
              {
                uid: "quickCalcs_targetMeasure",
                displayName: "Target Measure Index",
                control: {
                  type: powerbi.visuals.FormattingComponent.NumUpDown,
                  properties: {
                    descriptor: {
                      objectName: "quickCalcs",
                      propertyName: "targetMeasure",
                    },
                    value: settings.quickCalcs.targetMeasure,
                  },
                },
              },
            ],
          },
        ],
      },
      {
        displayName: "Data Bars",
        uid: "dataBars_card",
        groups: [
          {
            displayName: undefined,
            uid: "dataBars_group",
            slices: [
              {
                uid: "dataBars_enabled",
                displayName: "Enable",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "dataBars",
                      propertyName: "enabled",
                    },
                    value: settings.dataBars.enabled,
                  },
                },
              },
              {
                uid: "dataBars_showValueText",
                displayName: "Show Value Text",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "dataBars",
                      propertyName: "showValueText",
                    },
                    value: settings.dataBars.showValueText,
                  },
                },
              },
              {
                uid: "dataBars_positiveColor",
                displayName: "Positive Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "dataBars",
                      propertyName: "positiveColor",
                    },
                    value: { value: settings.dataBars.positiveColor },
                  },
                },
              },
              {
                uid: "dataBars_negativeColor",
                displayName: "Negative Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "dataBars",
                      propertyName: "negativeColor",
                    },
                    value: { value: settings.dataBars.negativeColor },
                  },
                },
              },
              {
                uid: "dataBars_normalizeBy",
                displayName: "Normalize By",
                control: {
                  type: powerbi.visuals.FormattingComponent.Dropdown,
                  properties: {
                    descriptor: {
                      objectName: "dataBars",
                      propertyName: "normalizeBy",
                    },
                    value: settings.dataBars.normalizeBy,
                  },
                },
              },
            ],
          },
        ],
      },
      {
        displayName: "KPI Icons",
        uid: "kpiIcons_card",
        groups: [
          {
            displayName: undefined,
            uid: "kpiIcons_group",
            slices: [
              {
                uid: "kpiIcons_enabled",
                displayName: "Enable",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "kpiIcons",
                      propertyName: "enabled",
                    },
                    value: settings.kpiIcons.enabled,
                  },
                },
              },
              {
                uid: "kpiIcons_upThreshold",
                displayName: "Up Threshold (%)",
                control: {
                  type: powerbi.visuals.FormattingComponent.NumUpDown,
                  properties: {
                    descriptor: {
                      objectName: "kpiIcons",
                      propertyName: "upThreshold",
                    },
                    value: settings.kpiIcons.upThreshold,
                  },
                },
              },
              {
                uid: "kpiIcons_downThreshold",
                displayName: "Down Threshold (%)",
                control: {
                  type: powerbi.visuals.FormattingComponent.NumUpDown,
                  properties: {
                    descriptor: {
                      objectName: "kpiIcons",
                      propertyName: "downThreshold",
                    },
                    value: settings.kpiIcons.downThreshold,
                  },
                },
              },
              {
                uid: "kpiIcons_upColor",
                displayName: "Up Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "kpiIcons",
                      propertyName: "upColor",
                    },
                    value: { value: settings.kpiIcons.upColor },
                  },
                },
              },
              {
                uid: "kpiIcons_neutralColor",
                displayName: "Neutral Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "kpiIcons",
                      propertyName: "neutralColor",
                    },
                    value: { value: settings.kpiIcons.neutralColor },
                  },
                },
              },
              {
                uid: "kpiIcons_downColor",
                displayName: "Down Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "kpiIcons",
                      propertyName: "downColor",
                    },
                    value: { value: settings.kpiIcons.downColor },
                  },
                },
              },
            ],
          },
        ],
      },
      {
        displayName: "Sparklines",
        uid: "sparklines_card",
        groups: [
          {
            displayName: undefined,
            uid: "sparklines_group",
            slices: [
              {
                uid: "sparklines_enabled",
                displayName: "Enable",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "sparklines",
                      propertyName: "enabled",
                    },
                    value: settings.sparklines.enabled,
                  },
                },
              },
              {
                uid: "sparklines_showInDedicatedColumn",
                displayName: "Show in Dedicated Column",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "sparklines",
                      propertyName: "showInDedicatedColumn",
                    },
                    value: settings.sparklines.showInDedicatedColumn,
                  },
                },
              },
              {
                uid: "sparklines_normalizePerRow",
                displayName: "Normalize Per Row",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "sparklines",
                      propertyName: "normalizePerRow",
                    },
                    value: settings.sparklines.normalizePerRow,
                  },
                },
              },
              {
                uid: "sparklines_showMinMaxMarkers",
                displayName: "Show Min/Max Markers",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "sparklines",
                      propertyName: "showMinMaxMarkers",
                    },
                    value: settings.sparklines.showMinMaxMarkers,
                  },
                },
              },
              {
                uid: "sparklines_lineColor",
                displayName: "Line Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "sparklines",
                      propertyName: "lineColor",
                    },
                    value: { value: settings.sparklines.lineColor },
                  },
                },
              },
              {
                uid: "sparklines_markerColor",
                displayName: "Marker Color",
                control: {
                  type: powerbi.visuals.FormattingComponent.ColorPicker,
                  properties: {
                    descriptor: {
                      objectName: "sparklines",
                      propertyName: "markerColor",
                    },
                    value: { value: settings.sparklines.markerColor },
                  },
                },
              },
              {
                uid: "sparklines_nullHandling",
                displayName: "Null Handling",
                control: {
                  type: powerbi.visuals.FormattingComponent.Dropdown,
                  properties: {
                    descriptor: {
                      objectName: "sparklines",
                      propertyName: "nullHandling",
                    },
                    value: settings.sparklines.nullHandling,
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  };

  return formattingModel;
}
