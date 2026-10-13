# Clinical Genogram -- User Manual

**Version 1.0**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Interface Overview](#3-interface-overview)
4. [Working with Persons](#4-working-with-persons)
5. [Working with Relationships](#5-working-with-relationships)
6. [Clinical Conditions](#6-clinical-conditions)
7. [Consanguinity](#7-consanguinity)
8. [Symbol Reference](#8-symbol-reference)
9. [Navigation and Canvas Controls](#9-navigation-and-canvas-controls)
10. [Export and Import](#10-export-and-import)
11. [Undo and Redo](#11-undo-and-redo)
12. [Keyboard and Mouse Reference](#12-keyboard-and-mouse-reference)
13. [Tips and Best Practices](#13-tips-and-best-practices)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Introduction

### What Is a Clinical Genogram?

A clinical genogram is a structured diagram that maps out a family's medical and relational history across multiple generations. Unlike a simple family tree, a genogram uses standardized symbols to encode rich clinical information -- gender, health conditions, types of relationships, adoptions, pregnancies, deaths, and more. Genograms are a foundational tool in clinical practice for identifying hereditary patterns of illness, understanding family dynamics, and supporting diagnostic reasoning.

### What This Tool Does

The **Clinical Genogram** web component provides an interactive, browser-based editor for creating, editing, and exporting clinical genograms. All rendering is done with pure SVG graphics, meaning the diagrams are crisp at any zoom level and export cleanly to images and documents. The editor supports:

- Adding and editing family members with detailed demographic and clinical data
- Drawing over 18 types of relationships between individuals
- Annotating persons with clinical conditions displayed as colored quadrant indicators (or one slice per condition when there are more than four)
- Recording consanguinity (blood-relatedness) levels on relationships
- Automatic layout of the genogram across generations
- Full undo/redo history (up to 50 steps)
- Exporting to JSON, PNG, and PDF formats
- Importing previously saved genograms from JSON files

### Who Is This Tool For?

This tool is designed for:

- **Clinicians and physicians** documenting family medical histories
- **Therapists and counselors** mapping family dynamics and relational patterns
- **Genetic counselors** tracing hereditary conditions across generations
- **Researchers** building structured family health datasets
- **Social workers** documenting family structures in case files
- **Students** learning family systems theory and clinical assessment

No programming or technical knowledge is required to use the tool. This manual will guide you through every feature using plain, step-by-step instructions.

---

## 2. Getting Started

### Accessing the Tool

The Clinical Genogram component runs in any modern web browser (Chrome, Firefox, Safari, Edge). Depending on how your organization has deployed it, you may access it by:

- Navigating to a web page that embeds the component
- Opening a standalone application that uses the component
- Loading it within an electronic health record (EHR) system or other clinical platform

When the component loads, you will see an empty workspace ready for you to begin building a genogram.

### Overview of the Interface Layout

The interface is divided into four main areas:

```
+---------------------------------------------------------------+
|  TOOLBAR (top)                                                |
|  [Add Male] [Add Female] [Add Unknown] | [Link]              |
|  | [Undo] [Redo] | [+] 100% [-] [Fit] | [Layout] [JSON]     |
|  [PNG] [Import]                                               |
+---------------------------------------------------------------+
|                                          |                    |
|                                          |  PROPERTY PANEL    |
|           CANVAS (center)                |  (right sidebar)   |
|                                          |                    |
|   The main drawing area where your       |  Shows form fields |
|   genogram is displayed. You can         |  when a person or  |
|   click, drag, zoom, and pan here.       |  relationship is   |
|                                          |  selected.         |
|                                          |                    |
|                                          |                    |
| +------------------+                     |                    |
| |  LEGEND          |                     |                    |
| |  (bottom-left)   |                     |                    |
| +------------------+                     |                    |
+---------------------------------------------------------------+
```

- **Toolbar** -- The horizontal bar across the top with buttons for adding persons, creating links, undo/redo, zoom controls, layout, export, and import.
- **Canvas** -- The large central area where the genogram diagram is rendered. This is where you interact with person nodes and relationship lines.
- **Property Panel** -- The right sidebar that displays an editing form when you select a person or relationship. When nothing is selected, it shows a prompt to select something.
- **Legend** -- A floating panel in the bottom-left corner that shows the meaning of each symbol and line type used in the genogram.

---

## 3. Interface Overview

### 3.1 Toolbar

The toolbar runs across the top of the component and is organized into several button groups separated by vertical dividers.

#### Templates

Click **Templates** (in the top-right corner of the toolbar, next to **Generate**) to start from a common family structure instead of an empty board:

1. At the top of the menu, choose whether the patient is **Male** or **Female**. The patient's partner becomes the wife or husband to match.
2. Pick a template:

| Template | People on the board |
|---|---|
| **Patient & partner** | Patient and wife / husband |
| **Patient & parents** | Patient, father and mother |
| **Patient, parents & grandparents** | Three generations: patient, father, mother, and both sets of grandparents |
| **Patient's own family** | Patient, wife / husband, a son and a daughter |
| **Standard 3-generation** | Grandparents, parents, patient, siblings, wife / husband and children |

Everyone is named after their role ("Father", "Paternal grandmother"…), so you can see at once who is who. Click a person to rename them and add details, use **+ Brother**, **+ Son** and the other Family buttons to add more relatives, or click **Generate** to fill in the whole family through the questionnaire.

If the board already has a tree, the template replaces it (the menu says so). Press **Undo** to bring the previous tree back. Press **Esc** or click anywhere outside the menu to close it without choosing.

#### Add Person Group

| Button | Icon | Description |
|--------|------|-------------|
| **Add Male** | Small square icon (light blue fill) | Adds a new male person to the center of the canvas |
| **Add Female** | Small circle icon (light pink fill) | Adds a new female person to the center of the canvas |
| **Add Unknown** | Small diamond icon (light gray fill) | Adds a new person of unknown gender to the center of the canvas |

When you click any of these buttons, a new person node immediately appears at the center of your current view and becomes selected so you can edit its properties in the right panel.

#### Link Group

| Button | Icon | Description |
|--------|------|-------------|
| **Link** | Horizontal line icon with "Link" label | Creates a new relationship between persons |

Clicking the Link button creates a new relationship (defaulting to the Marriage type). You can then select the relationship to change its type and properties.

#### Undo/Redo Group

| Button | Description |
|--------|-------------|
| **Undo** | Reverses the last action. Disabled (grayed out) when there is nothing to undo. |
| **Redo** | Re-applies the last undone action. Disabled when there is nothing to redo. |

#### Zoom Controls Group

| Button | Description |
|--------|-------------|
| **+** (Plus) | Zooms in by one step (increases magnification) |
| **100%** (Zoom level display) | Shows the current zoom percentage (read-only) |
| **-** (Minus) | Zooms out by one step (decreases magnification) |
| **Fit** | Automatically adjusts zoom and pan so the entire genogram fits within the visible canvas area |

The zoom range is from 10% to 300%.

#### Layout and Export Group

| Button | Description |
|--------|-------------|
| **Layout** | Runs the automatic layout algorithm to reposition all persons and relationships into a clean, generational arrangement |
| **JSON** | Exports the current genogram data as a `.json` file (triggers a browser download) |
| **PNG** | Exports the current genogram as a high-resolution `.png` image file (triggers a browser download) |
| **Import** | Opens a file picker dialog to load a previously saved `.json` genogram file |

### 3.2 Canvas

The canvas is the large central area of the component. It is an SVG-based drawing surface where:

- **Person nodes** are displayed as genogram symbols (squares, circles, diamonds, triangles, etc.)
- **Relationship lines** connect persons with various line styles indicating the relationship type
- **Child connector lines** drop vertically from the midpoint of a parental relationship down to child nodes

The canvas supports panning (scrolling around), zooming (magnifying or shrinking), and direct interaction with nodes and lines. See [Section 9: Navigation and Canvas Controls](#9-navigation-and-canvas-controls) for full details.

### 3.3 Property Panel

The property panel is the sidebar on the right side of the component. Its contents change based on what you have selected:

- **Nothing selected** -- Displays the message: "Select a person or relationship to edit properties."
- **Person selected** -- Displays the Person Properties form with fields for name, gender, type, dates, deceased status, proband status, notes, clinical conditions, and action buttons (Save, Delete Person).
- **Relationship selected** -- Displays the Relationship Properties form with fields for relationship type, start/end dates, notes, and action buttons (Save, Delete Relationship).

### 3.4 Legend

The legend is a floating panel positioned in the bottom-left corner of the canvas. It contains three sections:

- **Symbols** -- Shows the visual representation of each person symbol type (Male, Female, Unknown, Pregnancy, Miscarriage, Abortion) with labels.
- **Relationships** -- Shows the line style for the most common relationship types (Marriage, Separation, Divorce, Engagement, Cohabitation, Love Affair) with labels.
- **Overlays** -- Shows indicators for Deceased (X mark), Adopted (dashed blue border), and Foster (dotted green border).

The legend is visible by default but can be hidden through the component's configuration.

---

## 4. Working with Persons

### 4.1 Adding a New Person

To add a new person to the genogram:

1. Locate the **Add Person** button group in the toolbar (far left).
2. Click the appropriate button:
   - **Square icon** -- Adds a male
   - **Circle icon** -- Adds a female
   - **Diamond icon** -- Adds a person of unknown gender
3. The new person appears at the center of your current canvas view.
4. The person is automatically selected, and the Property Panel on the right displays the editing form.

### 4.2 Selecting a Person

To select a person:

1. **Left-click** on the person's symbol (square, circle, diamond, or other shape) on the canvas.
2. The selected person is highlighted with a blue selection indicator.
3. The Property Panel on the right updates to show that person's editable properties.

To deselect, click on any empty area of the canvas background.

### 4.3 Editing Person Properties

When a person is selected, the Property Panel displays the **Person Properties** form with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| **Full Name** | Text input | The person's full name (long names wrap onto two lines inside the symbol) |
| **Gender** | Dropdown | Choose from: **Male**, **Female**, or **Unknown**. Changing the gender also changes the symbol displayed on the canvas. |
| **Type** | Dropdown | The person's classification. See the table below for all options. |
| **Date of Birth** | Date picker | The person's date of birth |
| **Date of Death** | Date picker | The person's date of death (typically used together with the Deceased checkbox) |
| **Deceased** | Checkbox | When checked, an X is drawn through the person's symbol to indicate they are deceased |
| **Proband** | Checkbox | When checked, designates this person as the proband -- the primary subject or index case of the genogram |
| **Notes** | Text area | Free-form notes about the person (medical history, observations, etc.) |

#### Person Type Options

| Type | Description | Symbol Effect |
|------|-------------|---------------|
| **Standard** | A regular family member | Uses the normal gender symbol (square/circle/diamond) |
| **Adopted** | An adopted family member | Adds a dashed blue border around the gender symbol |
| **Foster** | A foster family member | Adds a dotted green border around the gender symbol |
| **Pregnancy** | A current pregnancy | Displays as a small triangle |
| **Miscarriage** | A pregnancy that ended in miscarriage | Displays as a small triangle with an X through it |
| **Abortion** | A pregnancy that ended in abortion | Displays as a small triangle with a line and X |
| **Stillbirth** | A pregnancy that ended in stillbirth | Uses the gender symbol with a deceased X overlay |
| **Pet** | A family pet | Displays as a small diamond |

### 4.3a Editing the Family Around a Person

The **Family** section at the top of the Property Panel changes how the selected person is connected:

- **Parents:** choose which couple on the tree are this person's parents. This moves them if they already had parents, or attaches someone who was on the board without parents. Choose *No parents on the tree* to detach them. Couples that would make someone their own ancestor are not offered.
- **+ Parents** (only when the person has none), **+ Brother**, **+ Sister**, **+ Partner**, **+ Son**, **+ Daughter:** add the relative already linked in the right place. New parents start as unknown placeholders (`?`) until you name them. A brother or sister without parents on the tree gets placeholder parents. A son or daughter of a single person gets a placeholder other parent.

Each action is one step for Undo, and the tree is laid out again afterwards (positions you dragged by hand are reset).

### 4.4 Saving Changes

After making changes to a person's properties:

1. Click the **Save** button at the bottom of the Person Properties form.
2. The button is only active (clickable) when you have made unsaved changes. If no changes have been made, the Save button is disabled.
3. Once saved, the canvas immediately updates to reflect the changes.

**Important:** Changes are not applied to the genogram until you click Save. If you select a different person or click elsewhere before saving, your unsaved edits will be discarded.

### 4.5 Deleting a Person

To remove a person from the genogram:

1. Select the person by clicking on their symbol.
2. In the Property Panel, click the **Delete Person** button.
3. The person is immediately removed from the genogram, along with any relationships that reference them.

This action is recorded in the undo history, so you can reverse it by clicking Undo.

### 4.6 Moving a Person on the Canvas

To reposition a person on the canvas:

1. **Left-click and hold** on the person's symbol.
2. While holding the mouse button, **drag** the symbol to the desired position.
3. Release the mouse button to drop the person in the new location.

Connected relationship lines will automatically follow the person to their new position.

---

## 5. Working with Relationships

### 5.1 Adding a Relationship

To create a relationship between two persons:

1. Ensure you have at least two persons on the canvas.
2. Click the **Link** button in the toolbar.
3. A new relationship line appears, defaulting to the Marriage type.
4. The new relationship is automatically selected so you can change its type and properties in the Property Panel.

### 5.2 Selecting a Relationship

To select a relationship:

1. **Left-click** on or near the relationship line connecting two persons on the canvas.
2. The selected relationship line is highlighted.
3. The Property Panel on the right updates to show the **Relationship Properties** form.

To deselect, click on any empty area of the canvas background.

### 5.3 Editing Relationship Properties

When a relationship is selected, the Property Panel displays the following fields:

| Field | Type | Description |
|-------|------|-------------|
| **Type** | Dropdown | The kind of relationship. See the full reference table below. |
| **Start Date** | Date picker | When the relationship began (e.g., marriage date) |
| **End Date** | Date picker | When the relationship ended (e.g., divorce date) |
| **Notes** | Text area | Free-form notes about the relationship |

### 5.3a A Couple's Children

When a couple is selected, the **Children** list at the top of the Property Panel shows their children in birth order, oldest first, with each one's age:

- **Siblings are placed by age automatically.** As soon as you enter an age or a date of birth (and click **Save**), the person moves to their place among their brothers and sisters, oldest on the left, following standard genogram convention. This works the same for people added with **+ Son**, **+ Brother** and the other buttons, for families built with **Generate**, and for **Templates** once you fill in ages. For someone who has died, the date of death and age at death are used.
- **↑ / ↓** set the order by hand for children whose age isn't known. They are greyed out between two children whose ages are both known, because age decides their order ("Placed by age").
- **×** removes the child from this couple. The person stays on the board, without parents.
- **+ Son / + Daughter** add a new child to this couple.

To add someone who is already on the board as a child, select that person and choose this couple under **Parents**.

**Blood relationships are kept up to date automatically:** when the links change so that two partners share an ancestor (for example, two cousins are linked as a couple), the couple is marked and labelled ("1st cousins", "Uncle–niece", …). If the shared ancestry goes away, the automatic label is removed. A relationship you set yourself under *Related by blood?* is never changed automatically.

### 5.4 Saving Changes

After editing relationship properties:

1. Click the **Save** button at the bottom of the Relationship Properties form.
2. The button is active only when unsaved changes exist.
3. The canvas updates immediately to reflect the new relationship type, line style, or other changes.

### 5.5 Deleting a Relationship

To remove a relationship:

1. Select the relationship by clicking on its line.
2. In the Property Panel, click the **Delete Relationship** button.
3. The relationship line is immediately removed from the canvas.

This action is recorded in the undo history and can be reversed with Undo.

### 5.6 Relationship Types Reference

The tool supports 18 relationship types. Each type is drawn with a distinct line style and color to make the genogram easy to read at a glance.

#### Partner/Couple Relationships

| Type | Line Style | Color | Description |
|------|-----------|-------|-------------|
| **Marriage** | Solid double line | Dark gray (#333) | A legal marriage between two persons |
| **Separation** | Solid line with 1 zigzag slash | Orange (#FF9800) | A married couple that has informally separated |
| **Legal Separation** | Solid line with 2 zigzag slashes | Orange (#FF9800) | A married couple with a legal separation agreement |
| **Divorce** | Solid line with 3 zigzag slashes | Red (#F44336) | A legally dissolved marriage |
| **Engagement** | Dashed line | Blue (#2196F3) | A couple that is engaged to be married |
| **Cohabitation** | Double solid line | Purple (#9C27B0) | An unmarried couple living together |
| **Cohabitation Separation** | Double line with 1 zigzag | Purple (#9C27B0) | A cohabiting couple that has separated |
| **Cohabitation Legal Separation** | Double line with 2 zigzags | Purple (#9C27B0) | A cohabiting couple with legal separation |
| **Cohabitation Divorce** | Double line with 3 zigzags | Purple (#9C27B0) | A formerly cohabiting couple, fully separated |
| **Casual** | Dashed line | Blue-gray (#607D8B) | A casual or informal relationship |
| **Casual Separation** | Dashed line with zigzag | Blue-gray (#607D8B) | A former casual relationship |
| **Committed** | Solid line | Indigo (#3F51B5) | A committed but non-marital partnership |
| **Committed Separation** | Solid line with zigzag | Indigo (#3F51B5) | A former committed partnership |
| **Temporary** | Dotted line | Brown (#795548) | A short-term or temporary relationship |
| **Temporary Separation** | Dotted line with zigzag | Brown (#795548) | A former temporary relationship |
| **Love Affair** | Dash-dot-dot line | Pink/Red (#E91E63) | An extramarital or secret romantic relationship |
| **Nullity** | Dashed gray line with 3 zigzag slashes | Gray (#9E9E9E) | A marriage annulment (declared legally invalid) |

#### Parent-Child Relationship

| Type | Line Style | Color | Description |
|------|-----------|-------|-------------|
| **Child** | Solid vertical line | Dark gray (#333) | A parent-to-child connection, drawn as a vertical drop line from the parental relationship midpoint down to the child |

#### Understanding Zigzag Marks

Zigzag marks (sometimes called "slash marks") on relationship lines indicate the degree of separation:

- **1 zigzag** = Informal separation
- **2 zigzags** = Legal separation
- **3 zigzags** = Divorce or full dissolution

---

## 6. Clinical Conditions

### 6.1 What Are Condition Indicators?

Clinical conditions are represented visually as **colored quadrant fills** inside a person's symbol. Each person can display up to four conditions simultaneously, with each condition occupying one quadrant of the symbol.

The quadrant layout follows standard genogram convention:

```
+----------+----------+
| Quadrant | Quadrant |
|    1     |    2     |
|(top-left)|(top-right)|
+----------+----------+
| Quadrant | Quadrant |
|    3     |    4     |
|(bot-left)|(bot-right)|
+----------+----------+
```

For female persons (circles), the quadrants are clipped to the circular shape. For male persons (squares), the quadrants fill rectangular quarters.

**Five or more conditions:** there are only four quarters, so the symbol is split into equal slices instead, one per condition, like a pie. The conditions that had a quarter come first, clockwise from the top-left, followed by the others in the order they were added. Icons get smaller as the slices get narrower. At most **six slices** are drawn: with seven or more conditions, the first five get a slice and the sixth is a grey **+N** slice (hover over it to see which conditions it stands for). Removing conditions back down to four restores the quarters. Each condition is rendered as a semi-transparent color fill in its assigned quadrant.

Each coloured quarter also carries a small icon, so conditions can be told apart without the legend and in black-and-white print. The icon is chosen from the condition's name:

| Icon | Used for (examples) |
|------|---------------------|
| Heart | Heart disease, heart attack (MI), hypertension, arrhythmia |
| Lightning bolt | Stroke, TIA |
| Drop | Diabetes |
| Ribbon | Any cancer, leukaemia, lymphoma |
| Brain | Anxiety, depression, bipolar disorder, schizophrenia, dementia, epilepsy |
| Lungs | Asthma, COPD, other lung conditions |
| Glass | Alcohol misuse |
| Pill | Substance misuse |

A condition that matches none of these shows its first letter instead (for example "M" for Migraine). The legend's **Conditions** section lists every condition on the tree with its colour and icon. Names and ages are shown below each symbol so they never cover the quarters.

### 6.2 Adding Conditions to a Person

To add clinical conditions to a person:

1. Select the person by clicking on their symbol on the canvas.
2. In the Property Panel, scroll down to the **Clinical Conditions** section (located below the main person form).
3. You have two options:
   - **Add an existing condition**: If pre-defined conditions are available, click the **"Add Existing Condition"** button. A dropdown list appears showing all available conditions not yet assigned to this person. Click a condition to add it.
   - **Create a new condition**: Use the **"Create New"** section at the bottom. Enter a condition name in the text field, pick a color using the color picker, and click **Add**.

### 6.3 Removing Conditions

To remove a condition from a person:

1. Select the person.
2. In the Clinical Conditions section, locate the colored tag for the condition you want to remove.
3. Click the **X** button on the right side of the condition tag.

The condition is immediately removed from that person.

### 6.4 Understanding Condition Colors

Each condition has an associated color. When displayed in a person's symbol, the color fills the assigned quadrant with 70% opacity, allowing the base symbol to remain visible underneath. Choose distinct, easily distinguishable colors for different conditions to maintain readability.

**Example color assignments:**

| Condition | Suggested Color | Quadrant |
|-----------|----------------|----------|
| Diabetes | Blue (#2196F3) | 1 (top-left) |
| Heart Disease | Red (#F44336) | 2 (top-right) |
| Cancer | Green (#4CAF50) | 3 (bottom-left) |
| Depression | Purple (#9C27B0) | 4 (bottom-right) |

---

## 7. Consanguinity

### 7.1 What Is Consanguinity?

Consanguinity refers to a blood relationship between two persons who share a common ancestor. In clinical genetics, consanguineous relationships are significant because they increase the probability that offspring will inherit copies of recessive alleles from both parents, raising the risk of certain genetic conditions.

Recording consanguinity on a genogram helps clinicians assess genetic risk factors in a family.

### 7.2 Recording How Partners Are Related

Consanguinity is recorded on a couple as the relationship clinicians actually report:

| Option | Meaning | Genetic degree stored |
|--------|---------|-----------------------|
| **Not related** | No known blood relationship | none |
| **First cousins** | Share a set of grandparents | 3rd degree |
| **Second cousins** | Share a set of great-grandparents | distant |
| **First cousins once removed** | One is the child of the other's first cousin | distant |
| **Uncle and niece** / **Aunt and nephew** | One is a sibling of the other's parent | 2nd degree |
| **Other blood relatives** | Related, but more distantly | distant |
| **Possibly related** | Suspected but not confirmed | none (drawn dashed) |

On the canvas, a consanguineous couple has an extra amber line under the couple line, and a label such as "1st cousins" above the couple. "Possibly related" is drawn with a dashed line and the label "Related?".

### 7.3 Setting Consanguinity

**From the questionnaire (Generate):**

- On the **Parents** step, answer *Are the parents related by blood?*
- On the **Partners & children** step, each partner has *Related to … by blood?*
- **Siblings** can have partners and children (the patient's nephews and nieces), added inside each brother's or sister's card.
- **Aunts and uncles** can be half: choose *Only the grandfather* or *Only the grandmother* under *Shares parents with the father/mother?*. The other grandparent is added as a placeholder.
- **Any partner** (the patient's, a sibling's, an aunt's or uncle's, a child's) can be someone already in the family. Choose them under **Already in the family?** on the partner card. The list is grouped by father's side, mother's side, and nephews and nieces. For example, an aunt married to an uncle from the other side makes their children cousins on both sides, and a sister married to her mother's brother is shown as uncle and niece. If the relative hasn't been entered yet, add them first (the card offers a button to jump to *Aunts, uncles & cousins*), then come back.
- **Editing an existing tree:** with a genogram on the board, **Generate** opens *Edit family history*, filled in from the board as seen from the patient (the person marked Proband). If nobody is marked, you're asked who the patient is first. Change any answer, add or remove people, and press **Update genogram**. Details the questionnaire doesn't show (exact dates, notes, condition colours, couple notes) are kept. People it doesn't cover, such as great-grandparents or a grandparent's brother's family, are kept exactly as they are, and are listed on the first and last steps. One Undo brings back the previous tree.
- To show exactly how the patient's partner is related, link the partner to a relative. Either order works:
  - **Partner entered first:** on the **Aunts, uncles & cousins** step, inside the uncle's or aunt's partner card, click **+ Sara (patient's partner) is their daughter** (or son). The partner's details move into the cousin entry.
  - **Relative entered first:** add the cousin on the **Aunts, uncles & cousins** step, then on the partner card choose them under *Already entered as a relative?*.

  Either way the person is not duplicated. The tree shows the family loop, and the relationship (first cousins, uncle and niece, …) is worked out from the tree automatically. **Unlink** on the cousin card, or choosing *No* on the partner card, separates them again and keeps the details on the partner card.

**On an existing genogram:**

1. Select the relationship by clicking on its line on the canvas.
2. In the Property Panel, find **Related by blood?**.
3. Choose the option. The change is applied immediately.

### 7.4 Clinical Significance

When a consanguineous relationship is identified:

- It may indicate increased risk for autosomal recessive conditions in offspring
- It is relevant for genetic counseling and carrier screening decisions
- It should be documented accurately for any family member referral to genetics services

---

## 8. Symbol Reference

### 8.1 Base Person Symbols

The following table shows every symbol used to represent persons on the genogram:

| Symbol | Shape | Represents | Fill Color |
|--------|-------|-----------|------------|
| Square | A square with softly rounded corners | **Male** | White |
| Circle | A circle | **Female** | White |
| Diamond with ? | A diamond shape | **Unknown gender** | White |
| Dashed grey shape with ? | Any symbol with a dashed outline | **Unknown person (placeholder)** | Light grey |
| Small diamond | A smaller diamond | **Pet** | Light green (#E8F5E9) |
| Triangle | An upward-pointing triangle | **Pregnancy** | White (#FFFFFF) |
| Triangle with X | A triangle with an X through it | **Miscarriage** | Dark gray (#333) |
| Triangle with line and X | A triangle with a vertical line and X | **Abortion** | Dark gray (#333) |

### 8.2 Overlay Indicators

Overlays are drawn on top of the base symbol to convey additional information:

| Overlay | Appearance | Meaning |
|---------|-----------|---------|
| **Deceased** | A thin X inside the symbol (with a light outline so condition icons stay visible) | The person is deceased |
| **Adopted** | A dashed blue border (#1565C0) surrounding the symbol | The person was adopted into the family |
| **Foster** | A dotted green border (#2E7D32) surrounding the symbol | The person is a foster family member |
| **Proband** | An arrow with a "P" pointing at the symbol from the lower left | The patient: the primary subject / index case of the genogram (set with the Proband checkbox) |
| **Selected** | A soft blue halo around the symbol | The person currently open in the Property Panel |

**Reading the lines in complex trees:** a dot marks a point where a line really branches (to a child or from a couple). A small hop marks a place where two lines cross without being connected. Hover over a person, or select them, to show their couples, the line from their parents and the lines to their children in blue, with all other lines faded.

Generations are shown as faint alternating rows labelled with Roman numerals (I, II, III, …) at the left, oldest generation first.

### 8.3 Clinical Condition Fills

When a person has clinical conditions assigned, up to four colored quadrant fills appear inside the base symbol:

| Quadrant | Position | Fill |
|----------|----------|------|
| 1 | Top-left quarter | Condition color at 70% opacity |
| 2 | Top-right quarter | Condition color at 70% opacity |
| 3 | Bottom-left quarter | Condition color at 70% opacity |
| 4 | Bottom-right quarter | Condition color at 70% opacity |

For female persons (circles), the quadrant fills are clipped to the circular shape. For male persons (squares), the fills are rectangular. With five or six conditions the symbol is split into one equal slice per condition instead; with seven or more, the sixth slice is a grey "+N" for the rest.

### 8.4 Twins Connectors

Twins are indicated by special connector lines drawn from the parental connection point to the twin children:

| Connector | Appearance | Meaning |
|-----------|-----------|---------|
| **Fraternal Twins** | A V-shaped pair of lines from the parent connection to each twin | Two siblings born from the same pregnancy (dizygotic) |
| **Identical Twins** | A V-shape with a horizontal bar across the midpoints of both legs | Two siblings born from the same pregnancy who are genetically identical (monozygotic) |

### 8.5 Symbol Layering Order

When a person has multiple attributes (e.g., a deceased adopted female with conditions), the symbol layers are drawn in this order from bottom to top:

1. **Base symbol** -- The gender or type shape (circle, square, triangle, etc.)
2. **Condition indicator fills** -- Colored quadrants inside the symbol
3. **Adopted or Foster overlay** -- Dashed or dotted border around the symbol
4. **Death overlay** -- X drawn through the symbol

This layering ensures all information remains visible.

---

## 9. Navigation and Canvas Controls

### 9.1 Zooming

You can zoom the canvas in several ways:

| Method | Action |
|--------|--------|
| **Ctrl (Cmd on Mac) + mouse wheel** | Scroll up to zoom in, scroll down to zoom out. Zoom is centered on the mouse cursor position. A trackpad pinch does the same. |
| **Toolbar + button** | Click the **+** button to zoom in by one step |
| **Toolbar - button** | Click the **-** (minus) button to zoom out by one step |
| **Pinch gesture** (touch devices) | Place two fingers on the screen and pinch together to zoom out, or spread apart to zoom in. Zoom is centered between the two touch points. |

The zoom range is **10% to 300%** (displayed as a percentage in the toolbar). Each step changes the zoom by 10%.

### 9.2 Panning

Panning moves the visible area of the canvas without changing the zoom level:

| Method | Action |
|--------|--------|
| **Middle-click drag** | Press and hold the middle mouse button, then drag to pan in any direction |
| **Space + left-click drag** | Hold the Space bar on your keyboard, then left-click and drag to pan |
| **Single finger drag** (touch devices) | Touch the canvas with one finger and drag to pan |

### 9.3 Fit to View

Click the **Fit** button in the toolbar to automatically adjust both zoom and pan so that the entire genogram fits within the visible canvas area with a comfortable margin (40 pixels of padding on all sides).

This is useful after adding many persons or when you have panned/zoomed to a position where some nodes are off-screen.

### 9.4 Auto Layout

Click the **Layout** button in the toolbar to run the automatic layout algorithm. This repositions all persons into a clean generational arrangement based on their relationships:

- Persons are arranged in horizontal rows by generation
- Couples are placed adjacent to each other
- Children are positioned below their parents
- Siblings are spaced evenly

Auto Layout is especially helpful after adding several persons manually or after importing a dataset.

### 9.5 Selecting and Deselecting

| Action | How |
|--------|-----|
| **Select a person** | Left-click on the person's symbol |
| **Select a relationship** | Left-click on or near the relationship line |
| **Deselect everything** | Left-click on any empty area of the canvas background |

When a person or relationship is selected, it is visually highlighted (the stroke color changes to blue, #2196F3, and the stroke width increases). The Property Panel on the right updates to show the corresponding editing form.

### 9.6 Dragging Nodes

To move a person node:

1. Left-click on the person's symbol and hold the mouse button down.
2. Drag the symbol to a new position.
3. Release the mouse button.

**Note:** If the Space bar is held while dragging, the action is interpreted as panning the canvas rather than moving the node.

---

## 10. Export and Import

### 10.1 Export JSON

**What it does:** Saves the complete genogram data (all persons, relationships, conditions, positions, and metadata) as a structured `.json` file.

**How to use:**

1. Click the **JSON** button in the toolbar.
2. Your browser will download a file named `genogram.json`.
3. Store this file for later import, sharing, or archival.

**When to use:** Use JSON export whenever you want to save your work so you can continue editing later, share the genogram with a colleague, or back up the data.

The exported file includes:

- All person records (names, dates, gender, type, conditions, positions)
- All relationship records (type, consanguinity, dates, notes, children)
- Version information for compatibility

The JSON file is validated before export to ensure data integrity.

### 10.2 Export PNG

**What it does:** Renders the current genogram as a high-resolution PNG image file.

**How to use:**

1. Arrange the genogram to your satisfaction (zoom and pan to frame it as desired, or use Fit to View).
2. Click the **PNG** button in the toolbar.
3. Your browser will download a file named `genogram.png`.

**Technical details:**

- The image is rendered at 2x resolution (retina/high-DPI quality) for crisp printing.
- The export process clones the SVG canvas and inlines all styles to ensure the exported image matches what you see on screen.
- The image has a white background.

**When to use:** Use PNG export when you need to insert the genogram into a document, presentation, patient record, or email. PNG images are universally supported and maintain visual fidelity.

### 10.3 Export PDF

**What it does:** Renders the genogram as a PDF document, suitable for printing or inclusion in formal clinical records.

**How to use:**

1. Click the appropriate PDF export control (if available in your deployment).
2. Your browser will download a file named `genogram.pdf`.

**Requirements:** PDF export requires the **jsPDF** library to be installed in your deployment. If jsPDF is not available, the export will fail with a descriptive error message. Contact your system administrator if PDF export is needed but not working.

**Technical details:**

- The genogram is first rendered as a high-resolution PNG, then embedded into a PDF document.
- The PDF orientation (portrait or landscape) is automatically chosen based on the genogram dimensions.
- The PDF page size matches the genogram canvas dimensions for a precise fit.

### 10.4 Import JSON

**What it does:** Loads a previously exported `.json` genogram file into the editor, replacing any current data.

**How to use:**

1. Click the **Import** button in the toolbar.
2. A file picker dialog opens. Navigate to and select a `.json` file.
3. The file is read, validated, and loaded into the editor.
4. The auto-layout algorithm runs to position all persons on the canvas.

**Important notes:**

- Importing a file replaces the current genogram entirely. Make sure to export your current work first if you do not want to lose it.
- The importer validates the JSON data and fills in default values for optional fields if they are missing.
- Older file formats are automatically migrated to the current version.
- If the file is not valid JSON or does not match the expected data structure, an error will be logged and the import will be canceled.

### 10.5 Data Format Summary

The genogram data file is a JSON object with this structure:

```
{
  "version": "1.0.0",
  "persons": [
    {
      "id": "unique-identifier",
      "fullName": "John Doe",
      "gender": "male",
      "type": "standard",
      "dateOfBirth": "1960-05-15",
      "dateOfDeath": "",
      "isDeceased": false,
      "isProband": true,
      "conditions": [
        { "id": "cond-1", "name": "Diabetes", "color": "#2196f3", "quadrant": 1 }
      ],
      "notes": "Index patient"
    }
  ],
  "relationships": [
    {
      "id": "unique-identifier",
      "type": "marriage",
      "person1Id": "person-id-1",
      "person2Id": "person-id-2",
      "childrenIds": ["child-id-1", "child-id-2"],
      "consanguinity": "none",
      "startDate": "1985-06-20",
      "endDate": "",
      "notes": ""
    }
  ]
}
```

---

## 11. Undo and Redo

### 11.1 How Undo/Redo Works

Every action that changes the genogram data is recorded in a history stack. This allows you to step backward through your changes and forward again if needed.

- **Undo** reverses the most recent action and moves it to the redo stack.
- **Redo** re-applies the most recently undone action.

The history stack stores up to **50 steps**. Once you exceed 50 actions, the oldest entries are discarded to conserve memory.

### 11.2 Using Undo and Redo

| Action | How |
|--------|-----|
| **Undo** | Click the **Undo** button in the toolbar |
| **Redo** | Click the **Redo** button in the toolbar |

The Undo button is disabled (grayed out) when there are no actions to undo. The Redo button is disabled when there are no actions to redo.

### 11.3 What Actions Are Tracked

The following actions are recorded in the undo history:

- Adding a person
- Editing a person's properties (after clicking Save)
- Deleting a person
- Adding a relationship
- Editing a relationship's properties (after clicking Save)
- Deleting a relationship
- Changing a person's clinical conditions
- Changing a relationship's consanguinity level

**Note:** Canvas navigation actions (zooming, panning) and node dragging do NOT create undo history entries. These are purely visual adjustments and do not affect the underlying data.

---

## 12. Keyboard and Mouse Reference

### Desktop (Mouse and Keyboard)

| Action | Input | Notes |
|--------|-------|-------|
| Select a person | Left-click on the person symbol | Opens the person form in the Property Panel |
| Select a relationship | Left-click on the relationship line | Opens the relationship form in the Property Panel |
| Deselect | Left-click on empty canvas | Clears the selection and the Property Panel |
| Drag a person node | Left-click + drag on a person symbol | Moves the person to a new position |
| Pan the canvas | Middle-click + drag | Scrolls the visible area of the canvas |
| Pan the canvas (alt.) | Space + left-click + drag | Hold Space first, then click and drag |
| Scroll the canvas | Mouse wheel (or two-finger trackpad swipe) | Moves the board up and down; Shift + wheel moves it sideways |
| Zoom in | Ctrl/Cmd + mouse wheel scroll up, or trackpad pinch | Zooms toward the mouse cursor position |
| Zoom out | Ctrl/Cmd + mouse wheel scroll down, or trackpad pinch | Zooms away from the mouse cursor position |
| Zoom in (toolbar) | Click the **+** button | Zooms in by 10% |
| Zoom out (toolbar) | Click the **-** button | Zooms out by 10% |
| Fit to view | Click the **Fit** button | Fits all content into the visible area |
| Auto layout | Click the **Layout** button | Recalculates positions for all persons |
| Undo | Click the **Undo** button | Reverses the last data change |
| Redo | Click the **Redo** button | Re-applies the last undone change |
| Export JSON | Click the **JSON** button | Downloads genogram data as a .json file |
| Export PNG | Click the **PNG** button | Downloads genogram as a .png image |
| Import JSON | Click the **Import** button | Opens a file picker to load a .json file |
| Add male person | Click the square icon button | Adds a new male to the canvas center |
| Add female person | Click the circle icon button | Adds a new female to the canvas center |
| Add unknown person | Click the diamond icon button | Adds a new unknown-gender person to the canvas center |
| Add relationship | Click the **Link** button | Creates a new relationship between persons |

### Touch Devices (Tablet / Phone)

| Action | Input | Notes |
|--------|-------|-------|
| Select a person or relationship | Tap on the element | Same as left-click |
| Pan the canvas | Single finger drag on empty canvas | Slides the view in the drag direction |
| Zoom in/out | Two-finger pinch / spread | Pinch together to zoom out; spread to zoom in |

---

## 13. Tips and Best Practices

### Planning Your Genogram

1. **Start with the proband.** The proband is the primary subject of the genogram -- usually the patient or client. Add them first and check the "Proband" checkbox so they are clearly identified.

2. **Add parents before children.** Build the genogram top-down, starting with the oldest generation you wish to include. Add the proband's parents, then grandparents if relevant, then move down to the proband's generation and their children.

3. **Create relationships as you go.** After adding two persons who are related (e.g., a married couple), immediately create a Link between them and set the appropriate relationship type.

4. **Use Auto Layout frequently.** After adding several persons and relationships, click the **Layout** button to let the tool arrange them neatly. This saves considerable time compared to manual positioning.

### Working Efficiently

5. **Use Fit to View to reorient.** If you have panned or zoomed and lost track of where your genogram is, click **Fit** to snap back to a full view.

6. **Save and export regularly.** Click **JSON** periodically to export your work. This protects against accidental data loss (e.g., closing the browser tab) and creates a file you can reload later.

7. **Remember to click Save.** Property changes in the right panel are not applied until you click the Save button. If you switch to a different person or relationship before saving, your edits to the previous selection are lost.

### Clinical Conditions

8. **Establish a consistent color scheme.** Before beginning a genogram, decide on a color for each condition you plan to track (e.g., red for heart disease, blue for diabetes, green for cancer). Use these colors consistently across all persons.

9. **Use distinct, high-contrast colors.** Choose colors that are easy to distinguish from one another and from the base symbol colors (light blue, light pink, light gray). Avoid very light or very similar colors.

10. **Keep conditions focused.** Up to four conditions use the standard quarters, five or six are shown as slices, and anything beyond six is summarised as "+N"; for a person with many conditions, consider recording only the clinically relevant ones and putting the rest in the Notes field.

### Large Genograms

11. **Work in sections.** For large families, consider building one branch at a time, using Auto Layout after each branch.

12. **Use the zoom controls.** Zoom out to see the big picture, zoom in to work on details. Hold Ctrl (Cmd on Mac) and use the mouse wheel to zoom at the cursor; the wheel on its own scrolls the board.

13. **Use notes for context.** The Notes field on both persons and relationships is a valuable place to record clinical observations, session notes, or other contextual information that does not fit into the structured fields.

---

## 14. Troubleshooting

### Nothing Appears on the Canvas

**Symptom:** The canvas is blank.

**Possible causes and solutions:**

- **No persons have been added yet.** Click one of the Add Person buttons (square, circle, or diamond) in the toolbar to add your first person.
- **The genogram data has not been loaded.** If you expected data to appear automatically, verify with your system administrator that the component is configured with initial data or try importing a JSON file.
- **The canvas is panned/zoomed to an empty area.** Click the **Fit** button in the toolbar to automatically re-center and zoom to fit all content.

### Cannot Click on a Relationship Line

**Symptom:** You are trying to select a relationship line but clicks do not register.

**Possible causes and solutions:**

- **Clicking too far from the line.** Relationship lines have a hit area, but you still need to click reasonably close to the line itself. Try clicking directly on the visible line.
- **The relationship is behind a person node.** Person nodes are drawn on top of relationship lines. If a relationship line passes under a person symbol, try clicking on a part of the line that is not covered by a node.
- **The line is very short.** If two persons are very close together, the relationship line between them may be very short and hard to click. Try moving one of the persons further away first.

### PDF Export Fails

**Symptom:** Attempting to export as PDF produces an error.

**Solution:** PDF export requires the **jsPDF** library. This is an optional dependency that may not be installed in your deployment. The error message will read: "jsPDF is required for PDF export. Install it with: npm install jspdf." Contact your system administrator or IT department to have jsPDF installed.

### Undo/Redo Buttons Are Grayed Out

**Symptom:** The Undo or Redo button is disabled and cannot be clicked.

**Explanation:**

- **Undo is disabled** when there are no actions to undo. This is normal when you first open the tool or have already undone all actions back to the initial state.
- **Redo is disabled** when there are no undone actions to re-apply. This is normal if you have not recently used Undo, or if you performed a new action after undoing (which clears the redo stack).

### Changes Are Not Being Saved

**Symptom:** You edit properties in the Property Panel but the genogram does not update.

**Solution:** Make sure you click the **Save** button in the Property Panel after making changes. The Save button is only enabled when you have unsaved modifications. If you select a different person or relationship before clicking Save, your edits are discarded.

### Imported File Produces an Error

**Symptom:** Importing a JSON file fails or produces unexpected results.

**Possible causes and solutions:**

- **Invalid JSON format.** The file must contain valid JSON. Open it in a text editor to check for syntax errors (missing commas, unclosed brackets, etc.).
- **Wrong file type.** Ensure you are importing a `.json` file. The file picker filters for `.json` files by default.
- **Incompatible data structure.** The JSON must follow the genogram data format described in [Section 10.5](#105-data-format-summary). It must contain a `persons` array and a `relationships` array at minimum. The importer will attempt to fill in missing default values, but fundamentally malformed data will be rejected.
- **Old file version.** Older files missing a `version` field are automatically migrated. If the file is from a very different tool or format, it may not be compatible.

### Symbols or Lines Look Wrong

**Symptom:** Symbols appear in unexpected shapes or lines have the wrong style.

**Possible causes and solutions:**

- **Gender or Type mismatch.** Select the person and verify the Gender and Type dropdowns are set correctly. A person set to "Male" will always display as a square; changing to "Female" will change it to a circle. Similarly, setting Type to "Pregnancy" will change the symbol to a triangle regardless of gender.
- **Deceased X not showing.** Ensure the "Deceased" checkbox is checked in the Person Properties form and that you have clicked Save.
- **Relationship line style does not match expected type.** Select the relationship and verify the Type dropdown is correct. Each relationship type has a unique line style and color. See the [Relationship Types Reference](#56-relationship-types-reference) for details.

### Canvas Performance Is Slow

**Symptom:** The canvas feels sluggish when panning, zooming, or dragging.

**Possible causes and solutions:**

- **Very large genogram.** Genograms with many hundreds of persons may experience slower rendering. Consider splitting the genogram into smaller sub-families if performance is an issue.
- **Browser limitations.** Ensure you are using a modern browser (Chrome, Firefox, Safari, or Edge) with a recent version. Close unnecessary tabs to free up memory.

---

*This manual covers version 1.0 of the Clinical Genogram web component. For developer documentation, API reference, and integration instructions, please refer to the project README.*
