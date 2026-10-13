# Changelog

## [Unreleased]

### Added
- **Siblings in age order:** brothers and sisters are drawn oldest on the left, from date of birth, age, or date of death and age at death. Entering an age re-sorts them (and re-lays out the tree); it applies to the board, the questionnaire, templates and loaded files. Children with no age keep their hand-set order; the Children list shows ages, oldest first, and greys out ↑/↓ between two children whose ages are known. `birthKey`/`sortByBirth` in `src/utils/birth-order.ts`, `GenogramState.canMoveChild`
- **Templates** menu in the top-right corner of the toolbar (next to Generate, which moved there too): patient & partner, patient & parents, patient with parents and both sets of grandparents, the patient's own family, and a standard 3-generation genogram, for a male or female patient. Role labels as names; replaces the board as one undo step. Public `loadTemplate(id, patientGender)` method; `GENOGRAM_TEMPLATES` and `buildTemplate` exported
- **Edit mode for the questionnaire:** with a tree on the board, Generate opens "Edit family history" filled in from the board (asking who the patient is when nobody is marked). Update genogram rebuilds the tree with the same person ids, keeps details the questionnaire doesn't show (dates, notes, condition colours, couple dates and notes, hand-set consanguinity), and keeps everyone the questionnaire can't hold (e.g. great-grandparents) exactly as they were. `intakeFromTree` and `mergeKept` are exported for programmatic use
- Questionnaire covers looped families: siblings' partners and children (nephews and nieces), half aunts and uncles ("Only the grandfather / grandmother"), and **"Already in the family?" on every partner card**, so an aunt can be linked to an uncle from the other side (double cousins) or a sister to her uncle. Links work whichever step the relative was entered in
- Editing families on the board: a Family section on the selected person (choose their parents, or + Parents / Brother / Sister / Partner / Son / Daughter), and a Children list on the selected couple (birth order, remove from couple, add). Each action is one undo step. `GenogramState` gains `addParents`, `addSibling`, `addPartner`, `addChild`, `setParents`, `removeChildFromCouple`, `moveChild` and `getPossibleParentCouples`
- Blood relationships on the board are worked out automatically whenever family links change, and marked as automatic (`Relationship.consanguinityAuto`). Values set by a person, or recorded in older data, are never overwritten
- Family-history questionnaire (`<genogram-intake-wizard>`, toolbar "Generate" button) that builds a full genogram with a live preview
- `KinshipBuilder` / `buildGenogramFromIntake()` turning questionnaire answers into persons and relationships, with placeholders, half-siblings, twins and consistent condition colours/quadrants
- Consanguinity in the questionnaire: "related by blood?" for the parents and every partner, an "Aunts, uncles & cousins" step, and linking a partner to a relative already entered (e.g. a cousin), so the family loop is drawn and the relationship is worked out from the tree
- Linking works in both orders: a partner entered first can be placed as an uncle's or aunt's child from the Aunts, uncles & cousins step (details carried over), with Unlink to undo
- `Relationship.consanguinityRelation` (first cousins, uncle–niece, …) with `deriveConsanguinity()`; consanguineous couples are drawn with an extra line and a label, and shown in the legend
- Condition icons inside the coloured quarters (heart, stroke, diabetes, cancer, mental health, lungs, alcohol, substance use; first letter otherwise), a `show-condition-icons` property, an optional `ClinicalCondition.icon`, and a Conditions section in the legend
- Grandchildren and great-grandchildren in the questionnaire (each child can have their own partners and children)
- `openIntake()` / `loadIntake()` methods and `intakeComplete` event
- `age`, `ageAtDeath` and `isPlaceholder` on `Person`; ages shown on symbols and editable in the person form
- `GenogramState.replaceData()` for undoable whole-tree replacement
- First spec tests (builder, layout, state)
- "Consanguinity" sample family (`demo/sample-data/consanguinity-family.json`, button on the dev and vanilla demo pages): five generations with uncle–niece, double first cousins, first cousins, first cousins once removed, second cousins, half first cousins and a suspected relationship

### Changed
- Side panel conditions: the box now suggests the conditions already on the tree plus the common list (same as the questionnaire). Picking one already on the tree reuses its colour and identity, so the legend shows it once; a new one gets an unused colour. Enter adds it
- Consanguinity sample: Simon Walsh (55) now listed before his younger sister Lucy (53)
- Toolbar: Templates and Generate sit together in the top-right corner. The Link mode hint ("Click two people on the board to link them") floats just below the toolbar, so it no longer pushes buttons onto a second line
- Questionnaire tabs say whose relatives they cover: a small "Patient's" (or the patient's first name once entered, e.g. "Andrew's") above Parents, Siblings, Grandparents, Partners & children, and Aunts, uncles & cousins
- Demo pages: the "Complex" sample button is removed (the sample file stays for the layout tests)
- **Five or more conditions:** the symbol is split into one equal slice per condition (with smaller icons) instead of hiding everything after the fourth. At most 6 slices are drawn; with 7 or more, the 6th is a grey "+N" slice (hover lists them). With four or fewer, a condition without a quarter now takes a free one instead of being hidden
- **Mouse wheel scrolls the board** (Shift + wheel sideways, two-finger trackpad in any direction); Ctrl/Cmd + wheel or a trackpad pinch zooms at the cursor. Zooming now stays anchored to the cursor even when the board is not at the top-left of the page
- Visual refresh of the tree: patient (proband) arrow, generation rows labelled I, II, III…, thinner slate-grey lines without the children-count badges, white symbols (gender by shape) with a soft shadow and solid condition colours, a thin deceased X kept inside the symbol, dashed grey placeholders, a selection halo, and tighter generation spacing (180 instead of 200), with the line to the children placed below the parents' labels
- **Breaking:** `Person.firstName` / `lastName` replaced by a single `fullName` (also in the questionnaire and person form). Older files are converted on load and import by joining the two parts. Long names wrap onto two lines inside the symbol
- Auto-layout rewritten to keep sibling groups contiguous and avoid crossing child lines; couples stay together and a person with several partners sits between them
- Lines from parents to children are easier to follow in complex trees: real branch points have dots, lines that cross without joining have a small hop, overlapping family lines are stacked further apart (widest on top), and hovering over or selecting a person highlights their family lines in blue while the rest fade
- The side panel records consanguinity as a plain-language relationship ("Related by blood?") instead of two duplicate degree pickers
- Unnamed persons no longer show an id fragment as their label
- Names and ages are drawn below the symbol instead of inside it, so they don't cover the condition quarters; fit-to-view includes the labels and no longer zooms small trees in past 150%

### Fixed
- In families with a couple from different generations (uncle–niece, first cousins once removed), a child could be drawn on the same row as a parent. The older partner is now drawn on the younger partner's row, and children always sit below both parents
- Conditions added in the person form had no quarter and were never drawn
- Disconnected families (e.g. an uncle not linked to the grandparents) were all placed on the proband's row

## [1.0.0] - 2025-01-01

### Added
- Initial release of clinical-genogram web component
- SVG-based rendering of genogram symbols (male, female, unknown, pet, pregnancy, miscarriage, abortion)
- Symbol overlays for deceased (X), adopted (dashed border), foster (dotted border)
- Condition indicators with colored quadrants (up to 4 per person)
- Twins and identical twins connectors
- 18 relationship line types: marriage, separation, legal separation, divorce, engagement, cohabitation (with variants), casual, committed, temporary, love affair, nullity, child
- Zigzag pattern rendering for separation/divorce indicators
- Central state management with subscriber pattern
- Undo/redo history (50-step limit) using structuredClone
- BFS-based generation calculator for automatic layout
- Position resolver with couple adjacency and child centering
- Layout engine orchestrator with incremental layout support
- Selection manager with mutual exclusion
- Drag manager for node repositioning
- Zoom/pan manager with screen-to-world coordinate conversion
- Person node component with click, double-click, and drag events
- Relationship edge component with transparent hit area
- SVG canvas component with zoom, pan, drag, and selection
- Person form for editing all person properties
- Relationship form for editing relationship type and details
- Illness tag selector for multi-select clinical conditions
- Consanguinity form with type picker
- Property panel routing between person and relationship forms
- Toolbar with add person/relationship, undo/redo, zoom, layout, and export controls
- Legend panel showing all symbol and line types
- Main orchestrator component (clinical-genogram) with Shadow DOM
- JSON export with runtime validation
- PNG export via SVG serialization and Canvas API
- PDF export with lazy jsPDF loading
- JSON import with version migration and validation
- Framework wrapper configuration for Angular, React, and Vue
- Vanilla HTML demo with sample data loading
- React demo application
- Three sample data sets: three-generation family, complex relationships, clinical case study
