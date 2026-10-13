import { Component, Prop, Event, EventEmitter, h } from '@stencil/core';
import { Person, SymbolOptions } from '../../types';
import { renderPersonSymbol } from '../../symbols';
import { DEFAULT_NODE_SIZE, COLORS, DEFAULT_STROKE_WIDTH, SELECTED_STROKE_WIDTH } from '../../utils/constants';

@Component({
  tag: 'person-node',
  styleUrl: 'person-node.css',
  shadow: false, // CRITICAL: SVG child - no Shadow DOM
})
export class PersonNode {
  @Prop() person!: Person;
  @Prop() size: number = DEFAULT_NODE_SIZE;
  @Prop() selected: boolean = false;

  @Event() personClick!: EventEmitter<Person>;
  @Event() personDoubleClick!: EventEmitter<Person>;
  @Event() personDragStart!: EventEmitter<{ person: Person; x: number; y: number }>;

  private handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    this.personClick.emit(this.person);
  };

  private handleDoubleClick = (e: MouseEvent) => {
    e.stopPropagation();
    this.personDoubleClick.emit(this.person);
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      // left button only
      this.personDragStart.emit({ person: this.person, x: e.clientX, y: e.clientY });
    }
  };

  render() {
    const { person, size, selected } = this;
    if (!person) return null;

    const x = person.x ?? 0;
    const y = person.y ?? 0;

    const opts: SymbolOptions = {
      size,
      x,
      y,
      stroke: selected ? COLORS.selected : COLORS.stroke,
      strokeWidth: selected ? SELECTED_STROKE_WIDTH : DEFAULT_STROKE_WIDTH,
      isDeceased: person.isDeceased,
      type: person.type,
      conditions: person.conditions?.map(c => ({ color: c.color, quadrant: c.quadrant })),
    };

    // Display name
    const name = person.fullName ?? '';
    const label = name || person.id;

    return (
      <g
        class={{ 'person-node': true, 'person-node--selected': selected }}
        onClick={this.handleClick}
        onDblClick={this.handleDoubleClick}
        onMouseDown={this.handleMouseDown}
        data-person-id={person.id}
      >
        {renderPersonSymbol(person, opts)}
        <text
          x={x}
          y={y + size / 2 + 16}
          text-anchor="middle"
          font-size="11"
          fill={COLORS.stroke}
          class="person-label"
        >
          {label}
        </text>
      </g>
    );
  }
}
