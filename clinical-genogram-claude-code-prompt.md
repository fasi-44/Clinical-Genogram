# Claude Code Prompt: Clinical Genogram Package

**Create a production-ready, publishable npm package called `clinical-genogram` — a fully interactive genogram/family tree builder using Stencil.js (Web Components) with internationally accepted clinical symbols, JSON-based data model, and export capabilities. The package must work natively in Angular, React, Vue, and plain HTML without any framework dependency.**

---

## PROJECT STRUCTURE

```
clinical-genogram/
├── src/
│   ├── index.ts                          # Main export
│   ├── types/
│   │   ├── index.ts                      # All TypeScript interfaces
│   │   ├── nodes.ts                      # Person/member node types
│   │   ├── relationships.ts              # Relationship types & enums
│   │   └── schema.ts                     # JSON schema definition
│   ├── components/
│   │   ├── clinical-genogram/            # Main wrapper component
│   │   │   ├── clinical-genogram.tsx
│   │   │   ├── clinical-genogram.css
│   │   │   └── test/
│   │   │       └── clinical-genogram.spec.tsx
│   │   ├── genogram-canvas/              # SVG canvas with zoom/pan
│   │   │   ├── genogram-canvas.tsx
│   │   │   ├── genogram-canvas.css
│   │   │   └── test/
│   │   │       └── genogram-canvas.spec.tsx
│   │   ├── genogram-toolbar/             # Toolbar component
│   │   │   ├── genogram-toolbar.tsx
│   │   │   ├── genogram-toolbar.css
│   │   │   └── test/
│   │   │       └── genogram-toolbar.spec.tsx
│   │   ├── genogram-legend/              # Legend panel
│   │   │   ├── genogram-legend.tsx
│   │   │   ├── genogram-legend.css
│   │   │   └── test/
│   │   │       └── genogram-legend.spec.tsx
│   │   ├── genogram-property-panel/      # Edit selected node/edge
│   │   │   ├── genogram-property-panel.tsx
│   │   │   ├── genogram-property-panel.css
│   │   │   └── test/
│   │   │       └── genogram-property-panel.spec.tsx
│   │   ├── person-node/                  # Person node renderer
│   │   │   ├── person-node.tsx
│   │   │   └── person-node.css
│   │   ├── relationship-edge/            # Relationship line renderer
│   │   │   ├── relationship-edge.tsx
│   │   │   └── relationship-edge.css
│   │   ├── person-form/                  # Person edit form
│   │   │   ├── person-form.tsx
│   │   │   └── person-form.css
│   │   ├── relationship-form/            # Relationship edit form
│   │   │   ├── relationship-form.tsx
│   │   │   └── relationship-form.css
│   │   ├── illness-tag-selector/         # Multi-select illness tags
│   │   │   ├── illness-tag-selector.tsx
│   │   │   └── illness-tag-selector.css
│   │   └── consanguinity-form/           # Consanguinity selector
│   │       ├── consanguinity-form.tsx
│   │       └── consanguinity-form.css
│   ├── symbols/                          # Pure SVG symbol renderers
│   │   ├── index.ts
│   │   ├── male-symbol.ts               # Square
│   │   ├── female-symbol.ts             # Circle
│   │   ├── gender-unknown-symbol.ts     # Diamond with ?
│   │   ├── pet-symbol.ts               # Diamond
│   │   ├── adopted-overlay.ts          # Dashed blue border modifier
│   │   ├── foster-overlay.ts           # Dotted green border modifier
│   │   ├── pregnancy-symbol.ts         # Triangle
│   │   ├── miscarriage-symbol.ts       # Triangle with X
│   │   ├── abortion-symbol.ts          # Triangle with line + X
│   │   ├── death-overlay.ts            # X overlay on any symbol
│   │   ├── twins-connector.ts          # V-shape connecting two nodes
│   │   ├── identical-twins-connector.ts # V-shape with horizontal bar
│   │   └── condition-indicator.ts       # Colored quadrant fill for conditions
│   ├── lines/                           # Pure SVG relationship line renderers
│   │   ├── index.ts
│   │   ├── marriage-line.ts            # Solid black
│   │   ├── separation-line.ts          # 1 red zigzag
│   │   ├── legal-separation-line.ts    # 2 red zigzags
│   │   ├── divorce-line.ts             # 3 red zigzags
│   │   ├── engagement-line.ts          # Dashed blue
│   │   ├── engagement-cohab-line.ts    # Dashed blue + solid
│   │   ├── engagement-sep-line.ts      # Dashed blue + zigzag
│   │   ├── legal-cohab-line.ts         # Dash-dot blue
│   │   ├── legal-cohab-sep-line.ts     # Dash-dot blue + zigzag
│   │   ├── legal-cohab-official-sep-line.ts
│   │   ├── cohabitation-line.ts        # Short dashed blue
│   │   ├── cohab-sep-line.ts
│   │   ├── non-sentimental-cohab-line.ts
│   │   ├── non-sentimental-cohab-sep-line.ts
│   │   ├── casual-dating-line.ts       # Dotted blue
│   │   ├── casual-sep-line.ts
│   │   ├── committed-rel-line.ts       # Dash-dot-dot blue
│   │   ├── temporary-rel-line.ts
│   │   ├── love-affair-line.ts         # Dash-dot-dot red
│   │   ├── nullity-line.ts             # Triple zigzag on dashed
│   │   ├── child-line.ts              # Vertical parent-to-child
│   │   └── zigzag-pattern.ts          # Reusable zigzag SVG utility
│   ├── core/                           # Framework-agnostic core logic
│   │   ├── GenogramState.ts            # State management (no framework)
│   │   ├── HistoryManager.ts           # Undo/redo (50+ steps)
│   │   ├── LayoutEngine.ts            # Tree layout algorithm
│   │   ├── GenerationCalculator.ts    # Calculate generation levels
│   │   ├── PositionResolver.ts        # Resolve positions, avoid overlap
│   │   ├── SelectionManager.ts        # Track selected nodes/edges
│   │   ├── DragManager.ts             # Node dragging logic
│   │   └── ZoomPanManager.ts          # Zoom/pan state
│   ├── utils/
│   │   ├── json-schema.ts             # JSON schema validator
│   │   ├── export-png.ts              # SVG to Canvas to PNG export
│   │   ├── export-pdf.ts              # jsPDF based PDF export
│   │   ├── export-json.ts             # JSON export with validation
│   │   ├── import-json.ts             # JSON import with migration support
│   │   ├── id-generator.ts            # Unique ID generation
│   │   └── constants.ts               # Colors, sizes, symbol configs
│   └── global/
│       └── global.css                  # Minimal base styles
├── output-targets/                     # Auto-generated framework wrappers
│   ├── angular/                        # Angular wrapper (auto by Stencil)
│   ├── react/                          # React wrapper (auto by Stencil)
│   └── vue/                            # Vue wrapper (auto by Stencil)
├── demo/
│   ├── angular-demo/                   # Angular demo app
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── app.component.ts
│   │   │   │   ├── app.component.html
│   │   │   │   └── app.module.ts
│   │   │   └── main.ts
│   │   └── package.json
│   ├── react-demo/                     # React demo app
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   └── package.json
│   ├── vanilla-demo/                   # Plain HTML demo
│   │   └── index.html
│   └── sample-data/                    # Sample genogram JSON files
│       ├── three-generation-family.json
│       ├── complex-relationships.json
│       └── clinical-case-study.json
├── stencil.config.ts                   # Stencil build configuration
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
└── LICENSE
```

---

## STENCIL.JS CONFIGURATION

```typescript
// stencil.config.ts
import { Config } from '@stencil/core';
import { angularOutputTarget } from '@stencil/angular-output-target';
import { reactOutputTarget } from '@stencil/react-output-target';
import { vueOutputTarget } from '@stencil/vue-output-target';

export const config: Config = {
  namespace: 'clinical-genogram',
  outputTargets: [
    // Web Component distribution
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    // Custom Elements bundle (tree-shakeable)
    {
      type: 'dist-custom-elements',
      customElementsExportBehavior: 'auto-define-custom-elements',
      isPrimaryPackage: true,
    },
    // Angular wrapper
    angularOutputTarget({
      componentCorePackage: 'clinical-genogram',
      outputType: 'component',
      directivesProxyFile: './output-targets/angular/src/directives/proxies.ts',
      directivesArrayFile: './output-targets/angular/src/directives/index.ts',
    }),
    // React wrapper
    reactOutputTarget({
      componentCorePackage: 'clinical-genogram',
      proxiesFile: './output-targets/react/src/components/stencil-generated/index.ts',
    }),
    // Vue wrapper
    vueOutputTarget({
      componentCorePackage: 'clinical-genogram',
      proxiesFile: './output-targets/vue/src/components.ts',
    }),
    // Demo page
    {
      type: 'www',
      serviceWorker: null,
    },
  ],
  testing: {
    browserHeadless: 'new',
  },
};
```

---

## DATA MODEL / JSON SCHEMA

Design the core JSON structure that will be stored in the database and used for import/export:

```typescript
interface GenogramData {
  version: string;                    // Schema version for migrations e.g. "1.0.0"
  metadata: {
    title?: string;
    createdAt: string;                // ISO date
    updatedAt: string;
    createdBy?: string;
    proband?: string;                 // ID of the person the genogram focuses on
  };
  persons: Person[];
  relationships: Relationship[];
  layout?: LayoutData;                // Optional saved positions
}

interface Person {
  id: string;
  name?: string;
  gender: 'male' | 'female' | 'unknown';
  dateOfBirth?: string;
  dateOfDeath?: string;
  isAlive: boolean;
  age?: number;
  education?: string;
  occupation?: string;
  
  // Special types
  type: 'normal' | 'adopted' | 'foster' | 'pregnancy' | 'miscarriage' | 'abortion' | 'pet';
  
  // Twin info
  twinGroup?: string;
  twinType?: 'fraternal' | 'identical';
  
  // Clinical data
  conditions: ClinicalCondition[];
  isProband?: boolean;
  notes?: string;
  
  // Visual position
  position?: { x: number; y: number };
  generation?: number;
}

interface ClinicalCondition {
  type: 'neurodevelopmental' | 'handicap' | 'epilepsy' | 'psychiatric' | 
        'substance_use' | 'neurological' | 'early_death' | 
        'suicidal_attempt' | 'completed_suicide' | 'other';
  label?: string;
  details?: string;
}

interface Relationship {
  id: string;
  type: RelationshipType;
  from: string;                       // Person ID
  to: string;                         // Person ID
  children?: string[];                // Person IDs
  
  consanguinity?: {
    type: 'sisters_daughter' | 'mothers_brothers_daughter' | 
          'fathers_sisters_daughter' | 'fathers_brothers_daughter' | 'other';
    details?: string;
  };
}

type RelationshipType = 
  | 'marriage' | 'separation_in_fact' | 'legal_separation' | 'divorce'
  | 'engagement' | 'engagement_cohabitation' | 'engagement_separation'
  | 'legal_cohabitation' | 'legal_cohabitation_separation' | 'legal_cohabitation_official_separation'
  | 'cohabitation' | 'cohabitation_separation'
  | 'non_sentimental_cohabitation' | 'non_sentimental_cohabitation_separation'
  | 'casual_dating' | 'casual_separation'
  | 'committed_long_term' | 'temporary_relation' | 'love_affair'
  | 'nullity'
  | 'parent_child';

interface LayoutData {
  positions: Record<string, { x: number; y: number }>;
  zoom: number;
  panX: number;
  panY: number;
}
```

---

## SVG SYMBOL SPECIFICATIONS

Reference the uploaded images for exact visual specifications:

### Person Symbols (Image 1):
- **Male**: Square (40x40px default), stroke: black, fill: white
- **Female**: Circle (r=20px default), stroke: black, fill: white
- **Gender Unknown**: Diamond (rotated square) with "?" inside
- **Pet**: Diamond (rotated square), no "?"
- **Adopted child**: Same shape as gender but with dashed BLUE border (strokeDasharray)
- **Foster child**: Same shape as gender but with dotted GREEN border
- **Pregnancy**: Upward-pointing triangle, small, filled
- **Miscarriage**: Triangle with an X through it
- **Abortion**: Triangle with a horizontal line through it and X
- **Death**: Any symbol with a large X overlay drawn through it
- **Twins**: Two person nodes connected by a V-shape from a single parent line
- **Identical twins**: Same as twins but with a horizontal bar across the V-shape

### Relationship Lines (Image 2):
- All relationship lines connect two person symbols HORIZONTALLY
- **Marriage**: Solid black line
- **Separation in fact**: Solid line with 1 red zigzag break in center
- **Legal separation**: Solid line with 2 red zigzag breaks
- **Divorce**: Solid line with 3 red zigzag breaks
- **Engagement**: Dashed blue line (long dashes)
- **Engagement + cohabitation**: Dashed blue + solid segment
- **Engagement + separation**: Dashed blue + red zigzag
- **Legal cohabitation**: Dash-dot blue line
- **Legal cohabitation + separation**: Dash-dot blue + red zigzag
- **Legal cohabitation + official separation**: Dash-dot blue + double red zigzag
- **Cohabitation**: Short-dashed blue line
- **Cohabitation + separation**: Short-dashed blue + red zigzag
- **Non-sentimental cohabitation**: Short dashed blue with different pattern
- **Casual dating**: Dotted blue (short-term)
- **Casual + separation**: Dotted blue + red zigzag
- **Committed long-term**: Dash-dot-dot blue
- **Temporary / one night stand**: Dotted with different pattern
- **Love affair**: Dash-dot-dot RED line
- **Nullity**: Triple red zigzag on dashed line
- **Parent-to-child**: Vertical line from the horizontal relationship line down to child node

Each zigzag pattern should be a reusable SVG utility function. The number of zigzags indicates the severity of separation.

---

## COMPONENT API (Web Component / Custom Element)

The main component should be a standard HTML custom element:

```html
<!-- Plain HTML usage -->
<clinical-genogram
  data='{"version":"1.0.0","metadata":{},"persons":[],"relationships":[]}'
  read-only="false"
  width="1200"
  height="800"
  show-toolbar="true"
  show-legend="false"
  show-property-panel="true"
  max-generations="3"
  theme='{"backgroundColor":"#ffffff","nodeSize":40}'
></clinical-genogram>

<script>
  const genogram = document.querySelector('clinical-genogram');
  
  // Listen to events
  genogram.addEventListener('genogramChange', (e) => {
    console.log('Data changed:', e.detail);
    saveToDatabase(e.detail);
  });
  
  genogram.addEventListener('nodeClick', (e) => {
    console.log('Node clicked:', e.detail);
  });
  
  genogram.addEventListener('genogramExport', (e) => {
    console.log('Exported:', e.detail.format, e.detail.data);
  });
  
  // Programmatic methods
  genogram.exportAs('json');  // triggers genogramExport event
  genogram.exportAs('png');
  genogram.exportAs('pdf');
  genogram.undo();
  genogram.redo();
  genogram.fitToView();
  genogram.autoLayout();
</script>
```

```typescript
// Angular usage
// app.module.ts
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { ClinicalGenogramModule } from 'clinical-genogram-angular';

@NgModule({
  imports: [ClinicalGenogramModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {}

// app.component.html
<clinical-genogram
  [data]="genogramData"
  [showToolbar]="true"
  [showLegend]="false"
  (genogramChange)="onDataChange($event)"
  (nodeClick)="onNodeClick($event)"
  (genogramExport)="onExport($event)"
></clinical-genogram>
```

```tsx
// React usage
import { ClinicalGenogram } from 'clinical-genogram-react';

<ClinicalGenogram
  data={genogramData}
  showToolbar={true}
  showLegend={false}
  onGenogramChange={(e) => saveToDatabase(e.detail)}
  onNodeClick={(e) => console.log(e.detail)}
  onGenogramExport={(e) => handleExport(e.detail)}
/>
```

```vue
<!-- Vue usage -->
<template>
  <clinical-genogram
    :data="genogramData"
    :show-toolbar="true"
    :show-legend="false"
    @genogramChange="onDataChange"
    @nodeClick="onNodeClick"
    @genogramExport="onExport"
  />
</template>
```

---

## STENCIL COMPONENT DEFINITION

```tsx
// src/components/clinical-genogram/clinical-genogram.tsx
import { Component, Prop, Event, EventEmitter, Method, Watch, State, h } from '@stencil/core';
import { GenogramData, Person, Relationship } from '../../types';

@Component({
  tag: 'clinical-genogram',
  styleUrl: 'clinical-genogram.css',
  shadow: true,
})
export class ClinicalGenogramComponent {
  // Props
  @Prop() data: GenogramData | string;
  @Prop() readOnly: boolean = false;
  @Prop() width: number = 1200;
  @Prop() height: number = 800;
  @Prop() showToolbar: boolean = true;
  @Prop() showLegend: boolean = false;
  @Prop() showPropertyPanel: boolean = true;
  @Prop() maxGenerations: number = 3;
  @Prop() theme: object | string;

  // Internal state
  @State() internalData: GenogramData;
  @State() selectedNodeId: string | null;
  @State() selectedEdgeId: string | null;
  @State() zoom: number = 1;
  @State() panX: number = 0;
  @State() panY: number = 0;

  // Events
  @Event() genogramChange: EventEmitter<GenogramData>;
  @Event() nodeClick: EventEmitter<Person>;
  @Event() nodeDoubleClick: EventEmitter<Person>;
  @Event() relationshipClick: EventEmitter<Relationship>;
  @Event() genogramExport: EventEmitter<{ format: string; data: Blob | string }>;

  // Public methods
  @Method() async exportAs(format: 'json' | 'png' | 'pdf') { }
  @Method() async undo() { }
  @Method() async redo() { }
  @Method() async fitToView() { }
  @Method() async autoLayout() { }
  @Method() async getData(): Promise<GenogramData> { return this.internalData; }
  @Method() async setData(data: GenogramData) { }

  @Watch('data')
  dataChanged(newValue: GenogramData | string) { }

  render() {
    return (
      <div class="clinical-genogram-wrapper">
        {this.showToolbar && <genogram-toolbar />}
        <div class="genogram-main">
          <genogram-canvas />
          {this.showPropertyPanel && <genogram-property-panel />}
        </div>
        {this.showLegend && <genogram-legend />}
      </div>
    );
  }
}
```

---

## EXPORT FUNCTIONALITY

1. **JSON Export**: Serialize GenogramData to formatted JSON file. Include schema version for future migrations. Validate before export.

2. **PNG Export**: Convert SVG canvas to canvas element using a custom serializer (not html2canvas since we're in Shadow DOM). Render all symbols and lines. Support configurable resolution (1x, 2x, 3x).

3. **PDF Export**: Use jsPDF with the PNG pipeline. Add metadata (title, date, creator). Support A4/Letter page sizes. Include legend optionally. jsPDF should be a lazy-loaded optional dependency.

---

## PACKAGE.JSON

```json
{
  "name": "clinical-genogram",
  "version": "1.0.0",
  "description": "Interactive clinical genogram/family tree builder - works with Angular, React, Vue, and plain HTML",
  "main": "dist/index.cjs.js",
  "module": "dist/index.js",
  "es2017": "dist/esm/index.js",
  "types": "dist/types/index.d.ts",
  "collection": "dist/collection/collection-manifest.json",
  "collection:main": "dist/collection/index.js",
  "unpkg": "dist/clinical-genogram/clinical-genogram.esm.js",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs.js",
      "types": "./dist/index.d.ts"
    },
    "./loader": {
      "import": "./loader/index.js",
      "require": "./loader/index.cjs",
      "types": "./loader/index.d.ts"
    }
  },
  "files": [
    "dist/",
    "loader/"
  ],
  "keywords": [
    "genogram", "family-tree", "clinical", "pedigree", "medical",
    "web-component", "stencil", "angular", "react", "vue",
    "custom-element", "svg", "interactive"
  ],
  "peerDependencies": {},
  "optionalDependencies": {
    "jspdf": "^2.5.0"
  }
}
```

---

## FRAMEWORK WRAPPER PACKAGES

Also publish these wrapper packages:

```
clinical-genogram           → Core Web Component (works everywhere)
clinical-genogram-angular   → Angular-specific wrapper with type bindings
clinical-genogram-react     → React-specific wrapper with type bindings  
clinical-genogram-vue       → Vue-specific wrapper with type bindings
```

---

## KEY IMPLEMENTATION NOTES

1. All symbols must be pure SVG — no images, no external dependencies for symbols
2. Use Shadow DOM for style encapsulation — the component styles should not leak or be affected by host app styles
3. The canvas should support zoom (scroll wheel), pan (middle-click or space+drag), and fit-to-view
4. Undo/redo should track at least 50 steps
5. Auto-layout should arrange nodes by generation (grandparents top, parents middle, children bottom)
6. When a condition is tagged on a person, show a small colored indicator on their symbol
7. The JSON schema should be versioned so future updates can migrate old data
8. All interactions should work with mouse and touch
9. Props that accept objects (data, theme) should also accept JSON strings for plain HTML usage
10. The package should have ZERO required runtime dependencies
11. jsPDF should be optional and lazy-loaded only when PDF export is triggered
12. Use Stencil's built-in reactivity (@State, @Watch) instead of external state management
13. All public methods should be async and use @Method() decorator
14. Events should use @Event() with EventEmitter for cross-framework compatibility
15. Write JSDoc comments for all public APIs

---

## DEMO APPS

Create 3 demo apps:

### 1. Vanilla HTML Demo (`demo/vanilla-demo/index.html`)
- Single HTML file with CDN script tag
- Shows full working genogram with sample data
- All features accessible

### 2. Angular Demo (`demo/angular-demo/`)
- Angular 16+ app
- Uses `clinical-genogram-angular` wrapper
- Two-way data binding with Angular forms
- Save/load from a mock service

### 3. React Demo (`demo/react-demo/`)
- React 18+ app
- Uses `clinical-genogram-react` wrapper
- useState for data management
- Export buttons

All demos should include:
- A pre-loaded 3-generation family with various relationship types
- All symbol types visible
- Working toolbar
- Property panel editing
- Export buttons (JSON, PNG, PDF)
- Import JSON button
- Legend panel
- "Create Empty" button

---

## BUILD & PUBLISH

```bash
npm run build              # Build Stencil web components
npm run build.angular      # Build Angular wrapper
npm run build.react        # Build React wrapper
npm run build.vue          # Build Vue wrapper
npm run test               # Run all tests
npm run demo               # Run vanilla demo
npm run demo.angular       # Run Angular demo
npm run demo.react         # Run React demo
npm publish                # Publish core package
cd output-targets/angular && npm publish
cd output-targets/react && npm publish
cd output-targets/vue && npm publish
```
