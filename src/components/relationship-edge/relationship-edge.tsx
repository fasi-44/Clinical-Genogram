import { Component, Prop, Event, EventEmitter, h } from '@stencil/core';
import { Relationship, LineOptions } from '../../types';
import { renderRelationshipLine } from '../../lines';

@Component({
  tag: 'relationship-edge',
  styleUrl: 'relationship-edge.css',
  shadow: false, // CRITICAL: SVG child - no Shadow DOM
})
export class RelationshipEdge {
  @Prop() relationship!: Relationship;
  @Prop() x1!: number;
  @Prop() y1!: number;
  @Prop() x2!: number;
  @Prop() y2!: number;
  @Prop() selected: boolean = false;

  @Event() relationshipClick!: EventEmitter<Relationship>;

  private handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    this.relationshipClick.emit(this.relationship);
  };

  render() {
    const { relationship, x1, y1, x2, y2, selected } = this;
    if (!relationship) return null;

    const opts: LineOptions = { x1, y1, x2, y2, strokeWidth: selected ? 3 : 2 };

    return (
      <g
        class={{ 'relationship-edge': true, 'relationship-edge--selected': selected }}
        onClick={this.handleClick}
        data-relationship-id={relationship.id}
      >
        {/* Invisible wide hit area for easier clicking */}
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="transparent"
          stroke-width="12"
        />
        {renderRelationshipLine(relationship.type, opts)}
      </g>
    );
  }
}
