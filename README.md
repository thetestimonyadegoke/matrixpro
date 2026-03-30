# Advanced Matrix - Power BI Custom Visual

A high-performance matrix visual for Power BI with virtualization, hierarchies, conditional formatting, data bars, KPI icons, sparklines, and export capabilities.

## Features

### Core Matrix Features
- **Row and Column Hierarchies**: Multi-level expand/collapse support
- **Totals/Subtotals**: Configurable row and column subtotals with grand totals
- **Sorting**: Sort by any visible value column while maintaining hierarchy
- **Selection/Cross-filtering**: Click to select rows and cross-filter other visuals
- **Bi-directional Virtualization**: Smooth scrolling with 1000+ rows and 50+ columns

### In-Cell Visuals
- **Data Bars**: Visual bars within cells showing relative values
- **KPI Icons**: ▲ ▼ ● indicators based on variance thresholds
- **Sparklines**: Mini line charts across columns for trend visualization

### Formatting
- **Modern Formatting Pane**: Full Power BI formatting model support
- **Conditional Formatting**: Threshold-based color scales
- **Customizable Styles**: Headers, values, totals, gridlines, row banding

### Export
- **CSV Export**: Export current view to CSV
- **Excel Export**: Export with formatting to XLSX

## Installation

### Prerequisites
- Node.js 16+ 
- Power BI Desktop
- pbiviz CLI (`npm install -g powerbi-visuals-tools`)

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm start

# Package for production
npm run package
```

## Development

### Project Structure

```
src/
├── visual.ts              # Power BI Visual entry point
├── capabilities.json      # Data roles and formatting objects
├── settings/
│   ├── settings.ts        # Typed settings model
│   └── formattingModel.ts # Modern formatting model
├── model/
│   ├── pivot.ts           # Data model builder
│   ├── tree.ts            # Tree utilities
│   ├── keys.ts            # Key generation
│   ├── totals.ts          # Subtotal calculations
│   └── sorting.ts         # Sorting logic
├── format/
│   ├── numberFormat.ts    # Number formatting
│   ├── conditional.ts     # Conditional formatting rules
│   └── styles.ts          # Style composition
├── virtualization/
│   ├── viewport.ts        # Visible range computation
│   └── scroll.ts          # Scroll handling with RAF
├── ui/
│   ├── App.tsx            # Root React component
│   ├── Matrix.tsx         # Main matrix grid
│   ├── Header.tsx         # Column headers
│   ├── RowHeader.tsx      # Row headers
│   ├── Row.tsx            # Row renderer
│   ├── Cell.tsx           # Cell renderer
│   ├── InCell/
│   │   ├── DataBar.tsx    # Data bar component
│   │   ├── KPIIcon.tsx    # KPI icon component
│   │   └── Sparkline.tsx  # Sparkline SVG component
│   ├── Toolbar.tsx        # Export buttons
│   └── EmptyState.tsx     # Empty data message
├── export/
│   ├── csv.ts             # CSV builder
│   ├── xlsx.ts            # XLSX builder
│   └── download.ts        # File download utilities
├── powerbi/
│   ├── selection.ts       # Selection manager wrapper
│   ├── tooltip.ts         # Tooltip helper
│   └── events.ts          # Rendering events
└── tests/
    ├── pivot.test.ts      # Key generation tests
    ├── conditional.test.ts # Conditional formatting tests
    └── totals.test.ts     # Totals computation tests
```

### Data Roles

| Role | Type | Description |
|------|------|-------------|
| Rows | Grouping | 1..N categorical fields for row hierarchy |
| Columns | Grouping | 0..N categorical fields for column hierarchy |
| Values | Measure | 1..N measures to display |
| SparklineMeasure | Measure | Optional single measure for sparklines |

### Running Tests

```bash
npm test
```

### Building

```bash
# Development build with watch
npm start

# Production package
npm run package
```

The packaged `.pbiviz` file will be in the `dist/` folder.

## Configuration

### Formatting Options

#### General
- Row Height (px)
- Default Column Width (px)
- Freeze First Column
- Show Gridlines
- Row Banding

#### Headers
- Font Size
- Bold
- Background Color
- Text Color

#### Values
- Font Size
- Alignment (left/center/right)
- Number Format

#### Totals
- Show Row Subtotals
- Show Column Subtotals
- Show Grand Totals
- Subtotal Position (top/bottom)
- Background Color
- Text Color

#### Conditional Formatting
- Enable/Disable
- Rule Type (thresholds/bands)
- Low/Mid/High Colors
- Threshold Percentages
- Apply to All Measures

#### Data Bars
- Enable/Disable
- Show Value Text
- Positive/Negative Colors
- Normalize By (column/row/global)

#### KPI Icons
- Enable/Disable
- Up/Down Thresholds
- Up/Neutral/Down Colors

#### Sparklines
- Enable/Disable
- Dedicated Column
- Normalize Per Row
- Show Min/Max Markers
- Line/Marker Colors
- Null Handling (gap/zero)

## Performance

The visual uses several optimization techniques:

1. **Bi-directional Virtualization**: Only renders visible rows and columns plus a small buffer
2. **React.memo**: Memoized components to prevent unnecessary re-renders
3. **RequestAnimationFrame**: Smooth scroll handling
4. **Cached Computations**: Memoized formatting and style calculations
5. **Efficient Data Structures**: Map-based cell lookups for O(1) access

Target performance: Smooth scrolling with ~1000 visible rows and ~50 visible columns.

## Architecture Notes

### Enterprise-Friendly Design
- No CDN assets - all assets bundled
- No external data transmission
- Minimal dependencies with adapter patterns
- Prepared for future certification

### Extensibility
- Clean module boundaries
- Typed interfaces throughout
- Adapter patterns for 3rd-party libs
- Testable core logic

## License

Internal use only.

## Support

For issues and feature requests, contact the development team.
