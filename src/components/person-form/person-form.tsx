import { Component, Prop, State, Event, EventEmitter, Watch, h } from '@stencil/core';
import { Person, Gender, PersonType, ClinicalCondition } from '../../types/nodes';
import { COMMON_CONDITIONS, CONDITION_PALETTE } from '../../utils/constants';

const CONDITION_LIST_ID = 'person-form-conditions';

@Component({
  tag: 'person-form',
  styleUrl: 'person-form.css',
  shadow: false,
})
export class PersonForm {
  @Prop() person!: Person;
  /** Conditions already on the tree; offered as suggestions and reused (same colour) when picked */
  @Prop() availableConditions: ClinicalCondition[] = [];

  @Event() personUpdate!: EventEmitter<Partial<Person> & { id: string }>;
  @Event() personDelete!: EventEmitter<string>;

  @State() draft: Partial<Person> = {};
  @State() dirty: boolean = false;
  @State() newConditionName: string = '';
  @State() newConditionColor: string = CONDITION_PALETTE[0];
  /** The colour was picked by hand, so typing a name doesn't change it */
  @State() colorPicked: boolean = false;

  @Watch('person')
  handlePersonChange() {
    this.draft = {};
    this.dirty = false;
  }

  private updateDraft(field: keyof Person, value: any) {
    this.draft = { ...this.draft, [field]: value };
    this.dirty = true;
  }

  private getValue<K extends keyof Person>(field: K): Person[K] {
    return field in this.draft ? (this.draft as any)[field] : this.person[field];
  }

  private parseAge(value: string): number | undefined {
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  }

  private handleSave = () => {
    if (!this.dirty) return;
    const updates: Partial<Person> = { ...this.draft };
    // Naming a placeholder turns it into a real relative
    if (this.person.isPlaceholder && updates.fullName?.trim()) {
      updates.isPlaceholder = false;
    }
    this.personUpdate.emit({ id: this.person.id, ...updates });
    this.draft = {};
    this.dirty = false;
  };

  private handleDelete = () => {
    this.personDelete.emit(this.person.id);
  };

  private getConditions(): ClinicalCondition[] {
    return (this.getValue('conditions') as ClinicalCondition[]) || [];
  }

  private handleRemoveCondition = (conditionId: string) => {
    const updated = this.getConditions().filter(c => c.id !== conditionId);
    this.updateDraft('conditions', updated);
  };

  /** A condition already on the tree with this name (case-insensitive) */
  private knownCondition(name: string): ClinicalCondition | undefined {
    const key = name.trim().toLowerCase();
    return key ? this.availableConditions.find(c => c.name.trim().toLowerCase() === key) : undefined;
  }

  /** Suggestions: conditions on the tree, then common ones, minus those this person already has */
  private conditionSuggestions(): string[] {
    const have = new Set(this.getConditions().map(c => c.name.trim().toLowerCase()));
    const names = new Map<string, string>();
    for (const n of [...this.availableConditions.map(c => c.name), ...COMMON_CONDITIONS]) {
      const key = n.trim().toLowerCase();
      if (key && !have.has(key) && !names.has(key)) names.set(key, n.trim());
    }
    return [...names.values()];
  }

  /** First palette colour not yet used on the tree or by this person */
  private nextFreeColor(): string {
    const used = new Set([...this.availableConditions, ...this.getConditions()].map(c => c.color.toLowerCase()));
    return CONDITION_PALETTE.find(c => !used.has(c.toLowerCase())) ?? CONDITION_PALETTE[0];
  }

  private handleConditionNameInput = (value: string) => {
    this.newConditionName = value;
    // A condition already on the tree keeps its colour; a new one gets a free colour
    const known = this.knownCondition(value);
    if (known) this.newConditionColor = known.color;
    else if (!this.colorPicked) this.newConditionColor = this.nextFreeColor();
  };

  private handleCreateCondition = () => {
    const name = this.newConditionName.trim();
    if (!name) return;

    const existing = this.getConditions();
    if (existing.some(c => c.name.trim().toLowerCase() === name.toLowerCase())) {
      this.newConditionName = '';
      return;
    }
    // Picking a condition already on the tree reuses it, so the legend shows it once
    const known = this.knownCondition(name);
    const newCondition: ClinicalCondition = known
      ? { id: known.id, name: known.name, color: this.newConditionColor, ...(known.icon ? { icon: known.icon } : {}) }
      : {
          id: `condition-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name,
          color: this.newConditionColor,
        };
    // Conditions are only drawn when they have a quarter; take the first free one
    const used = new Set(existing.map(c => c.quadrant));
    const free = ([1, 2, 3, 4] as const).find(q => !used.has(q));
    if (free) newCondition.quadrant = free;

    const updated = [...existing, newCondition];
    this.updateDraft('conditions', updated);
    this.newConditionName = '';
    this.colorPicked = false;
    this.newConditionColor = this.nextFreeColor();
  };

  private getContrastColor(hexColor: string): string {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#333333' : '#ffffff';
  }

  render() {
    const person = this.person;
    if (!person) return null;

    const conditions = this.getConditions();

    return (
      <div class="person-form">
        {/* Full name */}
        <div class="person-form__field">
          <label class="person-form__label" htmlFor="person-fullName">Full Name</label>
          <input
            class="person-form__input"
            id="person-fullName"
            type="text"
            value={this.getValue('fullName') || ''}
            onInput={(e: Event) => this.updateDraft('fullName', (e.target as HTMLInputElement).value)}
          />
        </div>

        {/* Row: Gender + Type */}
        <div class="person-form__row">
          <div class="person-form__field person-form__field--half">
            <label class="person-form__label" htmlFor="person-gender">Gender</label>
            <select
              class="person-form__select"
              id="person-gender"
              onChange={(e: Event) => this.updateDraft('gender', (e.target as HTMLSelectElement).value as Gender)}
            >
              <option value="male" selected={this.getValue('gender') === 'male'}>Male</option>
              <option value="female" selected={this.getValue('gender') === 'female'}>Female</option>
              <option value="unknown" selected={this.getValue('gender') === 'unknown'}>Unknown</option>
            </select>
          </div>
          <div class="person-form__field person-form__field--half">
            <label class="person-form__label" htmlFor="person-type">Type</label>
            <select
              class="person-form__select"
              id="person-type"
              onChange={(e: Event) => this.updateDraft('type', (e.target as HTMLSelectElement).value as PersonType)}
            >
              <option value="standard" selected={this.getValue('type') === 'standard'}>Standard</option>
              <option value="adopted" selected={this.getValue('type') === 'adopted'}>Adopted</option>
              <option value="foster" selected={this.getValue('type') === 'foster'}>Foster</option>
              <option value="pregnancy" selected={this.getValue('type') === 'pregnancy'}>Pregnancy</option>
              <option value="miscarriage" selected={this.getValue('type') === 'miscarriage'}>Miscarriage</option>
              <option value="abortion" selected={this.getValue('type') === 'abortion'}>Abortion</option>
              <option value="stillbirth" selected={this.getValue('type') === 'stillbirth'}>Stillbirth</option>
              <option value="pet" selected={this.getValue('type') === 'pet'}>Pet</option>
            </select>
          </div>
        </div>

        {/* Row: DOB + DOD */}
        <div class="person-form__row">
          <div class="person-form__field person-form__field--half">
            <label class="person-form__label" htmlFor="person-dob">Date of Birth</label>
            <input
              class="person-form__input"
              id="person-dob"
              type="date"
              value={this.getValue('dateOfBirth') || ''}
              onInput={(e: Event) => this.updateDraft('dateOfBirth', (e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="person-form__field person-form__field--half">
            <label class="person-form__label" htmlFor="person-dod">Date of Death</label>
            <input
              class="person-form__input"
              id="person-dod"
              type="date"
              value={this.getValue('dateOfDeath') || ''}
              onInput={(e: Event) => this.updateDraft('dateOfDeath', (e.target as HTMLInputElement).value)}
            />
          </div>
        </div>

        {/* Row: Age + Age at death (when exact dates are unknown) */}
        <div class="person-form__row">
          <div class="person-form__field person-form__field--half">
            <label class="person-form__label" htmlFor="person-age">Age</label>
            <input
              class="person-form__input"
              id="person-age"
              type="number"
              min="0"
              max="130"
              value={this.getValue('age') ?? ''}
              onInput={(e: Event) => this.updateDraft('age', this.parseAge((e.target as HTMLInputElement).value))}
            />
          </div>
          <div class="person-form__field person-form__field--half">
            <label class="person-form__label" htmlFor="person-age-at-death">Age at Death</label>
            <input
              class="person-form__input"
              id="person-age-at-death"
              type="number"
              min="0"
              max="130"
              value={this.getValue('ageAtDeath') ?? ''}
              onInput={(e: Event) => this.updateDraft('ageAtDeath', this.parseAge((e.target as HTMLInputElement).value))}
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div class="person-form__row">
          <label class="person-form__label person-form__label--checkbox">
            <input
              class="person-form__checkbox"
              type="checkbox"
              checked={this.getValue('isDeceased')}
              onChange={(e: Event) => this.updateDraft('isDeceased', (e.target as HTMLInputElement).checked)}
            />
            Deceased
          </label>
          <label class="person-form__label person-form__label--checkbox">
            <input
              class="person-form__checkbox"
              type="checkbox"
              checked={this.getValue('isProband')}
              onChange={(e: Event) => this.updateDraft('isProband', (e.target as HTMLInputElement).checked)}
            />
            Proband
          </label>
        </div>

        {/* Notes */}
        <div class="person-form__field">
          <label class="person-form__label" htmlFor="person-notes">Notes</label>
          <textarea
            class="person-form__textarea"
            id="person-notes"
            rows={2}
            value={this.getValue('notes') || ''}
            onInput={(e: Event) => this.updateDraft('notes', (e.target as HTMLTextAreaElement).value)}
          />
        </div>

        {/* Conditions section */}
        <div class="person-form__section">
          <label class="person-form__label">Conditions</label>

          {conditions.length > 0 && (
            <div class="person-form__tags">
              {conditions.map(c => (
                <span
                  class="person-form__tag"
                  style={{ backgroundColor: c.color, color: this.getContrastColor(c.color) }}
                  key={c.id}
                >
                  <span class="person-form__tag-name">{c.name}</span>
                  <button
                    class="person-form__tag-remove"
                    type="button"
                    onClick={() => this.handleRemoveCondition(c.id)}
                    style={{ color: this.getContrastColor(c.color) }}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          <div class="person-form__add-condition">
            <input
              class="person-form__input person-form__input--sm"
              type="text"
              list={CONDITION_LIST_ID}
              placeholder="Pick or type…"
              value={this.newConditionName}
              onInput={(e: Event) => this.handleConditionNameInput((e.target as HTMLInputElement).value)}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  this.handleCreateCondition();
                }
              }}
            />
            <datalist id={CONDITION_LIST_ID}>
              {this.conditionSuggestions().map(n => <option value={n} />)}
            </datalist>
            <input
              class="person-form__color-picker"
              type="color"
              value={this.newConditionColor}
              onInput={(e: Event) => {
                this.newConditionColor = (e.target as HTMLInputElement).value;
                this.colorPicked = true;
              }}
              title="Pick a color"
            />
            <button
              class="person-form__add-btn"
              type="button"
              onClick={this.handleCreateCondition}
              disabled={!this.newConditionName.trim()}
            >
              + Add
            </button>
          </div>
        </div>

        {/* Actions — Save + Delete */}
        <div class="person-form__actions">
          <button
            class="person-form__save-btn"
            type="button"
            disabled={!this.dirty}
            onClick={this.handleSave}
          >
            Save Changes
          </button>
          <button class="person-form__delete-btn" type="button" onClick={this.handleDelete}>
            Delete Person
          </button>
        </div>
      </div>
    );
  }
}
