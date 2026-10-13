import { h } from '@stencil/core';
import { Person, SymbolOptions } from '../types';
import { COLORS } from '../utils/constants';

// Connector renderers (only re-exported, not used in dispatcher)
export { renderTwinsConnector, TwinsConnectorOptions } from './twins-connector';
export { renderIdenticalTwinsConnector } from './identical-twins-connector';

// Import all renderers used by the dispatcher
import { renderMaleSymbol } from './male';
import { renderFemaleSymbol } from './female';
import { renderGenderUnknownSymbol } from './gender-unknown';
import { renderPetSymbol } from './pet';
import { renderPregnancySymbol } from './pregnancy';
import { renderMiscarriageSymbol } from './miscarriage';
import { renderAbortionSymbol } from './abortion';
import { renderAdoptedOverlay } from './adopted-overlay';
import { renderFosterOverlay } from './foster-overlay';
import { renderDeathOverlay } from './death-overlay';
import { renderConditionIndicator } from './condition-indicator';

// Re-export all renderers
export {
  renderMaleSymbol,
  renderFemaleSymbol,
  renderGenderUnknownSymbol,
  renderPetSymbol,
  renderPregnancySymbol,
  renderMiscarriageSymbol,
  renderAbortionSymbol,
  renderAdoptedOverlay,
  renderFosterOverlay,
  renderDeathOverlay,
  renderConditionIndicator,
};

/**
 * Dispatcher that composes the correct symbol and overlays for a
 * given Person. It:
 *   1. Chooses the base symbol based on person type and gender.
 *   2. Layers on condition indicators if the person has conditions.
 *   3. Layers on adopted / foster overlays when appropriate.
 *   4. Layers on the death overlay if the person is deceased.
 *
 * Returns a `<g>` element containing all composed layers.
 */
/**
 * Order of the slices when a person has 5 or more conditions: those with a
 * quarter first (clockwise from top-left), then the rest in the order they
 * were added. With more than MAX_CONDITION_SLICES, everything from the
 * last slice on is summarised as "+N".
 */
export function orderConditionSlices<T extends { quadrant?: number }>(conditions: T[]): T[] {
  const clockwise = [1, 2, 4, 3];
  return [
    ...conditions.filter(c => c.quadrant !== undefined).sort((a, b) => clockwise.indexOf(a.quadrant!) - clockwise.indexOf(b.quadrant!)),
    ...conditions.filter(c => c.quadrant === undefined),
  ];
}

/** Gives conditions without a quarter (or sharing one) the next free quarter. */
function withFreeQuarters<T extends { quadrant?: number }>(conditions: T[]): T[] {
  const used = new Set<number>();
  const placed = conditions.map(c => {
    if (c.quadrant === undefined || used.has(c.quadrant)) return { ...c, quadrant: undefined };
    used.add(c.quadrant);
    return c;
  });
  return placed.map(c => {
    if (c.quadrant !== undefined) return c;
    const free = [1, 2, 3, 4].find(q => !used.has(q))!;
    used.add(free);
    return { ...c, quadrant: free };
  });
}

export function renderPersonSymbol(person: Person, opts: SymbolOptions): any {
  const layers: any[] = [];

  // Carry the gender/type through to overlays so they can adapt shape
  const genderType = person.gender === 'female' ? 'female' : 'male';
  const overlayOpts: SymbolOptions = { ...opts, type: genderType };

  // ---- 1. Base symbol ----
  // Placeholders (unknown relatives) get a greyed fill and dashed outline
  const baseOpts: SymbolOptions = person.isPlaceholder
    ? { ...opts, fill: COLORS.placeholderFill, dashed: true }
    : opts;
  switch (person.type) {
    case 'pregnancy':
      layers.push(renderPregnancySymbol(baseOpts));
      break;
    case 'miscarriage':
      layers.push(renderMiscarriageSymbol(baseOpts));
      break;
    case 'abortion':
      layers.push(renderAbortionSymbol(baseOpts));
      break;
    case 'pet':
      layers.push(renderPetSymbol(baseOpts));
      break;
    default:
      // standard, adopted, foster, stillbirth -- use gender symbol
      switch (person.gender) {
        case 'female':
          layers.push(renderFemaleSymbol(baseOpts));
          break;
        case 'male':
          layers.push(renderMaleSymbol(baseOpts));
          break;
        case 'unknown':
        default:
          layers.push(renderGenderUnknownSymbol(baseOpts));
          break;
      }
      break;
  }

  // ---- 2. Condition indicators ----
  if (person.conditions && person.conditions.length > 0) {
    // Up to 4: each condition fills its quarter (or a free one). 5 or more: slices
    const all = person.conditions.map(c => ({ color: c.color, quadrant: c.quadrant, name: c.name, icon: c.icon }));
    const conditionEntries = all.length > 4 ? orderConditionSlices(all) : withFreeQuarters(all);

    if (conditionEntries.length > 0) {
      layers.push(
        renderConditionIndicator({
          ...overlayOpts,
          conditions: conditionEntries,
        }),
      );
    }
  }

  // ---- 3. Adopted / Foster overlays ----
  if (person.type === 'adopted') {
    layers.push(renderAdoptedOverlay(overlayOpts));
  } else if (person.type === 'foster') {
    layers.push(renderFosterOverlay(overlayOpts));
  }

  // ---- 4. Death overlay ----
  if (person.isDeceased) {
    layers.push(renderDeathOverlay(overlayOpts));
  }

  return (
    <g class="person-symbol" data-person-id={person.id}>
      {layers}
    </g>
  );
}
