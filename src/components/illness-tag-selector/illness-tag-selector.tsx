import { Component, Prop, State, Event, EventEmitter, h } from '@stencil/core';
import { ClinicalCondition } from '../../types/nodes';

@Component({
  tag: 'illness-tag-selector',
  styleUrl: 'illness-tag-selector.css',
  shadow: false,
})
export class IllnessTagSelector {
  @Prop() conditions: ClinicalCondition[] = [];
  @Prop() availableConditions: ClinicalCondition[] = [];

  @Event() conditionsChange!: EventEmitter<ClinicalCondition[]>;

  @State() newConditionName: string = '';
  @State() newConditionColor: string = '#2196f3';
  @State() showDropdown: boolean = false;

  private handleRemoveCondition = (conditionId: string) => {
    const updated = this.conditions.filter(c => c.id !== conditionId);
    this.conditionsChange.emit(updated);
  };

  private handleAddExisting = (condition: ClinicalCondition) => {
    const alreadySelected = this.conditions.some(c => c.id === condition.id);
    if (!alreadySelected) {
      const updated = [...this.conditions, condition];
      this.conditionsChange.emit(updated);
    }
    this.showDropdown = false;
  };

  private handleNewConditionNameChange = (e: Event) => {
    this.newConditionName = (e.target as HTMLInputElement).value;
  };

  private handleNewConditionColorChange = (e: Event) => {
    this.newConditionColor = (e.target as HTMLInputElement).value;
  };

  private handleCreateCondition = () => {
    const name = this.newConditionName.trim();
    if (!name) {
      return;
    }

    const newCondition: ClinicalCondition = {
      id: `condition-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: name,
      color: this.newConditionColor,
    };

    const updated = [...this.conditions, newCondition];
    this.conditionsChange.emit(updated);
    this.newConditionName = '';
    this.newConditionColor = '#2196f3';
  };

  private toggleDropdown = () => {
    this.showDropdown = !this.showDropdown;
  };

  private getUnselectedConditions(): ClinicalCondition[] {
    const selectedIds = new Set(this.conditions.map(c => c.id));
    return this.availableConditions.filter(c => !selectedIds.has(c.id));
  }

  private getContrastColor(hexColor: string): string {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#333333' : '#ffffff';
  }

  render() {
    const unselected = this.getUnselectedConditions();

    return (
      <div class="illness-tag-selector">
        <label class="illness-tag-selector__label">Clinical Conditions</label>

        <div class="illness-tag-selector__tags">
          {this.conditions.map(condition => (
            <span
              class="illness-tag-selector__tag"
              style={{
                backgroundColor: condition.color,
                color: this.getContrastColor(condition.color),
              }}
              key={condition.id}
            >
              <span class="illness-tag-selector__tag-name">{condition.name}</span>
              <button
                class="illness-tag-selector__tag-remove"
                type="button"
                onClick={() => this.handleRemoveCondition(condition.id)}
                style={{ color: this.getContrastColor(condition.color) }}
                aria-label={`Remove ${condition.name}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>

        {unselected.length > 0 && (
          <div class="illness-tag-selector__dropdown-wrapper">
            <button
              class="illness-tag-selector__add-btn"
              type="button"
              onClick={this.toggleDropdown}
            >
              {this.showDropdown ? 'Close' : 'Add Existing Condition'}
            </button>
            {this.showDropdown && (
              <ul class="illness-tag-selector__dropdown">
                {unselected.map(condition => (
                  <li
                    class="illness-tag-selector__dropdown-item"
                    key={condition.id}
                    onClick={() => this.handleAddExisting(condition)}
                  >
                    <span
                      class="illness-tag-selector__dropdown-swatch"
                      style={{ backgroundColor: condition.color }}
                    />
                    {condition.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div class="illness-tag-selector__create">
          <span class="illness-tag-selector__create-label">Create New</span>
          <div class="illness-tag-selector__create-row">
            <input
              class="illness-tag-selector__create-input"
              type="text"
              placeholder="Condition name"
              value={this.newConditionName}
              onInput={this.handleNewConditionNameChange}
            />
            <input
              class="illness-tag-selector__create-color"
              type="color"
              value={this.newConditionColor}
              onInput={this.handleNewConditionColorChange}
              title="Pick a color"
            />
            <button
              class="illness-tag-selector__create-btn"
              type="button"
              onClick={this.handleCreateCondition}
              disabled={!this.newConditionName.trim()}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    );
  }
}
