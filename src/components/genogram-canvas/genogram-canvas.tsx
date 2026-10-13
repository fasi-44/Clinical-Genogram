import { Component, Prop, State, Element, Event, EventEmitter, h } from '@stencil/core';
import { Person, Relationship, SymbolOptions, LineOptions } from '../../types';
import { GenogramState } from '../../core/GenogramState';
import { SelectionManager } from '../../core/SelectionManager';
import { DragManager } from '../../core/DragManager';
import { ZoomPanManager } from '../../core/ZoomPanManager';
import { renderPersonSymbol } from '../../symbols';
import { renderSymbolOutline } from '../../symbols/outline';
import { computeFamilyConnectors, buildConnectorPath } from '../../utils/connectors';
import { renderRelationshipLine } from '../../lines';
import { splitName } from '../../utils/name';
import { consanguinityLabel, isConsanguineous } from '../../utils/consanguinity';
import { renderConsanguinityMarker, renderConsanguinityLabel } from '../../lines/consanguinity-marker';
import { DEFAULT_NODE_SIZE, COLORS, DEFAULT_STROKE_WIDTH, SELECTED_STROKE_WIDTH, GENERATION_SPACING_Y } from '../../utils/constants';
import { toRoman } from '../../utils/name';

@Component({
  tag: 'genogram-canvas',
  styleUrl: 'genogram-canvas.css',
  shadow: false,
})
export class GenogramCanvas {
  @Element() el!: HTMLElement;

  @Prop() state!: GenogramState;
  @Prop() selectionManager!: SelectionManager;
  @Prop() dragManager!: DragManager;
  @Prop() zoomPanManager!: ZoomPanManager;
  /** Draw each condition's icon (or first letter) inside its coloured quarter */
  @Prop() showConditionIcons: boolean = true;

  @State() persons: Person[] = [];
  @State() relationships: Relationship[] = [];
  @State() zoom: number = 1;
  @State() panX: number = 0;
  @State() panY: number = 0;
  @State() selectedId: string | null = null;
  @State() isPanning: boolean = false;
  @State() hoveredPerson: Person | null = null;
  @State() hoverScreenX: number = 0;
  @State() hoverScreenY: number = 0;

  @Event() canvasNodeClick!: EventEmitter<Person>;
  @Event() canvasNodeDoubleClick!: EventEmitter<Person>;
  @Event() canvasRelationshipClick!: EventEmitter<Relationship>;
  @Event() canvasBackgroundClick!: EventEmitter<void>;

  private unsubscribers: (() => void)[] = [];
  private lastPanPoint: { x: number; y: number } | null = null;
  private spacePressed = false;

  connectedCallback() {
    if (this.state) {
      this.unsubscribers.push(
        this.state.subscribe(() => {
          this.persons = [...this.state.getPersons()];
          this.relationships = [...this.state.getRelationships()];
        }),
      );
      this.persons = [...this.state.getPersons()];
      this.relationships = [...this.state.getRelationships()];
    }
    if (this.selectionManager) {
      this.unsubscribers.push(
        this.selectionManager.subscribe(sel => {
          this.selectedId = sel.id;
        }),
      );
    }
    if (this.zoomPanManager) {
      this.unsubscribers.push(
        this.zoomPanManager.subscribe(view => {
          this.zoom = view.zoom;
          this.panX = view.panX;
          this.panY = view.panY;
        }),
      );
    }
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  disconnectedCallback() {
    this.unsubscribers.forEach(fn => fn());
    this.unsubscribers = [];
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') this.spacePressed = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') this.spacePressed = false;
  };

  private handleBackgroundClick = () => {
    this.selectionManager?.deselect();
    this.canvasBackgroundClick.emit();
  };

  // Person click handler using event delegation
  private handlePersonClick(person: Person, e: MouseEvent) {
    e.stopPropagation();
    this.selectionManager?.select('person', person.id);
    this.canvasNodeClick.emit(person);
  }

  private handlePersonDoubleClick(person: Person, e: MouseEvent) {
    e.stopPropagation();
    this.canvasNodeDoubleClick.emit(person);
  }

  private handlePersonMouseDown(person: Person, e: MouseEvent) {
    if (e.button === 0 && !this.spacePressed) {
      this.state?.saveSnapshot(); // one snapshot before drag starts
      this.dragManager?.startDrag(person.id, e.clientX, e.clientY);
    }
  }

  private handleRelClick(rel: Relationship, e: MouseEvent) {
    e.stopPropagation();
    this.selectionManager?.select('relationship', rel.id);
    this.canvasRelationshipClick.emit(rel);
  }

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && this.spacePressed)) {
      this.isPanning = true;
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isPanning && this.lastPanPoint) {
      const dx = e.clientX - this.lastPanPoint.x;
      const dy = e.clientY - this.lastPanPoint.y;
      this.zoomPanManager?.pan(dx, dy);
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
    } else if (this.dragManager?.getState().isDragging) {
      const dragState = this.dragManager.getState();
      const prevX = dragState.currentX;
      const prevY = dragState.currentY;
      this.dragManager.updateDrag(e.clientX, e.clientY);
      const updatedState = this.dragManager.getState();
      const person = this.state?.getPerson(dragState.targetId!);
      if (person) {
        const dx = (updatedState.currentX - prevX) / this.zoom;
        const dy = (updatedState.currentY - prevY) / this.zoom;
        // Use silent update during drag to avoid creating history snapshots per frame
        this.state?.updatePersonPosition(person.id, (person.x ?? 0) + dx, (person.y ?? 0) + dy);
        this.state?.notifyChange();
      }
    }
  };

  private handleMouseUp = () => {
    if (this.isPanning) {
      this.isPanning = false;
      this.lastPanPoint = null;
    }
    if (this.dragManager?.getState().isDragging) {
      this.dragManager.endDrag();
    }
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    // Line/page delta modes (some mice, Firefox) come in rows, not pixels
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    const dx = e.deltaX * unit;
    const dy = e.deltaY * unit;

    // Ctrl/Cmd + wheel, or a trackpad pinch (sent as ctrl + wheel), zooms at the cursor
    if (e.ctrlKey || e.metaKey) {
      const rect = (e.currentTarget as Element).getBoundingClientRect();
      const factor = Math.exp(-dy * 0.0015);
      this.zoomPanManager?.setZoomAroundPoint(this.zoom * factor, e.clientX - rect.left, e.clientY - rect.top);
      return;
    }

    // Plain wheel scrolls the board; Shift + wheel scrolls sideways
    if (e.shiftKey && dx === 0) {
      this.zoomPanManager?.pan(-dy, 0);
    } else {
      this.zoomPanManager?.pan(-dx, -dy);
    }
  };

  private lastTouchDist: number | null = null;

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      this.isPanning = true;
      this.lastPanPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      this.lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && this.isPanning && this.lastPanPoint) {
      const dx = e.touches[0].clientX - this.lastPanPoint.x;
      const dy = e.touches[0].clientY - this.lastPanPoint.y;
      this.zoomPanManager?.pan(dx, dy);
      this.lastPanPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && this.lastTouchDist) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / this.lastTouchDist;
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      this.zoomPanManager?.setZoomAroundPoint(this.zoom * scale, midX, midY);
      this.lastTouchDist = dist;
    }
  };

  private handleTouchEnd = () => {
    this.isPanning = false;
    this.lastPanPoint = null;
    this.lastTouchDist = null;
  };

  private hoverTimer: any = null;

  private handlePersonMouseEnter = (person: Person, e: MouseEvent) => {
    // Delay showing tooltip slightly to avoid flicker during drag
    clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(() => {
      if (this.dragManager?.getState().isDragging || this.isPanning) return;
      this.hoveredPerson = person;
      this.hoverScreenX = e.clientX;
      this.hoverScreenY = e.clientY;
    }, 300);
  };

  private handlePersonMouseLeave = () => {
    clearTimeout(this.hoverTimer);
    this.hoveredPerson = null;
  };

  private formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const m = parseInt(parts[1], 10);
      return `${parts[2]} ${months[m - 1] || ''} ${parts[0]}`;
    }
    return dateStr;
  }

  private formatYear(dateStr?: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts[0] || '';
  }

  // Render a single person node directly as SVG
  private renderPerson(person: Person) {
    const x = person.x ?? 0;
    const y = person.y ?? 0;
    const selected = this.selectedId === person.id;
    const size = DEFAULT_NODE_SIZE;

    const opts: SymbolOptions = {
      size,
      x,
      y,
      stroke: COLORS.stroke,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      isDeceased: person.isDeceased,
      type: person.type,
      conditions: person.conditions?.map(c => ({ color: c.color, quadrant: c.quadrant, name: c.name, icon: c.icon })),
      showConditionIcons: this.showConditionIcons,
    };

    // Text inside shape
    const nameLines = splitName(person.fullName ?? '');
    // Unnamed placeholders show a "?" inside the symbol
    const showPlaceholderMark = !person.fullName && !!person.isPlaceholder;
    const birthYear = this.formatYear(person.dateOfBirth);
    const deathYear = this.formatYear(person.dateOfDeath);

    // Build date string
    let dateStr = '';
    if (birthYear && deathYear) {
      dateStr = `${birthYear}-${deathYear}`;
    } else if (birthYear) {
      dateStr = `b.${birthYear}`;
    } else if (deathYear) {
      dateStr = `d.${deathYear}`;
    } else if (person.isDeceased && person.ageAtDeath !== undefined) {
      dateStr = `d. ${person.ageAtDeath}y`;
    } else if (!person.isDeceased && person.age !== undefined) {
      dateStr = `${person.age}y`;
    }

    // Name (1-2 lines) and age/dates sit below the symbol, as in standard
    // genograms, so they never cover the condition quarters
    const hasDate = dateStr.length > 0;
    const labelTop = y + size / 2 + 12;
    const dateY = labelTop + nameLines.length * 12;
    const halo = { stroke: '#ffffff', 'stroke-width': '3', 'paint-order': 'stroke' };

    return (
      <g
        class={{ 'person-node': true, 'person-node--selected': selected }}
        style={{ cursor: 'pointer' }}
        onClick={(e: MouseEvent) => this.handlePersonClick(person, e)}
        onDblClick={(e: MouseEvent) => this.handlePersonDoubleClick(person, e)}
        onMouseDown={(e: MouseEvent) => { this.handlePersonMouseLeave(); this.handlePersonMouseDown(person, e); }}
        onMouseEnter={(e: MouseEvent) => this.handlePersonMouseEnter(person, e)}
        onMouseLeave={() => this.handlePersonMouseLeave()}
        data-person-id={person.id}
      >
        {selected && this.renderSelectionGlow(person, x, y, size)}
        {renderPersonSymbol(person, opts)}
        {person.isProband && this.renderProbandArrow(x, y, size)}
        {showPlaceholderMark && (
          <text
            x={x}
            y={y}
            text-anchor="middle"
            dominant-baseline="central"
            font-size="16"
            font-weight="600"
            fill="#888"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            ?
          </text>
        )}
        {/* Name below the symbol */}
        {nameLines.map((line, i) => (
          <text
            x={x}
            y={labelTop + i * 12}
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="10.5"
            font-weight="600"
            fill={COLORS.stroke}
            {...halo}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {line}
          </text>
        ))}
        {/* Age / dates under the name */}
        {hasDate && (
          <text
            x={x}
            y={dateY}
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="8.5"
            fill="#666"
            {...halo}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {dateStr}
          </text>
        )}
      </g>
    );
  }


  /**
   * Soft halo behind the selected person, following the symbol's own outline
   * (square, circle, diamond or triangle). It is a wide stroke drawn behind
   * the symbol, so only the outer half shows as a ring.
   */
  private renderSelectionGlow(person: Person, x: number, y: number, size: number) {
    return renderSymbolOutline(person, x, y, size, {
      class: 'selection-glow',
      fill: 'none',
      stroke: COLORS.selected,
      'stroke-width': 14,
      'stroke-opacity': 0.28,
      'stroke-linejoin': 'round',
    });
  }

  /** Clinical-standard arrow (with "P") pointing at the patient from the lower left */
  private renderProbandArrow(x: number, y: number, size: number) {
    const half = size / 2;
    const tipX = x - half * 0.78;
    const tipY = y + half * 0.78;
    const tailX = tipX - 28;
    const tailY = tipY + 28;
    // Arrowhead: a small triangle pointing along the shaft (45 degrees)
    const head = `${tipX},${tipY} ${tipX - 9.5},${tipY + 2.5} ${tipX - 2.5},${tipY + 9.5}`;
    return (
      <g class="proband-arrow" style={{ pointerEvents: 'none' }}>
        <line x1={tailX} y1={tailY} x2={tipX - 4} y2={tipY + 4} stroke={COLORS.stroke} stroke-width={1.8} />
        <polygon points={head} fill={COLORS.stroke} />
        <text x={tailX - 7} y={tailY + 4} text-anchor="middle" font-size="11" font-weight="700" fill={COLORS.stroke}>P</text>
      </g>
    );
  }

  /**
   * Faint alternating bands, one per generation, labelled with Roman
   * numerals as in clinical pedigrees. Rows come from the generation the
   * layout assigned; persons without one (not laid out yet) are skipped.
   */
  private renderGenerationBands() {
    const rows = new Map<number, number[]>();
    for (const p of this.persons) {
      if (p.generation === undefined) continue;
      rows.set(p.generation, [...(rows.get(p.generation) ?? []), p.y ?? 0]);
    }
    if (rows.size < 2) return null;
    const xs = this.persons.map(p => p.x ?? 0);
    const left = Math.min(...xs) - DEFAULT_NODE_SIZE * 2;
    const width = Math.max(...xs) - left + DEFAULT_NODE_SIZE * 2;
    const gens = [...rows.keys()].sort((a, b) => a - b);
    return gens.map((g, i) => {
      const ys = rows.get(g)!;
      const cy = ys.reduce((s, v) => s + v, 0) / ys.length;
      const top = cy - GENERATION_SPACING_Y / 2;
      return (
        <g key={`gen-${g}`}>
          {i % 2 === 1 && <rect x={left - 2000} y={top} width={width + 4000} height={GENERATION_SPACING_Y} fill={COLORS.generationBand} />}
          <text
            x={left}
            y={cy}
            dominant-baseline="central"
            font-size="13"
            font-weight="600"
            letter-spacing="0.5"
            fill={COLORS.generationLabel}
            style={{ userSelect: 'none' }}
          >
            {toRoman(i + 1)}
          </text>
        </g>
      );
    });
  }

  // Render a single relationship line directly as SVG
  private renderRelationship(rel: Relationship, faded = false) {
    const p1 = this.persons.find(p => p.id === rel.person1Id);
    const p2 = this.persons.find(p => p.id === rel.person2Id);
    if (!p1 || !p2) return null;

    const selected = this.selectedId === rel.id;
    const opts: LineOptions = {
      x1: p1.x ?? 0,
      y1: p1.y ?? 0,
      x2: p2.x ?? 0,
      y2: p2.y ?? 0,
      strokeWidth: selected ? SELECTED_STROKE_WIDTH : 1.6,
    };


    return (
      <g
        class={{ 'relationship-edge': true, 'relationship-edge--selected': selected }}
        style={{ cursor: 'pointer' }}
        opacity={faded ? 0.3 : 1}
        onClick={(e: MouseEvent) => this.handleRelClick(rel, e)}
        data-relationship-id={rel.id}
      >
        <line
          x1={opts.x1}
          y1={opts.y1}
          x2={opts.x2}
          y2={opts.y2}
          stroke="transparent"
          stroke-width="12"
        />
        {renderRelationshipLine(rel.type, opts)}
        {isConsanguineous(rel) && renderConsanguinityMarker(opts, rel.consanguinityRelation === 'unknown')}
      </g>
    );
  }

  /**
   * Relationships to emphasise: when a person is hovered or selected, their
   * couples, the lines to their children and the line from their parents;
   * when a couple is selected, that couple. Everything else is faded.
   */
  private focusRelationshipIds(): Set<string> | null {
    const selectedRel = this.selectedId ? this.relationships.find(r => r.id === this.selectedId) : undefined;
    if (selectedRel && !this.hoveredPerson) return new Set([selectedRel.id]);
    const personId = this.hoveredPerson?.id ?? (this.persons.some(p => p.id === this.selectedId) ? this.selectedId : null);
    if (!personId) return null;
    const ids = new Set<string>();
    for (const r of this.relationships) {
      if (r.person1Id === personId || r.person2Id === personId || r.childrenIds?.includes(personId)) ids.add(r.id);
    }
    return ids;
  }

  /** Lines from each couple to their children, with hops at crossings and dots at real junctions */
  private renderFamilyConnectors(focus: Set<string> | null) {
    const families = computeFamilyConnectors(this.persons, this.relationships);
    // Draw faded families first so highlighted lines sit on top
    const ordered = [...families].sort((a, b) => Number(!!focus?.has(a.id)) - Number(!!focus?.has(b.id)));
    return ordered.map(f => {
      const { d, junctions } = buildConnectorPath(f, families);
      const highlighted = !!focus?.has(f.id);
      const faded = !!focus && !highlighted;
      const color = highlighted ? COLORS.selected : COLORS.child;
      return (
        <g key={`family-${f.id}`} class={{ 'family-connector': true, 'family-connector--faded': faded }} opacity={faded ? 0.22 : 1}>
          <path d={d} fill="none" stroke={color} stroke-width={highlighted ? 2.2 : 1.6} stroke-linejoin="round" />
          {junctions.map(j => <circle cx={j.x} cy={j.y} r={highlighted ? 3 : 2.6} fill={color} />)}
        </g>
      );
    });
  }

  private renderTooltip() {
    const p = this.hoveredPerson;
    if (!p) return null;

    // Position tooltip relative to the canvas container
    const svgEl = this.el?.querySelector('.genogram-canvas') as SVGElement;
    if (!svgEl) return null;
    const svgRect = svgEl.getBoundingClientRect();
    const left = this.hoverScreenX - svgRect.left + 16;
    const top = this.hoverScreenY - svgRect.top - 10;

    const name = p.fullName || 'Unnamed';
    const genderLabel = p.gender === 'male' ? 'Male' : p.gender === 'female' ? 'Female' : 'Unknown';
    const typeLabel = p.type !== 'standard' ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : '';
    const conditions = p.conditions || [];

    return (
      <div
        class="person-tooltip"
        style={{
          position: 'absolute',
          left: `${left}px`,
          top: `${top}px`,
          zIndex: '1000',
          pointerEvents: 'none',
        }}
      >
        <div class="person-tooltip__name">{name}</div>
        <div class="person-tooltip__meta">
          {genderLabel}{typeLabel ? ` \u00B7 ${typeLabel}` : ''}
          {p.isDeceased ? ' \u00B7 Deceased' : ''}
          {p.isProband ? ' \u00B7 Proband' : ''}
          {p.isPlaceholder ? ' \u00B7 Placeholder' : ''}
        </div>
        {p.age !== undefined && !p.isDeceased && (
          <div class="person-tooltip__row">
            <span class="person-tooltip__label">Age</span>
            <span>{p.age}</span>
          </div>
        )}
        {p.ageAtDeath !== undefined && p.isDeceased && (
          <div class="person-tooltip__row">
            <span class="person-tooltip__label">Age at death</span>
            <span>{p.ageAtDeath}</span>
          </div>
        )}
        {p.dateOfBirth && (
          <div class="person-tooltip__row">
            <span class="person-tooltip__label">Born</span>
            <span>{this.formatDate(p.dateOfBirth)}</span>
          </div>
        )}
        {p.dateOfDeath && (
          <div class="person-tooltip__row">
            <span class="person-tooltip__label">Died</span>
            <span>{this.formatDate(p.dateOfDeath)}</span>
          </div>
        )}
        {conditions.length > 0 && (
          <div class="person-tooltip__conditions">
            <span class="person-tooltip__label">Conditions</span>
            {conditions.map(c => (
              <div class="person-tooltip__condition">
                <span
                  class="person-tooltip__dot"
                  style={{ backgroundColor: c.color }}
                />
                <span>{c.name}</span>
              </div>
            ))}
          </div>
        )}
        {p.notes && (
          <div class="person-tooltip__notes">{p.notes}</div>
        )}
      </div>
    );
  }

  render() {
    const transform = `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`;
    const focus = this.focusRelationshipIds();

    return (
      <div class="genogram-canvas-container" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <svg
          class="genogram-canvas"
          onMouseDown={this.handleMouseDown}
          onMouseMove={this.handleMouseMove}
          onMouseUp={this.handleMouseUp}
          onMouseLeave={() => { this.handleMouseUp(); this.handlePersonMouseLeave(); }}
          onWheel={this.handleWheel}
          onTouchStart={this.handleTouchStart}
          onTouchMove={this.handleTouchMove}
          onTouchEnd={this.handleTouchEnd}
          onClick={this.handleBackgroundClick}
        >
          <g class="genogram-transform" transform={transform}>
            {/* Generation rows (I, II, III, ...) behind everything */}
            <g class="generation-layer">{this.renderGenerationBands()}</g>

            {/* Relationship edges (below nodes) */}
            <g class="relationship-layer">
              {this.relationships
                .filter(r => r.type !== 'child')
                .map(rel => this.renderRelationship(rel, !!focus && !focus.has(rel.id)))}
            </g>

            {/* Child connector lines */}
            <g class="child-line-layer">{this.renderFamilyConnectors(focus)}</g>

            {/* Person nodes on top */}
            <g class="person-layer">
              {this.persons.map(person => this.renderPerson(person))}
            </g>

            {/* Consanguinity labels above the couples, over the nodes */}
            <g class="consanguinity-label-layer">
              {this.relationships
                .filter(r => r.type !== 'child' && isConsanguineous(r))
                .map(rel => {
                  const p1 = this.persons.find(p => p.id === rel.person1Id);
                  const p2 = this.persons.find(p => p.id === rel.person2Id);
                  if (!p1 || !p2) return null;
                  const x = ((p1.x ?? 0) + (p2.x ?? 0)) / 2;
                  const top = Math.min(p1.y ?? 0, p2.y ?? 0) - DEFAULT_NODE_SIZE / 2 - 7;
                  return renderConsanguinityLabel(x, top, consanguinityLabel(rel));
                })}
            </g>
          </g>
        </svg>
        {this.renderTooltip()}
      </div>
    );
  }
}

