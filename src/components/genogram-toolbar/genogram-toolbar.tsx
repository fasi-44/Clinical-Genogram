import { Component, Element, Event, EventEmitter, Listen, Prop, State, h } from '@stencil/core';
import { GENOGRAM_TEMPLATES } from '../../core/templates';
import { Gender } from '../../types';

// Compact inline SVG icons (16x16)
const Icons = {
  undo: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
  redo: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>,
  zoomIn: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
  zoomOut: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
  fit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>,
  layout: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="8" y="14" width="7" height="7" rx="1"/><line x1="6.5" y1="10" x2="11.5" y2="14"/><line x1="17.5" y1="10" x2="11.5" y2="14"/></svg>,
  download: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  upload: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  image: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  clipboard: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  template: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  chevron: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  link: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
};

@Component({ tag: 'genogram-toolbar', styleUrl: 'genogram-toolbar.css', shadow: false })
export class GenogramToolbar {
  @Prop() canUndo: boolean = false;
  @Prop() canRedo: boolean = false;
  @Prop() zoom: number = 1;
  @Prop() linkMode: boolean = false;
  @Prop() hasSelection: boolean = false;
  @Prop() selectionIsRelationship: boolean = false;
  /** Whether the board has people on it (a template then replaces them) */
  @Prop() hasPeople: boolean = false;

  @Element() el!: HTMLElement;

  @State() templatesOpen = false;
  @State() templateGender: Gender = 'male';

  @Event() addPerson!: EventEmitter<{ gender: 'male' | 'female' | 'unknown' }>;
  @Event() addRelationship!: EventEmitter<void>;
  @Event() addChildToSelected!: EventEmitter<{ gender: 'male' | 'female' | 'unknown' }>;
  @Event() toolbarUndo!: EventEmitter<void>;
  @Event() toolbarRedo!: EventEmitter<void>;
  @Event() toolbarZoomIn!: EventEmitter<void>;
  @Event() toolbarZoomOut!: EventEmitter<void>;
  @Event() toolbarFitToView!: EventEmitter<void>;
  @Event() toolbarExportJson!: EventEmitter<void>;
  @Event() toolbarExportPng!: EventEmitter<void>;
  @Event() toolbarImportJson!: EventEmitter<void>;
  @Event() toolbarAutoLayout!: EventEmitter<void>;
  @Event() toolbarOpenIntake!: EventEmitter<void>;
  @Event() toolbarApplyTemplate!: EventEmitter<{ id: string; patientGender: Gender }>;

  // Capture phase: the canvas stops its own clicks from bubbling
  @Listen('pointerdown', { target: 'document', capture: true })
  handleDocumentPointerDown(e: PointerEvent) {
    if (this.templatesOpen && !e.composedPath().includes(this.el.querySelector('.toolbar-templates') as EventTarget)) {
      this.templatesOpen = false;
    }
  }

  @Listen('keydown', { target: 'document' })
  handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') this.templatesOpen = false;
  }

  private applyTemplate(id: string) {
    this.templatesOpen = false;
    this.toolbarApplyTemplate.emit({ id, patientGender: this.templateGender });
  }

  private renderTemplates() {
    return (
      <div class="toolbar-templates">
        <button
          class={{ 'toolbar-btn': true, 'toolbar-btn--active': this.templatesOpen }}
          onClick={() => { this.templatesOpen = !this.templatesOpen; }}
          title="Start from a common family structure"
          aria-haspopup="menu"
          aria-expanded={this.templatesOpen ? 'true' : 'false'}
        >
          {Icons.template()}
          <span>Templates</span>
          {Icons.chevron()}
        </button>
        {this.templatesOpen && (
          <div class="toolbar-templates__menu" role="menu">
            <div class="toolbar-templates__gender">
              <span>Patient is</span>
              {(['male', 'female'] as Gender[]).map(g => (
                <button
                  class={{ 'toolbar-templates__gender-btn': true, 'toolbar-templates__gender-btn--on': this.templateGender === g }}
                  onClick={() => { this.templateGender = g; }}
                >
                  {g === 'male' ? 'Male' : 'Female'}
                </button>
              ))}
            </div>
            {GENOGRAM_TEMPLATES.map(t => (
              <button class="toolbar-templates__item" role="menuitem" onClick={() => this.applyTemplate(t.id)}>
                <span class="toolbar-templates__name">{t.name}</span>
                <span class="toolbar-templates__desc">{t.description(this.templateGender)}</span>
              </button>
            ))}
            {this.hasPeople && (
              <p class="toolbar-templates__note">Replaces the current tree. Undo brings it back.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  render() {
    return (
      <div class="genogram-toolbar">
        {/* Add Person */}
        <div class="toolbar-group">
          <span class="toolbar-label">Add</span>
          <button class="toolbar-btn" onClick={() => this.addPerson.emit({ gender: 'male' })} title="Add Male">
            <svg width="18" height="18" viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="2.5" ry="2.5" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5"/></svg>
          </button>
          <button class="toolbar-btn" onClick={() => this.addPerson.emit({ gender: 'female' })} title="Add Female">
            <svg width="18" height="18" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="#fce7f3" stroke="#ec4899" stroke-width="1.5"/></svg>
          </button>
          <button class="toolbar-btn" onClick={() => this.addPerson.emit({ gender: 'unknown' })} title="Add Unknown Gender">
            <svg width="18" height="18" viewBox="0 0 20 20"><polygon points="10,2 18,10 10,18 2,10" fill="#f3f4f6" stroke="#6b7280" stroke-width="1.5"/></svg>
          </button>
        </div>

        {/* Link */}
        <div class="toolbar-group">
          <button
            class={{'toolbar-btn': true, 'toolbar-btn--active': this.linkMode}}
            onClick={() => this.addRelationship.emit()}
            title="Link two persons: click this, then click two persons on canvas"
          >
            {Icons.link()}
            <span>{this.linkMode ? 'Linking...' : 'Link'}</span>
          </button>
        </div>

        {/* Add Child */}
        {this.selectionIsRelationship && (
          <div class="toolbar-group toolbar-group--highlight">
            <span class="toolbar-label">Child</span>
            <button class="toolbar-btn" onClick={() => this.addChildToSelected.emit({ gender: 'male' })} title="Add Male Child">
              <svg width="16" height="20" viewBox="0 0 16 20">
                <rect x="1" y="6" width="10" height="10" rx="1.5" ry="1.5" fill="#dbeafe" stroke="#3b82f6" stroke-width="1"/>
                <line x1="6" y1="0" x2="6" y2="6" stroke="#6b7280" stroke-width="1.5"/>
              </svg>
            </button>
            <button class="toolbar-btn" onClick={() => this.addChildToSelected.emit({ gender: 'female' })} title="Add Female Child">
              <svg width="16" height="20" viewBox="0 0 16 20">
                <circle cx="6" cy="12" r="5" fill="#fce7f3" stroke="#ec4899" stroke-width="1"/>
                <line x1="6" y1="0" x2="6" y2="7" stroke="#6b7280" stroke-width="1.5"/>
              </svg>
            </button>
          </div>
        )}

        <div class="toolbar-separator" />

        {/* Undo / Redo */}
        <div class="toolbar-group">
          <button class="toolbar-btn toolbar-btn--icon" onClick={() => this.toolbarUndo.emit()} disabled={!this.canUndo} title="Undo">
            {Icons.undo()}
          </button>
          <button class="toolbar-btn toolbar-btn--icon" onClick={() => this.toolbarRedo.emit()} disabled={!this.canRedo} title="Redo">
            {Icons.redo()}
          </button>
        </div>

        <div class="toolbar-separator" />

        {/* Zoom */}
        <div class="toolbar-group">
          <button class="toolbar-btn toolbar-btn--icon" onClick={() => this.toolbarZoomOut.emit()} title="Zoom Out">
            {Icons.zoomOut()}
          </button>
          <span class="toolbar-zoom-level">{Math.round(this.zoom * 100)}%</span>
          <button class="toolbar-btn toolbar-btn--icon" onClick={() => this.toolbarZoomIn.emit()} title="Zoom In">
            {Icons.zoomIn()}
          </button>
          <button class="toolbar-btn toolbar-btn--icon" onClick={() => this.toolbarFitToView.emit()} title="Fit to View">
            {Icons.fit()}
          </button>
        </div>

        <div class="toolbar-separator" />

        {/* Actions */}
        <div class="toolbar-group">
          <button class="toolbar-btn toolbar-btn--icon" onClick={() => this.toolbarAutoLayout.emit()} title="Auto Layout">
            {Icons.layout()}
          </button>
          <button class="toolbar-btn" onClick={() => this.toolbarExportJson.emit()} title="Export JSON">
            {Icons.download()}
            <span>JSON</span>
          </button>
          <button class="toolbar-btn" onClick={() => this.toolbarExportPng.emit()} title="Export PNG">
            {Icons.image()}
            <span>PNG</span>
          </button>
          <button class="toolbar-btn" onClick={() => this.toolbarImportJson.emit()} title="Import JSON">
            {Icons.upload()}
            <span>Import</span>
          </button>
        </div>

        {this.linkMode && (
          <div class="toolbar-status">
            <span class="toolbar-status__dot" />
            Click two people on the board to link them
          </div>
        )}

        {/* Build the tree: right-hand corner */}
        <div class="toolbar-group toolbar-group--end">
          {this.renderTemplates()}
          <button
            class="toolbar-btn toolbar-btn--primary"
            onClick={() => this.toolbarOpenIntake.emit()}
            title="Generate the genogram from a family-history questionnaire"
          >
            {Icons.clipboard()}
            <span>Generate</span>
          </button>
        </div>
      </div>
    );
  }
}
