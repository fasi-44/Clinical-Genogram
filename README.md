# clinical-genogram

Interactive clinical genogram/family tree web component built with [Stencil.js](https://stenciljs.com). Zero runtime dependencies. SVG-based rendering with full interactivity.

## Features

- **SVG-based rendering** - All symbols and relationship lines are pure SVG
- **Interactive editing** - Click, drag, zoom, pan, and double-click to edit
- **Clinical conditions** - Colored quadrant indicators for up to 4 conditions per person; with 5 or 6, the symbol is split into one slice per condition; with more, the 6th slice shows "+N"
- **20+ relationship types** - Marriage, divorce, separation, cohabitation, engagement, and more
- **Undo/redo** - 50-step history with `structuredClone()` snapshots
- **Family-history questionnaire** - Step-by-step intake (patient, parents, siblings, grandparents, aunts/uncles/cousins, partners, children and grandchildren) that builds the whole genogram, with a live preview
- **Siblings in age order** - Brothers and sisters are drawn oldest on the left, worked out from date of birth or age (or date of death and age at death), and re-sorted whenever an age is entered; siblings with no age keep the order set by hand
- **Templates** - One-click starting structures clinicians use most (patient & partner, patient & parents, three generations with both sets of grandparents, the patient's own family, a standard 3-generation genogram), labelled by role and ready to rename
- **Consanguinity** - Record partners who are blood relatives (e.g. first cousins), or link a partner to a cousin in the tree and the relationship is worked out automatically
- **Auto-layout** - BFS-based generation assignment with crossing-free positioning
- **Export/Import** - JSON, PNG, and PDF (optional jsPDF) export; JSON import with validation
- **Framework wrappers** - Angular, React, and Vue output targets
- **Zero runtime deps** - All SVG hand-rolled; jsPDF is optional/lazy-loaded

## Installation

```bash
npm install clinical-genogram
```

## Quick Start

### HTML / Vanilla JS

```html
<script type="module" src="https://unpkg.com/clinical-genogram/dist/clinical-genogram/clinical-genogram.esm.js"></script>

<clinical-genogram id="genogram" show-toolbar="true" show-legend="true"></clinical-genogram>

<script>
  const el = document.getElementById('genogram');
  el.setData({
    version: '1.0.0',
    persons: [
      { id: 'p1', fullName: 'John Smith', gender: 'male', type: 'standard', isDeceased: false, isProband: true, conditions: [] },
      { id: 'p2', fullName: 'Jane Smith', gender: 'female', type: 'standard', isDeceased: false, isProband: false, conditions: [] },
    ],
    relationships: [
      { id: 'r1', type: 'marriage', person1Id: 'p1', person2Id: 'p2', childrenIds: [], consanguinity: 'none' },
    ],
  });
</script>
```

### React

```tsx
import { defineCustomElements } from 'clinical-genogram/loader';

defineCustomElements();

function App() {
  const ref = useRef<any>(null);

  useEffect(() => {
    ref.current?.setData({ version: '1.0.0', persons: [...], relationships: [...] });
  }, []);

  return <clinical-genogram ref={ref} show-toolbar={true} />;
}
```

### Angular

```typescript
// app.module.ts
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}

// main.ts
import { defineCustomElements } from 'clinical-genogram/loader';
defineCustomElements();
```

```html
<!-- app.component.html -->
<clinical-genogram #genogram [attr.show-toolbar]="true"></clinical-genogram>
```

### Vue

```typescript
// main.ts
import { defineCustomElements } from 'clinical-genogram/loader';
defineCustomElements();
```

```vue
<template>
  <clinical-genogram ref="genogram" show-toolbar="true" />
</template>
```

## API Reference

### Properties

| Property           | Type                          | Default | Description                              |
|--------------------|-------------------------------|---------|------------------------------------------|
| `data`             | `GenogramData \| string`      | —       | Initial data (object or JSON string)     |
| `conditions`       | `ClinicalCondition[]`         | `[]`    | Available clinical conditions            |
| `show-toolbar`     | `boolean`                     | `true`  | Show the toolbar                         |
| `show-legend`      | `boolean`                     | `true`  | Show the legend panel                    |
| `show-property-panel` | `boolean`                  | `true`  | Show the property editing panel          |
| `show-condition-icons` | `boolean`                 | `true`  | Draw each condition's icon (or first letter) inside its coloured quarter |

### Methods

| Method        | Signature                               | Description                        |
|---------------|-----------------------------------------|------------------------------------|
| `getData()`   | `() => Promise<GenogramData>`           | Get current genogram data          |
| `setData()`   | `(data: GenogramData) => Promise<void>` | Replace genogram data              |
| `undo()`      | `() => Promise<void>`                   | Undo last action                   |
| `redo()`      | `() => Promise<void>`                   | Redo last undone action            |
| `fitToView()` | `() => Promise<void>`                   | Fit genogram to viewport           |
| `autoLayout()`| `() => Promise<void>`                   | Recalculate automatic layout       |
| `exportAs()`  | `(format: 'json'\|'png'\|'pdf') => Promise<any>` | Export in specified format |
| `openIntake()` | `() => Promise<void>`                  | Open the family-history questionnaire. With a tree on the board it opens in edit mode, filled in from the board |
| `loadTemplate()` | `(id: string, patientGender?: Gender) => Promise<GenogramData>` | Replace the board with a template from `GENOGRAM_TEMPLATES` (`couple`, `parents`, `grandparents`, `own-family`, `three-generations`); one Undo restores the previous tree |
| `loadIntake()` | `(intake: IntakeForm) => Promise<GenogramData>` | Build a genogram from questionnaire answers and load it (replaces the current tree; one Undo restores it) |

### Events

| Event               | Detail Type      | Description                    |
|---------------------|------------------|--------------------------------|
| `genogramChange`    | `GenogramData`   | Emitted on any data change     |
| `nodeClick`         | `Person`         | Person node clicked            |
| `nodeDoubleClick`   | `Person`         | Person node double-clicked     |
| `relationshipClick` | `Relationship`   | Relationship line clicked      |
| `genogramExport`    | `{ format, data }` | Export completed              |
| `intakeComplete`    | `{ intake, data }` | Questionnaire turned into the current genogram |

## Data Model

### GenogramData

```typescript
interface GenogramData {
  version: string;
  persons: Person[];
  relationships: Relationship[];
  metadata?: { title?: string; createdAt?: string; author?: string };
}
```

### Person

```typescript
interface Person {
  id: string;
  fullName?: string;     // files using firstName/lastName are converted on load
  gender: 'male' | 'female' | 'unknown';
  type: 'standard' | 'adopted' | 'foster' | 'pregnancy' | 'miscarriage' | 'abortion' | 'stillbirth' | 'pet';
  dateOfBirth?: string;
  dateOfDeath?: string;
  age?: number;          // used when the date of birth is unknown
  ageAtDeath?: number;   // used when the date of death is unknown
  isDeceased: boolean;
  isProband: boolean;
  isPlaceholder?: boolean; // structural stand-in (e.g. unknown grandparent)
  conditions: ClinicalCondition[];
  notes?: string;
}
```

### Relationship

```typescript
interface Relationship {
  id: string;
  type: RelationshipType; // 'marriage' | 'divorce' | 'separation' | ... (18 types)
  person1Id: string;
  person2Id: string;
  childrenIds: string[];
  consanguinity: 'none' | 'first-degree' | 'second-degree' | 'third-degree' | 'distant';
  // plain-language relation; drawn as an extra line and a label such as "1st cousins"
  consanguinityRelation?: 'first-cousins' | 'first-cousins-once-removed' | 'second-cousins'
    | 'uncle-niece' | 'aunt-nephew' | 'other' | 'unknown';
}
```

### ClinicalCondition

```typescript
interface ClinicalCondition {
  id: string;
  name: string;
  color: string;
  quadrant?: 1 | 2 | 3 | 4;
  // icon drawn in the quarter; picked from the name when omitted (first letter if nothing matches)
  icon?: 'heart' | 'drop' | 'ribbon' | 'mind' | 'lungs' | 'glass' | 'pill' | 'bolt';
}
```

## Templates

The toolbar's **Templates** menu loads a common family structure in one click. Choose whether the patient is male or female at the top of the menu (the partner becomes the wife or husband), then pick a template:

| Template | People |
|---|---|
| Patient & partner | Patient, wife / husband |
| Patient & parents | Patient, father, mother |
| Patient, parents & grandparents | Patient, father, mother, both sets of grandparents |
| Patient's own family | Patient, wife / husband, a son and a daughter |
| Standard 3-generation | Grandparents, parents, patient, siblings, wife / husband and children |

Everyone is named after their role ("Father", "Paternal grandmother", ...), so rename them on the board or open **Generate** to fill in the details. Loading a template replaces the current tree; Undo brings it back. From code:

```javascript
await el.loadTemplate('grandparents', 'female');
```

`GENOGRAM_TEMPLATES` and `buildTemplate(id, patientGender)` are exported for use without the component.

## Building from a Questionnaire

Click **Generate** in the toolbar, or skip the UI and pass answers directly. Every relative is described relative to the patient; missing structural relatives (e.g. the other grandparent on a side) are added as placeholders, drawn as `?`.

```javascript
await el.loadIntake({
  patient: { fullName: 'Sarah Johnson', gender: 'female', age: 34, conditions: ['Anxiety'] },
  father: { fullName: 'John Johnson', status: 'deceased', ageAtDeath: 58, causeOfDeath: 'Heart attack' },
  mother: { fullName: 'Mary Johnson', age: 60, conditions: ['Type 2 diabetes'] },
  siblings: [{ fullName: 'Mike Johnson', gender: 'male', age: 38, parentage: 'both' }],
  partners: [{
    fullName: 'David Brown',
    relationshipType: 'marriage',
    children: [{
      fullName: 'Emma Brown', gender: 'female', age: 30,
      // a child's own partners and children give grandchildren (nest again for great-grandchildren)
      partners: [{ unknown: true, children: [{ fullName: 'Leo Brown', gender: 'male', age: 4 }] }],
    }],
  }],
  grandparents: { maternalGrandmother: { conditions: ['Breast cancer'] } },
});
```

Other questionnaire fields:

- `parentsConsanguinity` and each partner's `consanguinity`: whether they are related by blood (`'none'`, `'first-cousins'`, `'second-cousins'`, `'uncle-niece'`, …).
- `paternalAuntsUncles` / `maternalAuntsUncles`: the parents' siblings, built like children, so their `partners[].children` are the patient's cousins. `parentage: 'father' | 'mother'` makes one a half aunt or uncle (shares only the grandfather or grandmother).
- `siblings[].partners`: siblings' partners and their children (nephews and nieces).
- `linkedRelativeKey` on **any** partner: the `key` of a relative entered anywhere in the form (for example a cousin, or an uncle from the other side). The partner is that same person, so the family loop is drawn, and the blood relationship is worked out from the tree, which overrides any manual answer.

```javascript
await el.loadIntake({
  patient: { fullName: 'Ali Hassan', gender: 'male' },
  father: { fullName: 'Karim Hassan' },
  mother: { fullName: 'Layla Hassan' },
  paternalAuntsUncles: [{
    fullName: 'Omar Hassan', gender: 'male',
    partners: [{ fullName: 'Huda Hassan', children: [{ key: 'sara', fullName: 'Sara Hassan', gender: 'female' }] }],
  }],
  partners: [{ linkedRelativeKey: 'sara' }], // Ali married his first cousin Sara
});
```

Condition names are matched case-insensitively against the `conditions` property (reusing their colour); new names get a colour from a built-in palette. The same builder is exported for use without the component: `import { buildGenogramFromIntake } from 'clinical-genogram'`.

## Keyboard & Mouse Controls

| Action                     | Input                           |
|----------------------------|---------------------------------|
| Select node/edge           | Left-click                      |
| Deselect                   | Click background                |
| Drag node                  | Left-click + drag on node       |
| Pan canvas                 | Middle-click + drag / Space + drag |
| Scroll canvas              | Mouse wheel / two-finger trackpad (Shift + wheel: sideways) |
| Zoom                       | Ctrl/Cmd + mouse wheel, trackpad pinch |
| Pinch zoom                 | Two-finger pinch (touch)        |
| Edit node                  | Double-click                    |

## PDF Export

PDF export requires `jspdf` as an optional dependency:

```bash
npm install jspdf
```

If not installed, calling `exportAs('pdf')` will throw a descriptive error.

## Development

```bash
npm install
npm start        # Dev server with watch
npm run build    # Production build
npm test         # Run tests
```

## License

MIT
"# Clinical-Genogram" 
