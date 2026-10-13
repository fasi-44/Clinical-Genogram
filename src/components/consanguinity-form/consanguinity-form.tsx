import { Component, Prop, Event, EventEmitter, h } from '@stencil/core';
import { ConsanguinityRelation, ConsanguinityType } from '../../types/relationships';

type Choice = ConsanguinityRelation | 'none';

interface ConsanguinityOption {
  value: Choice;
  label: string;
  description: string;
}

const CONSANGUINITY_OPTIONS: ConsanguinityOption[] = [
  { value: 'none', label: 'Not related', description: 'No known blood relationship' },
  { value: 'first-cousins', label: 'First cousins', description: 'Share a set of grandparents' },
  { value: 'second-cousins', label: 'Second cousins', description: 'Share a set of great-grandparents' },
  { value: 'first-cousins-once-removed', label: 'First cousins once removed', description: "One is the child of the other's first cousin" },
  { value: 'uncle-niece', label: 'Uncle and niece', description: "He is a brother of her parent" },
  { value: 'aunt-nephew', label: 'Aunt and nephew', description: "She is a sister of his parent" },
  { value: 'other', label: 'Other blood relatives', description: 'Related, but more distantly' },
  { value: 'unknown', label: 'Possibly related', description: 'Suspected but not confirmed (drawn dashed)' },
];

const DEGREE_NAMES: Record<ConsanguinityType, string> = {
  none: '',
  'first-degree': '1st degree',
  'second-degree': '2nd degree',
  'third-degree': '3rd degree',
  distant: 'distant',
};

@Component({
  tag: 'consanguinity-form',
  styleUrl: 'consanguinity-form.css',
  shadow: false,
})
export class ConsanguinityForm {
  /** Plain-language relation, if recorded */
  @Prop() relation?: ConsanguinityRelation;
  /** Genetic degree; shown for older data that has a degree but no relation */
  @Prop() value: ConsanguinityType = 'none';

  @Event() consanguinityChange!: EventEmitter<Choice>;

  render() {
    const selected: Choice | null = this.relation ?? (this.value === 'none' ? 'none' : null);
    return (
      <div class="consanguinity-form">
        <label class="consanguinity-form__label">Related by blood?</label>
        {selected === null && (
          <p class="consanguinity-form__legacy">Recorded as {DEGREE_NAMES[this.value]} relatives. Pick the exact relationship below.</p>
        )}
        <div class="consanguinity-form__options">
          {CONSANGUINITY_OPTIONS.map(option => (
            <label
              class={{
                'consanguinity-form__option': true,
                'consanguinity-form__option--selected': selected === option.value,
              }}
              key={option.value}
            >
              <input
                class="consanguinity-form__radio"
                type="radio"
                name="consanguinity"
                value={option.value}
                checked={selected === option.value}
                onChange={() => this.consanguinityChange.emit(option.value)}
              />
              <div class="consanguinity-form__option-content">
                <span class="consanguinity-form__option-label">{option.label}</span>
                <span class="consanguinity-form__option-desc">{option.description}</span>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  }
}
