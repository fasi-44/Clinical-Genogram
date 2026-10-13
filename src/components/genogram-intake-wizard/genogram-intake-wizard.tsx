import { Component, Prop, State, Event, EventEmitter, Element, Listen, h } from '@stencil/core';
import {
  ClinicalCondition,
  Gender,
  IntakeChild,
  IntakeConsanguinity,
  IntakeForm,
  IntakeGrandparents,
  IntakePartner,
  IntakeRelative,
  PersonType,
  RelationshipType,
  SiblingParentage,
  TwinType,
  VitalStatus,
} from '../../types';
import { buildGenogramFromIntake } from '../../core/KinshipBuilder';
import { GenogramState } from '../../core/GenogramState';
import { LayoutEngine } from '../../core/LayoutEngine';
import { SelectionManager } from '../../core/SelectionManager';
import { DragManager } from '../../core/DragManager';
import { ZoomPanManager } from '../../core/ZoomPanManager';
import { COMMON_CONDITIONS, FIT_MAX_ZOOM } from '../../utils/constants';
import { contentBounds } from '../../utils/bounds';
import { RELATION_OPTIONS } from '../../utils/consanguinity';
import { generateId } from '../../utils/id-generator';

const STEPS = ['Patient', 'Parents', 'Siblings', 'Grandparents', 'Partners & children', 'Aunts, uncles & cousins', 'Review'];
const REVIEW_STEP = STEPS.length - 1;
const AUNTS_STEP = STEPS.indexOf('Aunts, uncles & cousins');

const RELATIONSHIP_OPTIONS: [RelationshipType, string][] = [
  ['marriage', 'Married'],
  ['divorce', 'Divorced'],
  ['separation', 'Separated'],
  ['cohabitation', 'Living together'],
  ['engagement', 'Engaged'],
  ['committed', 'Committed relationship'],
  ['casual', 'Casual relationship'],
];

const CHILD_TYPE_OPTIONS: [PersonType, string][] = [
  ['standard', 'Biological'],
  ['adopted', 'Adopted'],
  ['foster', 'Foster'],
  ['pregnancy', 'Current pregnancy'],
  ['miscarriage', 'Miscarriage'],
  ['stillbirth', 'Stillbirth'],
  ['abortion', 'Abortion'],
];

const GRANDPARENT_SLOTS: { key: keyof IntakeGrandparents; label: string; gender: Gender }[] = [
  { key: 'paternalGrandfather', label: "Patient's grandfather (father's side)", gender: 'male' },
  { key: 'paternalGrandmother', label: "Patient's grandmother (father's side)", gender: 'female' },
  { key: 'maternalGrandfather', label: "Patient's grandfather (mother's side)", gender: 'male' },
  { key: 'maternalGrandmother', label: "Patient's grandmother (mother's side)", gender: 'female' },
];

const CONDITION_LIST_ID = 'genogram-intake-conditions';

/** [male, female, unknown] labels per generation, starting at the children of a couple */
type LabelChain = [string, string, string][];

/** Generations below the patient */
const DESCENDANT_LABELS: LabelChain = [
  ['Son', 'Daughter', 'Child'],
  ['Grandson', 'Granddaughter', 'Grandchild'],
  ['Great-grandson', 'Great-granddaughter', 'Great-grandchild'],
];

/** Siblings' children (nephews and nieces), then their children */
const NIECE_LABELS: LabelChain = [
  ['Nephew', 'Niece', 'Nephew/niece'],
  ['Great-nephew', 'Great-niece', 'Great-nephew/niece'],
];

/** A parent's siblings, then their children (cousins) and grandchildren */
const AUNT_UNCLE_LABELS: LabelChain = [
  ['Uncle', 'Aunt', 'Aunt/uncle'],
  ['Male cousin', 'Female cousin', 'Cousin'],
  ["Cousin's son", "Cousin's daughter", "Cousin's child"],
];

/** Key so other answers (e.g. "my wife is this cousin") can refer to an entry */
const newKey = () => generateId('intake');

/** Personal details that move between a partner card and a relative's card when they are linked */
const DETAIL_FIELDS = ['fullName', 'gender', 'unknown', 'status', 'age', 'ageAtDeath', 'causeOfDeath', 'conditions', 'notes'] as const;

/** Entry in the questionnaire that may hold partners and children below it */
type FamilyEntry = IntakeRelative & { partners?: IntakePartner[]; children?: IntakeChild[] };

interface LinkCandidate {
  key: string;
  name: string;
  /** How they are related to the patient, e.g. "cousin" or "half uncle" */
  role: string;
  /** Heading the option is listed under */
  group: string;
}

interface RelativeOptions {
  /** Show a gender picker (fixed-gender slots like "father" hide it) */
  genderEditable?: boolean;
  /** Offer the "nothing known" placeholder checkbox */
  allowUnknown?: boolean;
}

/**
 * Guided family-history questionnaire. Collects an IntakeForm step by step,
 * previews the generated genogram, and emits `intakeSubmit` with the answers.
 */
@Component({
  tag: 'genogram-intake-wizard',
  styleUrl: 'genogram-intake-wizard.css',
  shadow: false,
})
export class GenogramIntakeWizard {
  @Element() el!: HTMLElement;

  /** Known conditions offered as suggestions (merged with common ones) */
  @Prop() availableConditions: ClinicalCondition[] = [];
  /** Number of persons in the current genogram; > 0 shows a replace warning */
  @Prop() existingCount: number = 0;
  /** Answers to start from (the previous run, or the board in edit mode) */
  @Prop() initialIntake?: IntakeForm;
  /** 'edit' when the answers were read from the tree on the board */
  @Prop() mode: 'new' | 'edit' = 'new';
  /** Edit mode: people on the board the questionnaire doesn't cover (kept as they are) */
  @Prop() keptPeople: string[] = [];
  /** When set, ask who the patient is before anything else */
  @Prop() patientChoices: { id: string; name: string; gender: Gender; age?: number }[] = [];

  @Event() intakeSubmit!: EventEmitter<IntakeForm>;
  @Event() intakeCancel!: EventEmitter<IntakeForm>;
  /** The person chosen as the patient (edit mode, when nobody was marked) */
  @Event() intakePickPatient!: EventEmitter<string>;

  @State() intake: IntakeForm = { patient: {}, father: {}, mother: {}, siblings: [], partners: [], grandparents: {} };
  @State() step: number = 0;

  // Preview (review step) — rebuilt each time the review step is entered
  private previewKey = 0;
  private previewState: GenogramState | null = null;
  private previewSelection = new SelectionManager();
  private previewDrag = new DragManager();
  private previewZoom = new ZoomPanManager();
  private previewPeople = 0;
  private previewPlaceholders = 0;
  private needsPreviewFit = false;

  componentWillLoad() {
    if (this.initialIntake) this.intake = structuredClone(this.initialIntake);
  }

  componentDidLoad() {
    // Move focus into the dialog so keyboard users start inside it
    (this.el.querySelector('.intake-wizard') as HTMLElement | null)?.focus();
  }

  /** Escape closes the dialog even when focus is outside it */
  @Listen('keydown', { target: 'document' })
  handleDocumentKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') this.intakeCancel.emit(this.intake);
  }

  componentDidRender() {
    if (this.needsPreviewFit) {
      this.needsPreviewFit = false;
      requestAnimationFrame(() => this.fitPreview());
    }
  }

  // ---------------------------------------------------------------------------
  // State helpers
  // ---------------------------------------------------------------------------

  private mutate(fn: (draft: IntakeForm) => void) {
    const draft = structuredClone(this.intake);
    fn(draft);
    this.intake = draft;
  }

  private goTo(step: number) {
    this.step = Math.max(0, Math.min(REVIEW_STEP, step));
    if (this.step === REVIEW_STEP) this.buildPreview();
  }

  private buildPreview() {
    const data = buildGenogramFromIntake(this.intake, { availableConditions: this.availableConditions });
    new LayoutEngine().calculateLayout(data.persons, data.relationships);
    this.previewState = new GenogramState(data);
    this.previewSelection = new SelectionManager();
    this.previewDrag = new DragManager();
    this.previewZoom = new ZoomPanManager();
    this.previewPeople = data.persons.length;
    this.previewPlaceholders = data.persons.filter(p => p.isPlaceholder).length;
    this.previewKey++;
    this.needsPreviewFit = true;
  }

  private fitPreview() {
    const svg = this.el.querySelector('.intake-wizard__preview .genogram-canvas');
    if (!svg || !this.previewState) return;
    const rect = svg.getBoundingClientRect();
    this.previewZoom.fitToView(contentBounds(this.previewState.getPersons()), rect.width, rect.height, 24, FIT_MAX_ZOOM);
  }

  private conditionSuggestions(): string[] {
    const names = new Map<string, string>();
    const add = (n: string) => {
      const key = n.trim().toLowerCase();
      if (key && !names.has(key)) names.set(key, n.trim());
    };
    this.availableConditions.forEach(c => add(c.name));
    COMMON_CONDITIONS.forEach(add);
    const fromForm = (r?: IntakeRelative) => r?.conditions?.forEach(add);
    const i = this.intake;
    const walkPartners = (partners?: IntakePartner[]) =>
      (partners ?? []).forEach(p => {
        fromForm(p);
        (p.children ?? []).forEach(c => {
          fromForm(c);
          walkPartners(c.partners);
        });
      });
    [i.patient, i.father, i.mother, ...(i.siblings ?? [])].forEach(fromForm);
    walkPartners(i.partners);
    (i.siblings ?? []).forEach(sib => walkPartners(sib.partners));
    [...(i.paternalAuntsUncles ?? []), ...(i.maternalAuntsUncles ?? [])].forEach(a => {
      fromForm(a);
      walkPartners(a.partners);
    });
    Object.values(i.grandparents ?? {}).forEach(fromForm);
    return [...names.values()].sort((a, b) => a.localeCompare(b));
  }

  // ---------------------------------------------------------------------------
  // Field renderers
  // ---------------------------------------------------------------------------

  private renderRelative(
    rel: IntakeRelative,
    get: (d: IntakeForm) => IntakeRelative,
    opts: RelativeOptions = {},
  ) {
    const set = (field: keyof IntakeRelative, value: any) =>
      this.mutate(d => {
        (get(d) as any)[field] = value;
      });
    const status: VitalStatus = rel.status ?? 'alive';

    return (
      <div class="intake-fields">
        {opts.allowUnknown && (
          <label class="intake-check">
            <input type="checkbox" checked={!!rel.unknown} onChange={(e: Event) => set('unknown', (e.target as HTMLInputElement).checked)} />
            Nothing known about this person
          </label>
        )}
        {!rel.unknown && [
          <div class="intake-row">
            <label class="intake-field intake-field--wide">
              <span>Full name</span>
              <input type="text" value={rel.fullName ?? ''} onInput={(e: Event) => set('fullName', (e.target as HTMLInputElement).value)} />
            </label>
            {opts.genderEditable && (
              <label class="intake-field intake-field--narrow">
                <span>Gender</span>
                <select onChange={(e: Event) => set('gender', (e.target as HTMLSelectElement).value as Gender)}>
                  <option value="female" selected={rel.gender === 'female'}>Female</option>
                  <option value="male" selected={rel.gender === 'male'}>Male</option>
                  <option value="unknown" selected={!rel.gender || rel.gender === 'unknown'}>Unknown</option>
                </select>
              </label>
            )}
          </div>,
          <div class="intake-row">
            <label class="intake-field intake-field--narrow">
              <span>Status</span>
              <select onChange={(e: Event) => set('status', (e.target as HTMLSelectElement).value as VitalStatus)}>
                <option value="alive" selected={status === 'alive'}>Living</option>
                <option value="deceased" selected={status === 'deceased'}>Deceased</option>
                <option value="unknown" selected={status === 'unknown'}>Unknown</option>
              </select>
            </label>
            {status === 'deceased' ? [
              <label class="intake-field intake-field--narrow">
                <span>Age at death</span>
                <input type="number" min="0" max="130" value={rel.ageAtDeath ?? ''} onInput={(e: Event) => set('ageAtDeath', parseAge((e.target as HTMLInputElement).value))} />
              </label>,
              <label class="intake-field">
                <span>Cause of death</span>
                <input type="text" value={rel.causeOfDeath ?? ''} onInput={(e: Event) => set('causeOfDeath', (e.target as HTMLInputElement).value)} />
              </label>,
            ] : (
              <label class="intake-field intake-field--narrow">
                <span>Age</span>
                <input type="number" min="0" max="130" value={rel.age ?? ''} onInput={(e: Event) => set('age', parseAge((e.target as HTMLInputElement).value))} />
              </label>
            )}
          </div>,
          this.renderConditions(rel.conditions ?? [], list => set('conditions', list)),
        ]}
      </div>
    );
  }

  private renderConditions(conditions: string[], onChange: (list: string[]) => void) {
    const add = (input: HTMLInputElement) => {
      const name = input.value.trim();
      input.value = '';
      if (!name || conditions.some(c => c.toLowerCase() === name.toLowerCase())) return;
      onChange([...conditions, name]);
    };
    return (
      <div class="intake-conditions">
        <span class="intake-conditions__label">Conditions</span>
        <div class="intake-conditions__chips">
          {conditions.map(c => (
            <span class="intake-chip">
              {c}
              <button type="button" aria-label={`Remove ${c}`} onClick={() => onChange(conditions.filter(x => x !== c))}>&times;</button>
            </span>
          ))}
          <input
            class="intake-conditions__input"
            type="text"
            list={CONDITION_LIST_ID}
            placeholder="Type or pick a condition, then Enter"
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add(e.target as HTMLInputElement);
              }
            }}
            onChange={(e: Event) => add(e.target as HTMLInputElement)}
          />
        </div>
      </div>
    );
  }

  private renderCard(title: string, body: any, onRemove?: () => void, extraClass = '') {
    return (
      <div class={`intake-card ${extraClass}`}>
        <div class="intake-card__header">
          <span class="intake-card__title">{title}</span>
          {onRemove && (
            <button type="button" class="intake-link intake-link--danger" onClick={onRemove}>Remove</button>
          )}
        </div>
        {body}
      </div>
    );
  }

  private renderRelationshipSelect(value: RelationshipType | undefined, onChange: (t: RelationshipType) => void, label: string) {
    const current = value ?? 'marriage';
    return (
      <label class="intake-field intake-field--narrow">
        <span>{label}</span>
        <select onChange={(e: Event) => onChange((e.target as HTMLSelectElement).value as RelationshipType)}>
          {RELATIONSHIP_OPTIONS.map(([v, l]) => <option value={v} selected={current === v}>{l}</option>)}
        </select>
      </label>
    );
  }

  private renderConsanguinitySelect(
    value: IntakeConsanguinity | undefined,
    onChange: (v: IntakeConsanguinity) => void,
    label: string,
  ) {
    const current = value ?? 'none';
    return (
      <label class="intake-field intake-field--medium">
        <span>{label}</span>
        <select onChange={(e: Event) => onChange((e.target as HTMLSelectElement).value as IntakeConsanguinity)}>
          <option value="none" selected={current === 'none'}>No</option>
          {RELATION_OPTIONS.map(([v, l]) => <option value={v} selected={current === v}>{l}</option>)}
        </select>
      </label>
    );
  }

  /**
   * Relatives already entered that a partner can be linked to: aunts and
   * uncles, cousins and their children, and nephews and nieces.
   */
  private linkCandidates(): LinkCandidate[] {
    const out: LinkCandidate[] = [];
    const add = (e: IntakeRelative, role: string, group: string, fallback: string) => {
      if (e.key) out.push({ key: e.key, name: e.fullName || fallback, role, group });
    };
    const sides: [IntakeChild[] | undefined, string, string][] = [
      [this.intake.paternalAuntsUncles, "father's side", "Father's side"],
      [this.intake.maternalAuntsUncles, "mother's side", "Mother's side"],
    ];
    for (const [list, side, group] of sides) {
      (list ?? []).forEach((a, i) => {
        const half = (a.parentage ?? 'both') !== 'both' ? 'half ' : '';
        const role = a.gender === 'female' ? 'aunt' : a.gender === 'male' ? 'uncle' : 'aunt/uncle';
        add(a, `${half}${role}, ${side}`, group, `Unnamed ${role} ${i + 1}`);
        (a.partners ?? []).forEach(p =>
          (p.children ?? []).forEach((c, ci) => {
            add(c, `${half}cousin, ${side}`, group, `Unnamed cousin ${ci + 1}`);
            (c.partners ?? []).forEach(cp =>
              (cp.children ?? []).forEach((cc, cci) =>
                add(cc, `first cousin once removed, ${side}`, group, `Unnamed relative ${cci + 1}`),
              ),
            );
          }),
        );
      });
    }
    (this.intake.siblings ?? []).forEach(sib =>
      (sib.partners ?? []).forEach(p =>
        (p.children ?? []).forEach((c, ci) => {
          const role = c.gender === 'female' ? 'niece' : c.gender === 'male' ? 'nephew' : 'nephew/niece';
          add(c, role, 'Nephews & nieces', `Unnamed ${role} ${ci + 1}`);
        }),
      ),
    );
    return out;
  }

  /** Keys of an entry and everyone below it (their partners' children, and so on) */
  private subtreeKeys(entry: FamilyEntry): Set<string> {
    const keys = new Set<string>();
    const walk = (e: FamilyEntry) => {
      if (e.key) keys.add(e.key);
      for (const p of e.partners ?? []) for (const c of p.children ?? []) walk(c);
    };
    walk(entry);
    return keys;
  }

  /** The entry with this key anywhere in the given draft */
  private findRelative(d: IntakeForm, key: string): IntakeRelative | undefined {
    let found: IntakeRelative | undefined;
    const walkChildren = (list?: IntakeChild[]) => list?.forEach(walkEntry);
    const walkEntry = (e: FamilyEntry) => {
      if (found) return;
      if (e.key === key) found = e;
      for (const p of e.partners ?? []) walkChildren(p.children);
    };
    walkChildren(d.paternalAuntsUncles);
    walkChildren(d.maternalAuntsUncles);
    (d.siblings ?? []).forEach(walkEntry);
    for (const p of d.partners ?? []) walkChildren(p.children);
    return found;
  }

  /** Copy (or move) a person's details from one entry to another */
  private copyDetails(from: IntakeRelative, to: IntakeRelative, move = false) {
    for (const f of DETAIL_FIELDS) {
      const value = structuredClone(from[f]);
      if (value === undefined) delete to[f];
      else (to as any)[f] = value;
      if (move) delete from[f];
    }
  }

  /**
   * Undo a partner link: the patient's partner gets the relative's details
   * back so nothing typed is lost, and becomes a separate person again.
   */
  private unlinkPartner(d: IntakeForm, key: string | undefined) {
    if (!key) return;
    const partner = (d.partners ?? []).find(p => p.linkedRelativeKey === key);
    if (!partner) return;
    const relative = this.findRelative(d, key);
    if (relative) this.copyDetails(relative, partner);
    delete partner.linkedRelativeKey;
  }

  /** Unlink every patient partner that points at an entry inside this subtree (before removing it) */
  private unlinkWithin(d: IntakeForm, entry: FamilyEntry) {
    this.unlinkPartner(d, entry.key);
    for (const p of entry.partners ?? []) this.unlinkWithin(d, p);
    for (const c of entry.children ?? []) this.unlinkWithin(d, c);
  }

  // ---------------------------------------------------------------------------
  // Steps
  // ---------------------------------------------------------------------------

  private renderEditBanner() {
    if (this.mode !== 'edit') return null;
    return (
      <div class="intake-edit-banner">
        <strong>Editing the genogram on the board.</strong> Change any answer, add or remove people, then press
        <em> Update genogram</em> on the last step.
        {this.keptPeople.length > 0 && (
          <span>
            {' '}
            {this.keptPeople.length} {this.keptPeople.length === 1 ? 'person is' : 'people are'} not part of the questionnaire
            and will be kept as they are ({this.keptPeople.slice(0, 4).join(', ')}
            {this.keptPeople.length > 4 ? `, and ${this.keptPeople.length - 4} more` : ''}).
          </span>
        )}
      </div>
    );
  }

  private renderPatientPicker() {
    const choices = [...this.patientChoices].sort((a, b) => a.name.localeCompare(b.name));
    return [
      <p class="intake-hint">
        Who is the patient? The questionnaire is filled in from the board, seen from the patient. You can also mark the
        patient yourself with the Proband box in a person's details.
      </p>,
      <div class="intake-picker">
        {choices.map(c => (
          <button type="button" class="intake-picker__item" onClick={() => this.intakePickPatient.emit(c.id)}>
            <span class={`intake-picker__shape intake-picker__shape--${c.gender}`} aria-hidden="true" />
            <span class="intake-picker__name">{c.name}</span>
            {c.age !== undefined && <span class="intake-picker__age">{c.age}y</span>}
          </button>
        ))}
      </div>,
    ];
  }

  private renderPatientStep() {
    return [
      this.renderEditBanner(),
      <p class="intake-hint">Start with the patient. Everyone else is recorded relative to them.</p>,
      this.renderCard('Patient', this.renderRelative(this.intake.patient, d => d.patient, { genderEditable: true })),
    ];
  }

  private renderParentStep() {
    const parent = (key: 'father' | 'mother', label: string) => {
      const rel = this.intake[key];
      if (!rel) {
        return (
          <button type="button" class="intake-add" onClick={() => this.mutate(d => { d[key] = {}; })}>
            + Add {label.toLowerCase()}
          </button>
        );
      }
      return this.renderCard(
        label,
        this.renderRelative(rel, d => d[key]!, { allowUnknown: true }),
        () => this.mutate(d => { delete d[key]; }),
      );
    };

    return [
      <p class="intake-hint">Biological parents. If a parent is unknown, tick "Nothing known" and a placeholder is drawn.</p>,
      <div class="intake-grid">
        {parent('father', 'Father')}
        {parent('mother', 'Mother')}
      </div>,
      (this.intake.father || this.intake.mother) && (
        <div class="intake-row">
          {this.renderRelationshipSelect(
            this.intake.parentsRelationship,
            t => this.mutate(d => { d.parentsRelationship = t; }),
            "Parents' relationship",
          )}
          {this.renderConsanguinitySelect(
            this.intake.parentsConsanguinity,
            v => this.mutate(d => { d.parentsConsanguinity = v; }),
            'Are the parents related by blood?',
          )}
        </div>
      ),
    ];
  }

  private renderSiblingStep() {
    const siblings = this.intake.siblings ?? [];
    const addSibling = (gender: Gender) =>
      this.mutate(d => { d.siblings = [...(d.siblings ?? []), { gender }]; });

    return [
      <p class="intake-hint">Brothers and sisters, including half-siblings. List them in any order; if every age is filled in they are drawn oldest to youngest. Each can have partners and children (the patient's nephews and nieces).</p>,
      siblings.map((s, i) => this.renderCard(
        s.fullName || `${s.gender === 'male' ? 'Brother' : s.gender === 'female' ? 'Sister' : 'Sibling'} ${i + 1}`,
        [
          this.renderRelative(s, d => d.siblings![i], { genderEditable: true }),
          <div class="intake-row">
            <label class="intake-field intake-field--narrow">
              <span>Shares</span>
              <select onChange={(e: Event) => this.mutate(d => { d.siblings![i].parentage = (e.target as HTMLSelectElement).value as SiblingParentage; })}>
                <option value="both" selected={(s.parentage ?? 'both') === 'both'}>Both parents</option>
                <option value="mother" selected={s.parentage === 'mother'}>Mother only (half)</option>
                <option value="father" selected={s.parentage === 'father'}>Father only (half)</option>
              </select>
            </label>
            {(s.parentage ?? 'both') === 'both' && (
              <label class="intake-field intake-field--narrow">
                <span>Twin of patient?</span>
                <select onChange={(e: Event) => this.mutate(d => { d.siblings![i].twin = (e.target as HTMLSelectElement).value as TwinType; })}>
                  <option value="none" selected={(s.twin ?? 'none') === 'none'}>No</option>
                  <option value="fraternal" selected={s.twin === 'fraternal'}>Twin</option>
                  <option value="identical" selected={s.twin === 'identical'}>Identical twin</option>
                </select>
              </label>
            )}
          </div>,
          <div class="intake-subsection">
            {(s.partners?.length ?? 0) > 0 && (
              <span class="intake-subsection__title">{s.fullName || 'Their'}{s.fullName ? "'s" : ''} partners &amp; children (the patient's nephews and nieces)</span>
            )}
            {this.renderPartnerList(
              s,
              d => (d.siblings![i].partners ??= []),
              0,
              s.fullName || (s.gender === 'male' ? 'brother' : s.gender === 'female' ? 'sister' : 'sibling'),
              NIECE_LABELS,
            )}
          </div>,
        ],
        () => this.mutate(d => { this.unlinkWithin(d, { partners: d.siblings![i].partners }); d.siblings!.splice(i, 1); }),
      )),
      <div class="intake-actions">
        <button type="button" class="intake-add" onClick={() => addSibling('male')}>+ Add brother</button>
        <button type="button" class="intake-add" onClick={() => addSibling('female')}>+ Add sister</button>
      </div>,
    ];
  }

  private renderPartnerStep() {
    return [
      <p class="intake-hint">
        The patient's current and past partners and the children with each. If a partner is also a relative
        (for example a cousin entered in the "Aunts, uncles &amp; cousins" step), link them so the tree shows how they are related.
        Children can have their own partners and children, for grandchildren and great-grandchildren.
      </p>,
      this.renderPartnerList(this.intake.patient, d => (d.partners ??= []), 0, null, DESCENDANT_LABELS),
    ];
  }

  /**
   * Partners of `owner` with an add button. `depth` indexes `labels` for the
   * children below these couples. `ownerLabel` is null for the patient, whose
   * partners can be linked to relatives already entered.
   */
  private renderPartnerList(
    owner: IntakeRelative,
    getList: (d: IntakeForm) => IntakePartner[],
    depth: number,
    ownerLabel: string | null,
    labels: LabelChain,
  ) {
    const partners = getList(structuredClone(this.intake));
    const defaultGender: Gender = owner.gender === 'male' ? 'female' : owner.gender === 'female' ? 'male' : 'unknown';
    return [
      partners.map((p, pi) => this.renderPartnerCard(p, getList, pi, depth, labels, ownerLabel, owner)),
      <div class="intake-actions">
        <button
          type="button"
          class="intake-add"
          onClick={() => this.mutate(d => { getList(d).push({ gender: defaultGender, children: [] }); })}
        >
          {ownerLabel ? `+ Add ${ownerLabel}'s partner` : '+ Add partner'}
        </button>
      </div>,
    ];
  }

  private renderPartnerCard(
    p: IntakePartner,
    getList: (d: IntakeForm) => IntakePartner[],
    pi: number,
    depth: number,
    labels: LabelChain,
    ownerLabel: string | null,
    owner: FamilyEntry,
  ) {
    const get = (d: IntakeForm) => getList(d)[pi];
    const [son, daughter] = labels[depth];
    const addChild = (gender: Gender) => this.mutate(d => { (get(d).children ??= []).push({ gender, key: newKey() }); });
    // Anyone already entered can be this partner, except the person themselves and their own descendants
    const excluded = this.subtreeKeys(owner);
    for (const c of p.children ?? []) this.subtreeKeys(c).forEach(k => excluded.add(k));
    const candidates = this.linkCandidates().filter(c => !excluded.has(c.key));
    const groups = [...new Set(candidates.map(c => c.group))];
    const linked = p.linkedRelativeKey ? candidates.find(c => c.key === p.linkedRelativeKey) : undefined;
    // Partners of the patient's aunts/uncles have the patient's cousins as children,
    // so a partner already entered in step 5 can be placed here as one of them
    const cousinFamily = labels === AUNT_UNCLE_LABELS && depth === 1;
    const unlinkedPatientPartners = cousinFamily
      ? (this.intake.partners ?? []).map((pp, i) => ({ pp, i })).filter(({ pp }) => !pp.linkedRelativeKey)
      : [];

    return this.renderCard(
      linked?.name || p.fullName || (p.unknown ? 'Unknown partner' : `Partner ${pi + 1}`),
      [
        <div class="intake-row">
          {this.renderRelationshipSelect(p.relationshipType, t => this.mutate(d => { get(d).relationshipType = t; }), 'Relationship')}
          {candidates.length > 0 && (
            <label class="intake-field intake-field--medium">
              <span>Already in the family?</span>
              <select
                onChange={(e: Event) => {
                  const v = (e.target as HTMLSelectElement).value;
                  this.mutate(d => {
                    if (v) {
                      this.unlinkPartner(d, get(d).linkedRelativeKey);
                      get(d).linkedRelativeKey = v;
                    } else {
                      this.unlinkPartner(d, get(d).linkedRelativeKey);
                    }
                  });
                }}
              >
                <option value="" selected={!linked}>No, a new person</option>
                {groups.map(g => (
                  <optgroup label={g}>
                    {candidates.filter(c => c.group === g).map(c => (
                      <option value={c.key} selected={linked?.key === c.key}>{`${c.name} (${c.role.split(',')[0]})`}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}
        </div>,
        linked ? (
          <p class="intake-linked">
            {linked.name} is already in the family (the patient's {linked.role}). Their details are edited where they
            were entered, and the blood relationship is worked out from the tree.
          </p>
        ) : [
          (ownerLabel === null || (labels === NIECE_LABELS && depth === 0)) && candidates.length === 0 && (
            <div class="intake-linked intake-linked--hint">
              <span>Is this partner also a relative, for example a cousin? Add them in the uncle's or aunt's family and their details are carried over.</span>
              <button type="button" class="intake-link" onClick={() => this.goTo(AUNTS_STEP)}>Go to Aunts, uncles &amp; cousins</button>
            </div>
          ),
          this.renderRelative(p, get, { genderEditable: true, allowUnknown: true }),
          <div class="intake-row">
            {this.renderConsanguinitySelect(
              p.consanguinity,
              v => this.mutate(d => { get(d).consanguinity = v; }),
              `Related to ${ownerLabel ?? 'the patient'} by blood?`,
            )}
          </div>,
        ],
        <div class="intake-subsection">
          <span class="intake-subsection__title">Children with this partner</span>
          {(p.children ?? []).map((c, ci) => this.renderChildCard(c, d => get(d).children!, ci, depth, labels))}
          <div class="intake-actions">
            <button type="button" class="intake-add" onClick={() => addChild('male')}>+ Add {son.toLowerCase()}</button>
            <button type="button" class="intake-add" onClick={() => addChild('female')}>+ Add {daughter.toLowerCase()}</button>
            {unlinkedPatientPartners.map(({ pp, i }) => {
              const name = pp.fullName || `Partner ${i + 1}`;
              const role = pp.gender === 'male' ? 'son' : pp.gender === 'female' ? 'daughter' : 'child';
              return (
                <button
                  type="button"
                  class="intake-add intake-add--link"
                  onClick={() =>
                    this.mutate(d => {
                      // Move the partner's details into a new cousin entry and link the two
                      const partner = d.partners![i];
                      const cousin: IntakeChild = { key: newKey() };
                      this.copyDetails(partner, cousin, true);
                      (get(d).children ??= []).push(cousin);
                      partner.linkedRelativeKey = cousin.key;
                      delete partner.consanguinity;
                    })
                  }
                >
                  + {name} (patient's partner) is their {role}
                </button>
              );
            })}
          </div>
        </div>,
      ],
      () => this.mutate(d => { this.unlinkWithin(d, getList(d)[pi]); getList(d).splice(pi, 1); }),
      ownerLabel !== null ? 'intake-card--nested' : '',
    );
  }

  private renderChildCard(
    c: IntakeChild,
    getChildren: (d: IntakeForm) => IntakeChild[],
    ci: number,
    depth: number,
    labels: LabelChain,
    parentSide?: 'father' | 'mother',
  ) {
    const get = (d: IntakeForm) => getChildren(d)[ci];
    const [male, female, other] = labels[depth];
    const label = c.gender === 'male' ? male : c.gender === 'female' ? female : other;
    const canHaveDescendants = depth + 1 < labels.length;
    const partnerIndex = c.key ? (this.intake.partners ?? []).findIndex(pp => pp.linkedRelativeKey === c.key) : -1;
    return this.renderCard(
      c.fullName || `${label} ${ci + 1}`,
      [
        partnerIndex >= 0 && (
          <div class="intake-linked intake-linked--hint">
            <span>Also the patient's partner (partner {partnerIndex + 1} in "Partners &amp; children"). Edit their details here.</span>
            <button type="button" class="intake-link" onClick={() => this.mutate(d => this.unlinkPartner(d, c.key))}>
              Unlink
            </button>
          </div>
        ),
        <div class="intake-row">
          <label class="intake-field intake-field--narrow">
            <span>Type</span>
            <select onChange={(e: Event) => this.mutate(d => { get(d).type = (e.target as HTMLSelectElement).value as PersonType; })}>
              {CHILD_TYPE_OPTIONS.map(([v, l]) => <option value={v} selected={(c.type ?? 'standard') === v}>{l}</option>)}
            </select>
          </label>
          {parentSide && (
            <label class="intake-field intake-field--medium">
              <span>Shares parents with the {parentSide}?</span>
              <select onChange={(e: Event) => this.mutate(d => { get(d).parentage = (e.target as HTMLSelectElement).value as SiblingParentage; })}>
                <option value="both" selected={(c.parentage ?? 'both') === 'both'}>Yes, both (full {c.gender === 'female' ? 'sister' : c.gender === 'male' ? 'brother' : 'sibling'})</option>
                <option value="father" selected={c.parentage === 'father'}>Only the grandfather (half)</option>
                <option value="mother" selected={c.parentage === 'mother'}>Only the grandmother (half)</option>
              </select>
            </label>
          )}
        </div>,
        this.renderRelative(c, get, { genderEditable: true }),
        canHaveDescendants && (
          <div class="intake-subsection">
            {(c.partners?.length ?? 0) > 0 && (
              <span class="intake-subsection__title">{c.fullName || label}'s partners &amp; children</span>
            )}
            {this.renderPartnerList(c, d => (get(d).partners ??= []), depth + 1, c.fullName || label.toLowerCase(), labels)}
          </div>
        ),
      ],
      () => this.mutate(d => { this.unlinkWithin(d, getChildren(d)[ci]); getChildren(d).splice(ci, 1); }),
      'intake-card--nested',
    );
  }

  private renderAuntUncleStep() {
    const side = (key: 'paternalAuntsUncles' | 'maternalAuntsUncles', title: string) => {
      const list = this.intake[key] ?? [];
      const add = (gender: Gender) => this.mutate(d => { (d[key] ??= []).push({ gender, key: newKey() }); });
      return (
        <div class="intake-side">
          <h3 class="intake-side__title">{title}</h3>
          {list.map((a, i) => this.renderChildCard(a, d => d[key]!, i, 0, AUNT_UNCLE_LABELS, key === 'paternalAuntsUncles' ? 'father' : 'mother'))}
          <div class="intake-actions">
            <button type="button" class="intake-add" onClick={() => add('male')}>+ Add uncle</button>
            <button type="button" class="intake-add" onClick={() => add('female')}>+ Add aunt</button>
          </div>
        </div>
      );
    };
    return [
      <p class="intake-hint">
        Optional. Add the parents' brothers and sisters (full or half), then their partners and children (the patient's cousins).
        If someone married a relative, for example an aunt married an uncle from the other side, choose them under "Already in the family?" on the partner card.
        If the patient's partner is one of these relatives, use the "(patient's partner) is their daughter/son"
        button in that family; their details are carried over. Or add the relative here first and pick them under
        "Already entered as a relative?" in "Partners &amp; children".
      </p>,
      side('paternalAuntsUncles', "Father's brothers & sisters"),
      side('maternalAuntsUncles', "Mother's brothers & sisters"),
    ];
  }

  private renderGrandparentStep() {
    const gp = this.intake.grandparents ?? {};
    return [
      <p class="intake-hint">Optional. Add only the grandparents you have information about; the other grandparent on that side is added as a placeholder.</p>,
      <div class="intake-grid">
        {GRANDPARENT_SLOTS.map(slot => {
          const rel = gp[slot.key];
          if (!rel) {
            return (
              <button
                type="button"
                class="intake-add"
                onClick={() => this.mutate(d => { d.grandparents = { ...(d.grandparents ?? {}), [slot.key]: {} }; })}
              >
                + Add {slot.label}
              </button>
            );
          }
          return this.renderCard(
            slot.label,
            this.renderRelative(rel, d => d.grandparents![slot.key]!, { allowUnknown: true }),
            () => this.mutate(d => { delete d.grandparents![slot.key]; }),
          );
        })}
      </div>,
    ];
  }

  private renderReviewStep() {
    return [
      <p class="intake-hint">
        {this.previewPeople} {this.previewPeople === 1 ? 'person' : 'people'} will be created
        {this.previewPlaceholders > 0 && `, including ${this.previewPlaceholders} placeholder${this.previewPlaceholders === 1 ? '' : 's'} (shown as "?")`}.
        Go back to change any answer; the tree can still be edited after it is created.
      </p>,
      <div class="intake-wizard__preview">
        {this.previewState && (
          <genogram-canvas
            key={`preview-${this.previewKey}`}
            state={this.previewState}
            selectionManager={this.previewSelection}
            dragManager={this.previewDrag}
            zoomPanManager={this.previewZoom}
          />
        )}
      </div>,
      this.mode === 'edit' ? (
        <div class="intake-warning intake-warning--info">
          This updates the genogram on the board. You can go back with Undo.
          {this.keptPeople.length > 0 && (
            <span>
              {' '}Kept as they are: {this.keptPeople.join(', ')}.
            </span>
          )}
        </div>
      ) : (
        this.existingCount > 0 && (
          <div class="intake-warning">
            This replaces the current genogram ({this.existingCount} {this.existingCount === 1 ? 'person' : 'people'}).
            You can bring it back with Undo.
          </div>
        )
      ),
    ];
  }

  private renderStep() {
    switch (this.step) {
      case 0: return this.renderPatientStep();
      case 1: return this.renderParentStep();
      case 2: return this.renderSiblingStep();
      case 3: return this.renderGrandparentStep();
      case 4: return this.renderPartnerStep();
      case 5: return this.renderAuntUncleStep();
      default: return this.renderReviewStep();
    }
  }

  /** Whose relatives a step covers: the patient's first name once entered, else "Patient's" */
  private stepOwner(step: string): string | null {
    if (step === 'Patient' || step === 'Review') return null;
    const first = (this.intake.patient?.fullName ?? '').trim().split(/\s+/)[0];
    return first ? `${first}'s` : "Patient's";
  }

  render() {
    const isReview = this.step === REVIEW_STEP;
    return (
      <div
        class="intake-wizard__overlay"
        onKeyDown={(e: KeyboardEvent) => {
          // Keep keystrokes (e.g. Space) from reaching the canvas pan handler
          e.stopPropagation();
          if (e.key === 'Escape') this.intakeCancel.emit(this.intake);
        }}
      >
        <div class="intake-wizard" role="dialog" aria-modal="true" aria-label="Family history questionnaire" tabindex="-1">
          <div class="intake-wizard__header">
            <h2 class="intake-wizard__title">{this.mode === 'edit' ? 'Edit family history' : 'Family history questionnaire'}</h2>
            <button type="button" class="intake-wizard__close" aria-label="Close" onClick={() => this.intakeCancel.emit(this.intake)}>&times;</button>
          </div>

          {this.patientChoices.length > 0 ? (
            <div class="intake-wizard__body">{this.renderPatientPicker()}</div>
          ) : (
          <div class="intake-wizard__main">
          <ol class="intake-steps">
            {STEPS.map((step, i) => [
              i > 0 && <li class={{ 'intake-steps__sep': true, 'intake-steps__sep--done': i <= this.step }} aria-hidden="true" />,
              <li>
                <button
                  type="button"
                  class={{ 'intake-steps__btn': true, 'intake-steps__btn--active': i === this.step, 'intake-steps__btn--done': i < this.step }}
                  onClick={() => this.goTo(i)}
                >
                  <span class="intake-steps__num">{i + 1}</span>
                  <span class="intake-steps__label">
                    {this.stepOwner(step) && <span class="intake-steps__owner">{this.stepOwner(step)}</span>}
                    <span class="intake-steps__name">{step}</span>
                  </span>
                </button>
              </li>,
            ])}
          </ol>

          <div class={{ 'intake-wizard__body': true, 'intake-wizard__body--review': isReview }}>
            {this.renderStep()}
          </div>

          <div class="intake-wizard__footer">
            <button type="button" class="intake-btn" onClick={() => this.intakeCancel.emit(this.intake)}>Cancel</button>
            <span class="intake-wizard__spacer" />
            {this.step > 0 && (
              <button type="button" class="intake-btn" onClick={() => this.goTo(this.step - 1)}>Back</button>
            )}
            {isReview ? (
              <button type="button" class="intake-btn intake-btn--primary" onClick={() => this.intakeSubmit.emit(this.intake)}>
                {this.mode === 'edit' ? 'Update genogram' : this.existingCount > 0 ? 'Replace genogram' : 'Create genogram'}
              </button>
            ) : (
              <button type="button" class="intake-btn intake-btn--primary" onClick={() => this.goTo(this.step + 1)}>
                {this.step === REVIEW_STEP - 1 ? 'Review' : 'Next'}
              </button>
            )}
          </div>

          </div>
          )}

          <datalist id={CONDITION_LIST_ID}>
            {this.conditionSuggestions().map(n => <option value={n} />)}
          </datalist>
        </div>
      </div>
    );
  }
}

function parseAge(value: string): number | undefined {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
