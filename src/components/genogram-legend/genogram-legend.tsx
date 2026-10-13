import { Component, Prop, State, h } from '@stencil/core';
import { ClinicalCondition } from '../../types';
import { iconInkFor, matchConditionIcon, renderConditionGlyph } from '../../symbols/condition-icons';
import { renderMaleSymbol } from '../../symbols/male';
import { renderFemaleSymbol } from '../../symbols/female';
import { renderGenderUnknownSymbol } from '../../symbols/gender-unknown';
import { renderPregnancySymbol } from '../../symbols/pregnancy';
import { renderMiscarriageSymbol } from '../../symbols/miscarriage';
import { renderAbortionSymbol } from '../../symbols/abortion';
// Import line renderers
import { renderMarriageLine } from '../../lines/marriage';
import { renderSeparationLine } from '../../lines/separation';
import { renderDivorceLine } from '../../lines/divorce';
import { renderEngagementLine } from '../../lines/engagement';
import { renderCohabitationLine } from '../../lines/cohabitation';
import { renderLoveAffairLine } from '../../lines/love-affair';
import { renderConsanguinityMarker } from '../../lines/consanguinity-marker';

@Component({ tag: 'genogram-legend', styleUrl: 'genogram-legend.css', shadow: false })
export class GenogramLegend {
  @State() open: boolean = true;

  /** Conditions present on the tree, listed with their colour (and icon) */
  @Prop() conditions: ClinicalCondition[] = [];
  @Prop() showConditionIcons: boolean = true;

  private toggle = () => {
    this.open = !this.open;
  };

  render() {
    const symbolSize = 24;
    const symbolOpts = { size: symbolSize, x: symbolSize / 2 + 4, y: symbolSize / 2 + 4, strokeWidth: 1.5 };
    const lineOpts = { x1: 4, y1: 12, x2: 60, y2: 12, strokeWidth: 1.5 };

    return (
      <div class={{ 'genogram-legend': true, 'genogram-legend--collapsed': !this.open }}>
        <button class="legend-toggle" onClick={this.toggle} title={this.open ? 'Hide legend' : 'Show legend'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            {this.open
              ? [<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />, <line x1="3" y1="9" x2="21" y2="9" />, <line x1="9" y1="21" x2="9" y2="9" />]
              : [<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />, <line x1="3" y1="9" x2="21" y2="9" />, <line x1="9" y1="21" x2="9" y2="9" />]
            }
          </svg>
          <span>Legend</span>
          <svg class={{ 'legend-chevron': true, 'legend-chevron--up': this.open }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {this.open && (
          <div class="legend-body">
            <h4>Symbols</h4>
            <div class="legend-grid">
              <div class="legend-item">
                <svg width={symbolSize + 8} height={symbolSize + 8}>{renderMaleSymbol(symbolOpts)}</svg>
                <span>Male</span>
              </div>
              <div class="legend-item">
                <svg width={symbolSize + 8} height={symbolSize + 8}>{renderFemaleSymbol(symbolOpts)}</svg>
                <span>Female</span>
              </div>
              <div class="legend-item">
                <svg width={symbolSize + 8} height={symbolSize + 8}>{renderGenderUnknownSymbol(symbolOpts)}</svg>
                <span>Unknown</span>
              </div>
              <div class="legend-item">
                <svg width={symbolSize + 8} height={symbolSize + 8}>{renderPregnancySymbol(symbolOpts)}</svg>
                <span>Pregnancy</span>
              </div>
              <div class="legend-item">
                <svg width={symbolSize + 8} height={symbolSize + 8}>{renderMiscarriageSymbol(symbolOpts)}</svg>
                <span>Miscarriage</span>
              </div>
              <div class="legend-item">
                <svg width={symbolSize + 8} height={symbolSize + 8}>{renderAbortionSymbol(symbolOpts)}</svg>
                <span>Abortion</span>
              </div>
            </div>

            <h4>Relationships</h4>
            <div class="legend-grid">
              <div class="legend-item">
                <svg width="64" height="24">{renderMarriageLine(lineOpts)}</svg>
                <span>Marriage</span>
              </div>
              <div class="legend-item">
                <svg width="64" height="24">{renderSeparationLine(lineOpts)}</svg>
                <span>Separation</span>
              </div>
              <div class="legend-item">
                <svg width="64" height="24">{renderDivorceLine(lineOpts)}</svg>
                <span>Divorce</span>
              </div>
              <div class="legend-item">
                <svg width="64" height="24">{renderEngagementLine(lineOpts)}</svg>
                <span>Engagement</span>
              </div>
              <div class="legend-item">
                <svg width="64" height="24">{renderCohabitationLine(lineOpts)}</svg>
                <span>Cohabitation</span>
              </div>
              <div class="legend-item">
                <svg width="64" height="24">{renderLoveAffairLine(lineOpts)}</svg>
                <span>Love Affair</span>
              </div>
              <div class="legend-item">
                <svg width="64" height="24">
                  {renderMarriageLine({ ...lineOpts, y1: 9, y2: 9 })}
                  {renderConsanguinityMarker({ ...lineOpts, y1: 9, y2: 9 })}
                </svg>
                <span>Blood relatives</span>
              </div>
            </div>

            {this.conditions.length > 0 && [
              <h4>Conditions</h4>,
              <div class="legend-grid">
                {this.conditions.map(c => (
                  <div class="legend-item" key={c.id}>
                    <svg width="22" height="22" viewBox="0 0 22 22">
                      <rect x="1" y="1" width="20" height="20" rx="3" fill={c.color} />
                      {this.showConditionIcons &&
                        renderConditionGlyph(c.name, matchConditionIcon(c.name, c.icon), 11, 11, 14, iconInkFor(c.color))}
                    </svg>
                    <span>{c.name}</span>
                  </div>
                ))}
              </div>,
            ]}

            <h4>Overlays</h4>
            <div class="legend-grid">
              <div class="legend-item">
                <svg width="28" height="24" viewBox="0 0 28 24">
                  <line x1="4" y1="20" x2="17" y2="7" stroke="#24323b" stroke-width="1.6" />
                  <polygon points="21,3 13,5.5 18.5,11" fill="#24323b" />
                </svg>
                <span>Patient</span>
              </div>
              <div class="legend-item">
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" fill="#eef2f5" stroke="#24323b" stroke-width="1.4" stroke-dasharray="3 2.5" stroke-opacity="0.6" />
                  <text x="12" y="12.5" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="600" fill="#8796a0">?</text>
                </svg>
                <span>Unknown person</span>
              </div>
              <div class="legend-item">
                <span class="legend-swatch legend-swatch--deceased">{'\u2715'}</span>
                <span>Deceased</span>
              </div>
              <div class="legend-item">
                <span class="legend-swatch legend-swatch--adopted" style={{ border: '2px dashed #1565c0', width: '20px', height: '20px', display: 'inline-block' }}></span>
                <span>Adopted</span>
              </div>
              <div class="legend-item">
                <span class="legend-swatch legend-swatch--foster" style={{ border: '2px dotted #2e7d32', width: '20px', height: '20px', display: 'inline-block' }}></span>
                <span>Foster</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
