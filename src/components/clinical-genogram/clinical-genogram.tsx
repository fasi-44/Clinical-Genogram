import { Component, Prop, State, Method, Event, EventEmitter, Watch, Element, h } from '@stencil/core';
import { GenogramData, Gender, Person, Relationship, ClinicalCondition, IntakeForm } from '../../types';
import { GenogramState } from '../../core/GenogramState';
import { buildGenogramFromIntake } from '../../core/KinshipBuilder';
import { intakeFromTree, mergeKept } from '../../core/IntakeFromTree';
import { buildTemplate } from '../../core/templates';
import { validateGenogramData } from '../../utils/json-schema';
import { contentBounds } from '../../utils/bounds';
import { FIT_MAX_ZOOM } from '../../utils/constants';
import { LayoutEngine } from '../../core/LayoutEngine';
import { SelectionManager } from '../../core/SelectionManager';
import { DragManager } from '../../core/DragManager';
import { ZoomPanManager } from '../../core/ZoomPanManager';
import { downloadJson } from '../../utils/export-json';
import { downloadPng } from '../../utils/export-png';

@Component({
  tag: 'clinical-genogram',
  styleUrl: 'clinical-genogram.css',
  shadow: true,
})
export class ClinicalGenogram {
  @Element() el!: HTMLElement;

  /** Initial data - can be a GenogramData object or JSON string */
  @Prop() data?: GenogramData | string;

  /** Available clinical conditions for the condition picker */
  @Prop() conditions: ClinicalCondition[] = [];

  /** Whether to show the legend panel */
  @Prop() showLegend: boolean = true;

  /** Whether to show the toolbar */
  @Prop() showToolbar: boolean = true;

  /** Whether to show the property panel */
  @Prop() showPropertyPanel: boolean = true;

  /** Whether to draw each condition's icon (or first letter) inside its coloured quarter */
  @Prop() showConditionIcons: boolean = true;

  // Internal state
  @State() private selectedType: 'person' | 'relationship' | null = null;
  @State() private selectedPerson: Person | null = null;
  @State() private selectedRelationship: Relationship | null = null;
  @State() private canUndo: boolean = false;
  @State() private canRedo: boolean = false;
  @State() private currentZoom: number = 1;
  @State() private stateVersion: number = 0; // bumped to trigger re-renders
  @State() private linkMode: boolean = false;
  @State() private activeChildRelationship: Relationship | null = null; // relationship for "Add Child"
  @State() private intakeOpen: boolean = false;
  /** Editing the tree on the board (questionnaire filled in from it) rather than starting fresh */
  @State() private editSession: EditSession | null = null;
  /** Asking who the patient is before the board can be read into the questionnaire */
  @State() private pickingPatient: boolean = false;
  private wizardKey = 0;
  private linkFirstPersonId: string | null = null;
  /** Last questionnaire answers, so reopening the wizard continues from them */
  private lastIntake?: IntakeForm;

  // Core managers (not reactive - passed by reference)
  private genogramState!: GenogramState;
  private layoutEngine = new LayoutEngine();
  private selectionManager = new SelectionManager();
  private dragManager = new DragManager();
  private zoomPanManager = new ZoomPanManager();
  private unsubscribers: (() => void)[] = [];

  // External events
  @Event() genogramChange!: EventEmitter<GenogramData>;
  @Event() nodeClick!: EventEmitter<Person>;
  @Event() nodeDoubleClick!: EventEmitter<Person>;
  @Event() relationshipClick!: EventEmitter<Relationship>;
  @Event() genogramExport!: EventEmitter<{ format: string; data: any }>;
  /** Emitted after a questionnaire has been turned into the current genogram */
  @Event() intakeComplete!: EventEmitter<{ intake: IntakeForm; data: GenogramData }>;

  // ---------------------------------------------------------------------------
  // Public API methods
  // ---------------------------------------------------------------------------

  @Method()
  async getData(): Promise<GenogramData> {
    return this.genogramState.getData();
  }

  @Method()
  async setData(data: GenogramData): Promise<void> {
    this.genogramState.setData(data);
    this.runLayout();
    requestAnimationFrame(() => this.fitToView());
  }

  @Method()
  async undo(): Promise<void> {
    this.genogramState.undo();
  }

  @Method()
  async redo(): Promise<void> {
    this.genogramState.redo();
  }

  @Method()
  async fitToView(): Promise<void> {
    const svg = this.el.shadowRoot?.querySelector('.genogram-canvas') as SVGElement;
    if (!svg) return;

    const persons = this.genogramState.getPersons();
    if (persons.length === 0) return;

    const rect = svg.getBoundingClientRect();
    const padding = 40; // screen padding around the tree (labels are already in the bounds)
    this.zoomPanManager.fitToView(contentBounds(persons), rect.width, rect.height, padding, FIT_MAX_ZOOM);
  }

  @Method()
  async autoLayout(): Promise<void> {
    this.runLayout();
  }

  /** Open the family-history questionnaire */
  /**
   * Open the family-history questionnaire. With a tree on the board it opens
   * in edit mode, filled in from the board (asking who the patient is first
   * when nobody is marked as the proband).
   */
  @Method()
  async openIntake(): Promise<void> {
    const persons = this.genogramState.getPersons();
    this.editSession = null;
    this.pickingPatient = false;
    this.wizardKey++;
    if (persons.length > 0) {
      const proband = persons.find(p => p.isProband);
      if (proband) this.startEditSession(proband.id);
      else this.pickingPatient = true;
    }
    this.intakeOpen = true;
  }

  private startEditSession(probandId: string) {
    const original = this.genogramState.getData();
    const { intake, placedIds, partnerOnlyIds } = intakeFromTree(original, probandId);
    const kept = original.persons.filter(p => !placedIds.has(p.id));
    this.editSession = {
      original,
      intake,
      placedIds,
      partnerOnlyIds,
      keptNames: kept.map(p => p.fullName || (p.isPlaceholder ? 'Unknown person' : 'Unnamed person')),
    };
    this.pickingPatient = false;
    this.wizardKey++;
  }

  /** Conditions offered and reused when building: the host's list plus those already on the board */
  private knownConditions(): ClinicalCondition[] {
    const byName = new Map<string, ClinicalCondition>();
    for (const c of [...this.conditions, ...this.genogramState.getPersons().flatMap(p => p.conditions ?? [])]) {
      const key = c.name.trim().toLowerCase();
      if (!byName.has(key)) byName.set(key, c);
    }
    return [...byName.values()];
  }

  /**
   * Build a genogram from questionnaire answers and load it, replacing the
   * current one as a single undoable step.
   */
  @Method()
  async loadIntake(intake: IntakeForm): Promise<GenogramData> {
    let data = buildGenogramFromIntake(intake, { availableConditions: this.knownConditions() });
    // Editing the board: put back everyone the questionnaire doesn't cover
    if (this.editSession) {
      const s = this.editSession;
      data = mergeKept(data, s.original, s.placedIds, s.partnerOnlyIds);
      data.metadata = { ...s.original.metadata, ...data.metadata, createdAt: s.original.metadata?.createdAt ?? data.metadata?.createdAt };
    }
    const validation = validateGenogramData(data);
    if (!validation.valid) {
      throw new Error(`Generated genogram is invalid: ${validation.errors.join('; ')}`);
    }
    this.lastIntake = intake;
    this.selectionManager.deselect();
    this.genogramState.replaceData(data);
    this.runLayout();
    requestAnimationFrame(() => this.fitToView());
    const result = this.genogramState.getData();
    this.intakeComplete.emit({ intake, data: result });
    return result;
  }

  /**
   * Replace the board with one of the ready-made family structures
   * (`GENOGRAM_TEMPLATES`), as a single undoable step.
   */
  @Method()
  async loadTemplate(id: string, patientGender: Gender = 'male'): Promise<GenogramData> {
    const data = buildTemplate(id, patientGender);
    this.selectionManager.deselect();
    this.genogramState.replaceData(data);
    this.runLayout();
    requestAnimationFrame(() => this.fitToView());
    return this.genogramState.getData();
  }

  @Method()
  async exportAs(format: 'json' | 'png' | 'pdf'): Promise<any> {
    const data = this.genogramState.getData();
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      this.genogramExport.emit({ format: 'json', data: blob });
      return blob;
    }
    // PNG/PDF handled by export utilities (Phase 12)
    return data;
  }

  // ---------------------------------------------------------------------------
  // Watchers
  // ---------------------------------------------------------------------------

  @Watch('data')
  handleDataChange(newData: GenogramData | string | undefined) {
    if (!newData) return;
    const parsed = typeof newData === 'string' ? JSON.parse(newData) : newData;
    this.genogramState.setData(parsed);
    this.runLayout();
    requestAnimationFrame(() => this.fitToView());
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  connectedCallback() {
    // Initialize state
    let initialData: GenogramData | undefined;
    if (this.data) {
      initialData = typeof this.data === 'string' ? JSON.parse(this.data) : this.data;
    }
    this.genogramState = new GenogramState(initialData);

    // Subscribe to state changes
    this.unsubscribers.push(
      this.genogramState.subscribe(() => {
        this.canUndo = this.genogramState.canUndo();
        this.canRedo = this.genogramState.canRedo();
        // Keep the side panel showing the latest version of the selection
        const sel = this.selectionManager.getSelection();
        if (sel.type === 'person' && sel.id) this.selectedPerson = this.genogramState.getPerson(sel.id) ?? null;
        if (sel.type === 'relationship' && sel.id) this.selectedRelationship = this.genogramState.getRelationship(sel.id) ?? null;
        this.stateVersion++;
        this.genogramChange.emit(this.genogramState.getData());
      })
    );

    // Subscribe to selection changes
    this.unsubscribers.push(
      this.selectionManager.subscribe((sel) => {
        this.selectedType = sel.type;
        if (sel.type === 'person' && sel.id) {
          this.selectedPerson = this.genogramState.getPerson(sel.id) ?? null;
          this.selectedRelationship = null;
          // Find a couple relationship this person belongs to (for "Add Child")
          const rels = this.genogramState.getRelationshipsForPerson(sel.id);
          this.activeChildRelationship = rels.find(r => r.type !== 'child') ?? null;
        } else if (sel.type === 'relationship' && sel.id) {
          this.selectedRelationship = this.genogramState.getRelationship(sel.id) ?? null;
          this.selectedPerson = null;
          this.activeChildRelationship = this.selectedRelationship;
        } else {
          this.selectedPerson = null;
          this.selectedRelationship = null;
          this.activeChildRelationship = null;
        }
      })
    );

    // Subscribe to zoom changes
    this.unsubscribers.push(
      this.zoomPanManager.subscribe((view) => {
        this.currentZoom = view.zoom;
      })
    );

    // Run initial layout if there's data
    if (initialData && initialData.persons?.length > 0) {
      this.runLayout();
      // Auto fit-to-view after first render
      requestAnimationFrame(() => this.fitToView());
    }
  }

  disconnectedCallback() {
    this.unsubscribers.forEach(fn => fn());
    this.unsubscribers = [];
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  private runLayout() {
    const persons = this.genogramState.getPersons();
    const relationships = this.genogramState.getRelationships();
    if (persons.length === 0) return;

    const layout = this.layoutEngine.calculateLayout(persons, relationships);
    // Use silent position updates to avoid polluting undo history
    layout.positions.forEach((pos, id) => {
      this.genogramState.updatePersonPosition(id, pos.x, pos.y);
    });
    this.genogramState.notifyChange();
  }

  // ---------------------------------------------------------------------------
  // Toolbar event handlers
  // ---------------------------------------------------------------------------

  private handleAddPerson = (e: CustomEvent<{ gender: 'male' | 'female' | 'unknown' }>) => {
    const person = this.genogramState.addPerson({ gender: e.detail.gender });
    // Position new person near center of view
    const viewCenter = this.zoomPanManager.screenToWorld(
      this.el.clientWidth / 2,
      this.el.clientHeight / 2
    );
    this.genogramState.updatePerson(person.id, { x: viewCenter.x, y: viewCenter.y });
    this.selectionManager.select('person', person.id);
  };

  private handleAddRelationship = () => {
    // Toggle link mode: user clicks two persons on canvas to create a relationship
    this.linkMode = !this.linkMode;
    this.linkFirstPersonId = null;
  };

  private handleAddChildToSelected = (e: CustomEvent<{ gender: 'male' | 'female' | 'unknown' }>) => {
    const rel = this.activeChildRelationship;
    if (!rel) return;

    // Create the child person near the midpoint below the two parents
    const p1 = this.genogramState.getPerson(rel.person1Id);
    const p2 = this.genogramState.getPerson(rel.person2Id);
    const midX = ((p1?.x ?? 0) + (p2?.x ?? 0)) / 2;
    const parentY = Math.max(p1?.y ?? 0, p2?.y ?? 0);

    const child = this.genogramState.addPerson({ gender: e.detail.gender });
    this.genogramState.updatePerson(child.id, {
      x: midX,
      y: parentY + 120,
    });

    // Add child to the relationship's childrenIds
    const currentChildren = rel.childrenIds ?? [];
    this.genogramState.updateRelationship(rel.id, {
      childrenIds: [...currentChildren, child.id],
    });

    // Refresh activeChildRelationship with updated childrenIds
    // Do NOT select the child — keep current selection so user can keep adding children
    this.activeChildRelationship = this.genogramState.getRelationship(rel.id) ?? null;
  };

  private handleOpenIntake = () => { this.openIntake(); };

  private handleApplyTemplate = (e: CustomEvent<{ id: string; patientGender: Gender }>) => {
    e.stopPropagation();
    this.loadTemplate(e.detail.id, e.detail.patientGender);
  };

  private handlePickPatient = (e: CustomEvent<string>) => {
    e.stopPropagation();
    this.startEditSession(e.detail);
  };

  private handleIntakeSubmit = async (e: CustomEvent<IntakeForm>) => {
    e.stopPropagation();
    try {
      await this.loadIntake(e.detail);
      this.intakeOpen = false;
      this.editSession = null;
    } catch (err) {
      console.error('Failed to build genogram from questionnaire:', err);
    }
  };

  private handleIntakeCancel = (e: CustomEvent<IntakeForm>) => {
    e.stopPropagation();
    if (!this.editSession) this.lastIntake = e.detail;
    this.intakeOpen = false;
    this.editSession = null;
    this.pickingPatient = false;
  };

  private handleUndo = () => { this.genogramState.undo(); };
  private handleRedo = () => { this.genogramState.redo(); };
  private handleZoomIn = () => { this.zoomPanManager.zoomIn(); };
  private handleZoomOut = () => { this.zoomPanManager.zoomOut(); };
  private handleFitToView = () => { this.fitToView(); };
  private handleAutoLayout = () => {
    this.runLayout();
    requestAnimationFrame(() => this.fitToView());
  };

  private handleExportJson = () => {
    try {
      const data = this.genogramState.getData();
      downloadJson(data);
      this.genogramExport.emit({ format: 'json', data });
    } catch (err) {
      console.error('Failed to export JSON:', err);
    }
  };

  private handleExportPng = async () => {
    try {
      // Try multiple selectors to find the SVG inside the shadow tree
      const root = this.el.shadowRoot;
      let svg: SVGElement | null = null;
      if (root) {
        svg = root.querySelector('svg.genogram-canvas')
          || root.querySelector('.genogram-canvas')
          || root.querySelector('genogram-canvas svg');
      }
      // Fallback: query inside the genogram-canvas element directly
      if (!svg) {
        const canvasEl = root?.querySelector('genogram-canvas');
        if (canvasEl) {
          svg = canvasEl.querySelector('svg');
        }
      }
      if (!svg) {
        console.error('Export PNG: SVG element not found');
        return;
      }
      await downloadPng(svg);
      this.genogramExport.emit({ format: 'png', data: null });
    } catch (err) {
      console.error('Failed to export PNG:', err);
    }
  };

  private handleImportJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text) as GenogramData;
        this.genogramState.setData(data);
        this.runLayout();
        requestAnimationFrame(() => this.fitToView());
      } catch (err) {
        console.error('Failed to import genogram data:', err);
      }
    };
    input.click();
  };

  // ---------------------------------------------------------------------------
  // Canvas event handlers
  // ---------------------------------------------------------------------------

  private handleNodeClick = (e: CustomEvent<Person>) => {
    if (this.linkMode) {
      const clickedId = e.detail.id;
      if (!this.linkFirstPersonId) {
        // First person selected
        this.linkFirstPersonId = clickedId;
        this.selectionManager.select('person', clickedId);
      } else if (this.linkFirstPersonId !== clickedId) {
        // Second person selected - create the relationship
        const rel = this.genogramState.addRelationship({
          type: 'marriage',
          person1Id: this.linkFirstPersonId,
          person2Id: clickedId,
        });
        this.selectionManager.select('relationship', rel.id);
        // Exit link mode
        this.linkMode = false;
        this.linkFirstPersonId = null;
      }
      return;
    }
    this.nodeClick.emit(e.detail);
  };

  private handleNodeDoubleClick = (e: CustomEvent<Person>) => {
    this.nodeDoubleClick.emit(e.detail);
  };

  private handleRelationshipClick = (e: CustomEvent<Relationship>) => {
    this.relationshipClick.emit(e.detail);
  };

  // ---------------------------------------------------------------------------
  // Property panel event handlers
  // ---------------------------------------------------------------------------

  private handlePersonUpdate = (e: CustomEvent<Partial<Person> & { id: string }>) => {
    const { id, ...updates } = e.detail;
    const order = () => this.genogramState.getRelationships().map(r => r.childrenIds.join(',')).join('|');
    const before = order();
    this.genogramState.updatePerson(id, updates);
    // A new age can move them among their siblings (oldest on the left)
    if (order() !== before) this.runLayout();
    // Refresh selected person
    this.selectedPerson = this.genogramState.getPerson(id) ?? null;
  };

  private handlePersonDelete = (e: CustomEvent<string>) => {
    this.genogramState.removePerson(e.detail);
    this.selectionManager.deselect();
  };

  private handleRelationshipUpdate = (e: CustomEvent<Partial<Relationship> & { id: string }>) => {
    const { id, ...updates } = e.detail;
    this.genogramState.updateRelationship(id, updates);
    this.selectedRelationship = this.genogramState.getRelationship(id) ?? null;
  };

  private handleRelationshipDelete = (e: CustomEvent<string>) => {
    this.genogramState.removeRelationship(e.detail);
    this.selectionManager.deselect();
  };

  /** Family edits from the side panel; the tree is laid out again afterwards */
  private handleAddRelative = (e: CustomEvent<{ personId: string; kind: 'parents' | 'sibling' | 'partner' | 'child'; gender?: Gender }>) => {
    e.stopPropagation();
    const { personId, kind, gender } = e.detail;
    const s = this.genogramState;
    if (kind === 'parents') s.addParents(personId);
    else if (kind === 'sibling') s.addSibling(personId, gender ?? 'unknown');
    else if (kind === 'partner') s.addPartner(personId);
    else s.addChild(personId, gender ?? 'unknown');
    this.runLayout();
  };

  private handleParentsChange = (e: CustomEvent<{ personId: string; coupleId: string | null }>) => {
    e.stopPropagation();
    if (this.genogramState.setParents(e.detail.personId, e.detail.coupleId)) this.runLayout();
  };

  private handleCoupleChildAction = (
    e: CustomEvent<{ coupleId: string; action: 'up' | 'down' | 'remove' | 'add'; childId?: string; gender?: Gender }>,
  ) => {
    e.stopPropagation();
    const { coupleId, action, childId, gender } = e.detail;
    const s = this.genogramState;
    const couple = s.getRelationship(coupleId);
    if (!couple) return;
    if (action === 'add') s.addChild(couple.person1Id, gender ?? 'unknown', coupleId);
    else if (action === 'remove' && childId) s.removeChildFromCouple(coupleId, childId);
    else if (childId) s.moveChild(coupleId, childId, action === 'up' ? -1 : 1);
    this.runLayout();
  };

  private handlePanelClose = () => {
    this.selectionManager.deselect();
  };

  /** Distinct conditions on the tree (by name), for the legend */
  private conditionsInUse(): ClinicalCondition[] {
    const byName = new Map<string, ClinicalCondition>();
    for (const p of this.genogramState.getPersons()) {
      for (const c of p.conditions ?? []) {
        const key = c.name.trim().toLowerCase();
        if (key && !byName.has(key)) byName.set(key, c);
      }
    }
    return [...byName.values()];
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  render() {
    // Use stateVersion to force re-renders (it's referenced here so Stencil tracks it)
    void this.stateVersion;

    return (
      <div class="clinical-genogram">
        {this.showToolbar && (
          <genogram-toolbar
            canUndo={this.canUndo}
            canRedo={this.canRedo}
            zoom={this.currentZoom}
            linkMode={this.linkMode}
            hasSelection={this.selectedType !== null}
            selectionIsRelationship={this.activeChildRelationship !== null}
            hasPeople={this.genogramState.getPersons().length > 0}
            onAddPerson={this.handleAddPerson}
            onAddRelationship={this.handleAddRelationship}
            onAddChildToSelected={this.handleAddChildToSelected}
            onToolbarUndo={this.handleUndo}
            onToolbarRedo={this.handleRedo}
            onToolbarZoomIn={this.handleZoomIn}
            onToolbarZoomOut={this.handleZoomOut}
            onToolbarFitToView={this.handleFitToView}
            onToolbarAutoLayout={this.handleAutoLayout}
            onToolbarExportJson={this.handleExportJson}
            onToolbarExportPng={this.handleExportPng}
            onToolbarImportJson={this.handleImportJson}
            onToolbarOpenIntake={this.handleOpenIntake}
            onToolbarApplyTemplate={this.handleApplyTemplate}
          />
        )}

        <div class="genogram-main">
          <genogram-canvas
            showConditionIcons={this.showConditionIcons}
            state={this.genogramState}
            selectionManager={this.selectionManager}
            dragManager={this.dragManager}
            zoomPanManager={this.zoomPanManager}
            onCanvasNodeClick={this.handleNodeClick}
            onCanvasNodeDoubleClick={this.handleNodeDoubleClick}
            onCanvasRelationshipClick={this.handleRelationshipClick}
          />

          {this.showPropertyPanel && this.selectedType !== null && (
            <genogram-property-panel
              selectedType={this.selectedType}
              selectedPerson={this.selectedPerson}
              selectedRelationship={this.selectedRelationship}
              allPersons={this.genogramState.getPersons()}
              availableConditions={this.knownConditions()}
              parentOptions={this.selectedPerson ? this.genogramState.getPossibleParentCouples(this.selectedPerson.id) : []}
              parentCouple={this.selectedPerson ? this.genogramState.getParentsOf(this.selectedPerson.id).relationship : null}
              onAddRelative={this.handleAddRelative}
              onParentsChange={this.handleParentsChange}
              onCoupleChildAction={this.handleCoupleChildAction}
              onPersonUpdate={this.handlePersonUpdate}
              onPersonDelete={this.handlePersonDelete}
              onRelationshipUpdate={this.handleRelationshipUpdate}
              onRelationshipDelete={this.handleRelationshipDelete}
              onPanelClose={this.handlePanelClose}
            />
          )}
        </div>

        {this.showLegend && (
          <genogram-legend conditions={this.conditionsInUse()} showConditionIcons={this.showConditionIcons} />
        )}

        {this.intakeOpen && (
          <genogram-intake-wizard
            key={`wizard-${this.wizardKey}`}
            availableConditions={this.knownConditions()}
            existingCount={this.genogramState.getPersons().length}
            initialIntake={this.editSession ? this.editSession.intake : this.genogramState.getPersons().length ? undefined : this.lastIntake}
            mode={this.editSession ? 'edit' : 'new'}
            keptPeople={this.editSession?.keptNames ?? []}
            patientChoices={
              this.pickingPatient
                ? this.genogramState.getPersons().map(p => ({ id: p.id, name: p.fullName || 'Unnamed person', gender: p.gender, age: p.age }))
                : []
            }
            onIntakePickPatient={this.handlePickPatient}
            onIntakeSubmit={this.handleIntakeSubmit}
            onIntakeCancel={this.handleIntakeCancel}
          />
        )}
      </div>
    );
  }
}

interface EditSession {
  original: GenogramData;
  intake: IntakeForm;
  placedIds: Set<string>;
  partnerOnlyIds: Set<string>;
  keptNames: string[];
}
