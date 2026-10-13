import { Component, Prop, Event, EventEmitter, h } from '@stencil/core';
import { Gender, Person } from '../../types/nodes';
import { Relationship, ConsanguinityRelation } from '../../types/relationships';
import { RELATION_DEGREE } from '../../utils/consanguinity';
import { orderedByAge } from '../../utils/birth-order';

@Component({
  tag: 'genogram-property-panel',
  styleUrl: 'genogram-property-panel.css',
  shadow: false,
})
export class GenogramPropertyPanel {
  @Prop() selectedType: 'person' | 'relationship' | null = null;
  @Prop() selectedPerson: Person | null = null;
  @Prop() selectedRelationship: Relationship | null = null;
  /** Everyone on the board, to show names in the family controls */
  @Prop() allPersons: Person[] = [];
  /** Couples the selected person can be given as parents (no cycles) */
  @Prop() parentOptions: Relationship[] = [];
  /** The couple the selected person is currently a child of */
  @Prop() parentCouple: Relationship | null = null;

  @Event() personUpdate!: EventEmitter<Partial<Person> & { id: string }>;
  @Event() personDelete!: EventEmitter<string>;
  @Event() relationshipUpdate!: EventEmitter<Partial<Relationship> & { id: string }>;
  @Event() relationshipDelete!: EventEmitter<string>;
  @Event() panelClose!: EventEmitter<void>;
  /** Add a relative to the selected person */
  @Event() addRelative!: EventEmitter<{ personId: string; kind: 'parents' | 'sibling' | 'partner' | 'child'; gender?: Gender }>;
  /** Make a couple the person's parents (null = no parents) */
  @Event() parentsChange!: EventEmitter<{ personId: string; coupleId: string | null }>;
  /** Reorder, detach or add a couple's children */
  @Event() coupleChildAction!: EventEmitter<{ coupleId: string; action: 'up' | 'down' | 'remove' | 'add'; childId?: string; gender?: Gender }>;

  private handlePersonUpdate = (event: CustomEvent<Partial<Person> & { id: string }>) => {
    event.stopPropagation();
    this.personUpdate.emit(event.detail);
  };

  private handlePersonDelete = (event: CustomEvent<string>) => {
    event.stopPropagation();
    this.personDelete.emit(event.detail);
  };

  private handleRelationshipUpdate = (event: CustomEvent<Partial<Relationship> & { id: string }>) => {
    event.stopPropagation();
    this.relationshipUpdate.emit(event.detail);
  };

  private handleRelationshipDelete = (event: CustomEvent<string>) => {
    event.stopPropagation();
    this.relationshipDelete.emit(event.detail);
  };

  private handleConsanguinityChange = (event: CustomEvent<ConsanguinityRelation | 'none'>) => {
    event.stopPropagation();
    if (!this.selectedRelationship) return;
    const choice = event.detail;
    this.relationshipUpdate.emit(
      choice === 'none'
        ? { id: this.selectedRelationship.id, consanguinity: 'none', consanguinityRelation: undefined }
        : { id: this.selectedRelationship.id, consanguinity: RELATION_DEGREE[choice], consanguinityRelation: choice },
    );
  };

  private handleClose = () => {
    this.panelClose.emit();
  };

  private nameOf(id: string): string {
    const p = this.allPersons.find(x => x.id === id);
    if (!p) return 'Unknown';
    return p.fullName || (p.isPlaceholder ? 'Unknown person' : 'Unnamed');
  }

  private coupleLabel(rel: Relationship): string {
    return `${this.nameOf(rel.person1Id)} & ${this.nameOf(rel.person2Id)}`;
  }

  /** Parents chooser and one-click buttons to add relatives */
  private renderFamily(person: Person) {
    const add = (kind: 'parents' | 'sibling' | 'partner' | 'child', gender?: Gender) =>
      this.addRelative.emit({ personId: person.id, kind, gender });
    const options = [...this.parentOptions].sort((a, b) => this.coupleLabel(a).localeCompare(this.coupleLabel(b)));
    return (
      <div class="family-section">
        <div class="family-section__title">Family</div>
        <label class="family-section__field">
          <span>Parents</span>
          <select
            onChange={(e: Event) => {
              const v = (e.target as HTMLSelectElement).value;
              this.parentsChange.emit({ personId: person.id, coupleId: v || null });
            }}
          >
            <option value="" selected={!this.parentCouple}>No parents on the tree</option>
            {options.map(r => (
              <option value={r.id} selected={this.parentCouple?.id === r.id}>{this.coupleLabel(r)}</option>
            ))}
          </select>
        </label>
        <div class="family-section__buttons">
          <button type="button" class="family-btn" disabled={!!this.parentCouple} title={this.parentCouple ? 'Already has parents' : 'Add a father and mother'} onClick={() => add('parents')}>+ Parents</button>
          <button type="button" class="family-btn" onClick={() => add('sibling', 'male')}>+ Brother</button>
          <button type="button" class="family-btn" onClick={() => add('sibling', 'female')}>+ Sister</button>
          <button type="button" class="family-btn" onClick={() => add('partner')}>+ Partner</button>
          <button type="button" class="family-btn" onClick={() => add('child', 'male')}>+ Son</button>
          <button type="button" class="family-btn" onClick={() => add('child', 'female')}>+ Daughter</button>
        </div>
      </div>
    );
  }

  /** Short age for the children list ("34", "b. 1990"), or '' when unknown */
  private ageOf(id: string): string {
    const p = this.personOf(id);
    if (!p) return '';
    if (p.age !== undefined && !p.isDeceased) return String(p.age);
    if (p.dateOfBirth) return `b. ${p.dateOfBirth.slice(0, 4)}`;
    return '';
  }

  private personOf(id: string): Person | undefined {
    return this.allPersons.find(p => p.id === id);
  }

  /** Children with known ages are kept in age order, so they can't be swapped by hand */
  private canMove(kids: string[], i: number, delta: -1 | 1): boolean {
    const j = i + delta;
    return j >= 0 && j < kids.length && !orderedByAge(this.personOf(kids[i]), this.personOf(kids[j]));
  }

  private moveTitle(kids: string[], i: number, delta: -1 | 1): string {
    const j = i + delta;
    if (j >= 0 && j < kids.length && !this.canMove(kids, i, delta)) return 'Placed by age (oldest first)';
    return delta < 0 ? 'Earlier in birth order' : 'Later in birth order';
  }

  /** A couple's children in birth order (oldest first), with reorder / remove / add */
  private renderChildren(rel: Relationship) {
    const act = (action: 'up' | 'down' | 'remove' | 'add', childId?: string, gender?: Gender) =>
      this.coupleChildAction.emit({ coupleId: rel.id, action, childId, gender });
    const kids = rel.childrenIds;
    return (
      <div class="family-section">
        <div class="family-section__title">Children ({kids.length}), oldest first</div>
        {kids.length === 0 && <p class="family-section__empty">No children recorded.</p>}
        <ol class="child-list">
          {kids.map((id, i) => (
            <li class="child-list__item" key={id}>
              <span class="child-list__name">
                {this.nameOf(id)}
                {this.ageOf(id) && <span class="child-list__age"> {this.ageOf(id)}</span>}
              </span>
              <button type="button" class="child-list__btn" disabled={!this.canMove(kids, i, -1)} title={this.moveTitle(kids, i, -1)} aria-label="Move up" onClick={() => act('up', id)}>&uarr;</button>
              <button type="button" class="child-list__btn" disabled={!this.canMove(kids, i, 1)} title={this.moveTitle(kids, i, 1)} aria-label="Move down" onClick={() => act('down', id)}>&darr;</button>
              <button type="button" class="child-list__btn child-list__btn--remove" title="Remove from this couple (the person is kept)" aria-label="Remove from couple" onClick={() => act('remove', id)}>&times;</button>
            </li>
          ))}
        </ol>
        <div class="family-section__buttons">
          <button type="button" class="family-btn" onClick={() => act('add', undefined, 'male')}>+ Son</button>
          <button type="button" class="family-btn" onClick={() => act('add', undefined, 'female')}>+ Daughter</button>
        </div>
        <p class="family-section__hint">To add someone already on the tree as a child, select them and choose these parents.</p>
      </div>
    );
  }

  render() {
    if (this.selectedType === 'person' && this.selectedPerson) {
      return (
        <div class="property-panel">
          <div class="property-panel__header">
            <h3 class="property-panel__title">Person Properties</h3>
            <button class="property-panel__close" onClick={this.handleClose} aria-label="Close panel">&times;</button>
          </div>
          {this.renderFamily(this.selectedPerson)}
          <person-form
            person={this.selectedPerson}
            onPersonUpdate={this.handlePersonUpdate}
            onPersonDelete={this.handlePersonDelete}
          />
        </div>
      );
    }

    if (this.selectedType === 'relationship' && this.selectedRelationship) {
      return (
        <div class="property-panel">
          <div class="property-panel__header">
            <h3 class="property-panel__title">Relationship Properties</h3>
            <button class="property-panel__close" onClick={this.handleClose} aria-label="Close panel">&times;</button>
          </div>
          {this.renderChildren(this.selectedRelationship)}
          <relationship-form
            relationship={this.selectedRelationship}
            onRelationshipUpdate={this.handleRelationshipUpdate}
            onRelationshipDelete={this.handleRelationshipDelete}
          />
          <consanguinity-form
            value={this.selectedRelationship.consanguinity}
            relation={this.selectedRelationship.consanguinityRelation}
            onConsanguinityChange={this.handleConsanguinityChange}
          />
        </div>
      );
    }

    return null;
  }
}
