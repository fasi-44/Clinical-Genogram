import { Component, Prop, State, Event, EventEmitter, Watch, h } from '@stencil/core';
import { Relationship, RelationshipType } from '../../types/relationships';

@Component({
  tag: 'relationship-form',
  styleUrl: 'relationship-form.css',
  shadow: false,
})
export class RelationshipForm {
  @Prop() relationship!: Relationship;

  @Event() relationshipUpdate!: EventEmitter<Partial<Relationship> & { id: string }>;
  @Event() relationshipDelete!: EventEmitter<string>;

  @State() draft: Partial<Relationship> = {};
  @State() dirty: boolean = false;

  @Watch('relationship')
  handleRelationshipChange() {
    this.draft = {};
    this.dirty = false;
  }

  private updateDraft(field: keyof Relationship, value: any) {
    this.draft = { ...this.draft, [field]: value };
    this.dirty = true;
  }

  private getValue<K extends keyof Relationship>(field: K): Relationship[K] {
    return field in this.draft ? (this.draft as any)[field] : this.relationship[field];
  }

  private handleSave = () => {
    if (!this.dirty) return;
    this.relationshipUpdate.emit({ id: this.relationship.id, ...this.draft });
    this.draft = {};
    this.dirty = false;
  };

  private handleDelete = () => {
    this.relationshipDelete.emit(this.relationship.id);
  };

  render() {
    const rel = this.relationship;
    if (!rel) return null;

    return (
      <div class="relationship-form">
        <div class="relationship-form__field">
          <label class="relationship-form__label" htmlFor="rel-type">Type</label>
          <select
            class="relationship-form__select"
            id="rel-type"
            onChange={(e: Event) => this.updateDraft('type', (e.target as HTMLSelectElement).value as RelationshipType)}
          >
            <option value="marriage" selected={this.getValue('type') === 'marriage'}>Marriage</option>
            <option value="separation" selected={this.getValue('type') === 'separation'}>Separation</option>
            <option value="legal-separation" selected={this.getValue('type') === 'legal-separation'}>Legal Separation</option>
            <option value="divorce" selected={this.getValue('type') === 'divorce'}>Divorce</option>
            <option value="engagement" selected={this.getValue('type') === 'engagement'}>Engagement</option>
            <option value="cohabitation" selected={this.getValue('type') === 'cohabitation'}>Cohabitation</option>
            <option value="cohabitation-separation" selected={this.getValue('type') === 'cohabitation-separation'}>Cohabitation Separation</option>
            <option value="cohabitation-legal-separation" selected={this.getValue('type') === 'cohabitation-legal-separation'}>Cohabitation Legal Separation</option>
            <option value="cohabitation-divorce" selected={this.getValue('type') === 'cohabitation-divorce'}>Cohabitation Divorce</option>
            <option value="casual" selected={this.getValue('type') === 'casual'}>Casual</option>
            <option value="committed" selected={this.getValue('type') === 'committed'}>Committed</option>
            <option value="temporary" selected={this.getValue('type') === 'temporary'}>Temporary</option>
            <option value="casual-separation" selected={this.getValue('type') === 'casual-separation'}>Casual Separation</option>
            <option value="committed-separation" selected={this.getValue('type') === 'committed-separation'}>Committed Separation</option>
            <option value="temporary-separation" selected={this.getValue('type') === 'temporary-separation'}>Temporary Separation</option>
            <option value="love-affair" selected={this.getValue('type') === 'love-affair'}>Love Affair</option>
            <option value="nullity" selected={this.getValue('type') === 'nullity'}>Nullity</option>
            <option value="child" selected={this.getValue('type') === 'child'}>Child</option>
          </select>
        </div>

        <div class="relationship-form__field">
          <label class="relationship-form__label" htmlFor="rel-start-date">Start Date</label>
          <input
            class="relationship-form__input"
            id="rel-start-date"
            type="date"
            value={this.getValue('startDate') || ''}
            onInput={(e: Event) => this.updateDraft('startDate', (e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="relationship-form__field">
          <label class="relationship-form__label" htmlFor="rel-end-date">End Date</label>
          <input
            class="relationship-form__input"
            id="rel-end-date"
            type="date"
            value={this.getValue('endDate') || ''}
            onInput={(e: Event) => this.updateDraft('endDate', (e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="relationship-form__field">
          <label class="relationship-form__label" htmlFor="rel-notes">Notes</label>
          <textarea
            class="relationship-form__textarea"
            id="rel-notes"
            rows={3}
            value={this.getValue('notes') || ''}
            onInput={(e: Event) => this.updateDraft('notes', (e.target as HTMLTextAreaElement).value)}
          />
        </div>

        <div class="relationship-form__actions">
          <button
            class="relationship-form__save-btn"
            type="button"
            disabled={!this.dirty}
            onClick={this.handleSave}
          >
            Save
          </button>
          <button class="relationship-form__delete-btn" type="button" onClick={this.handleDelete}>
            Delete Relationship
          </button>
        </div>
      </div>
    );
  }
}
