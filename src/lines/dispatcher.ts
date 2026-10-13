import { LineOptions, RelationshipType } from '../types';
import { renderMarriageLine } from './marriage';
import { renderSeparationLine } from './separation';
import { renderLegalSeparationLine } from './legal-separation';
import { renderDivorceLine } from './divorce';
import { renderEngagementLine } from './engagement';
import { renderCohabitationLine } from './cohabitation';
import { renderCohabitationSeparationLine } from './cohabitation-separation';
import { renderCohabitationLegalSeparationLine } from './cohabitation-legal-separation';
import { renderCohabitationDivorceLine } from './cohabitation-divorce';
import { renderCasualLine } from './casual';
import { renderCommittedLine } from './committed';
import { renderTemporaryLine } from './temporary';
import { renderCasualSeparationLine } from './casual-separation';
import { renderCommittedSeparationLine } from './committed-separation';
import { renderTemporarySeparationLine } from './temporary-separation';
import { renderLoveAffairLine } from './love-affair';
import { renderNullityLine } from './nullity';
import { renderChildLine } from './child-line';

/**
 * Dispatches to the correct line renderer based on the relationship type.
 *
 * @param type - The relationship type to render
 * @param opts - Line positioning and styling options
 * @returns JSX element for the relationship line, or null for unknown types
 */
export function renderRelationshipLine(type: RelationshipType, opts: LineOptions): any {
  switch (type) {
    case 'marriage':
      return renderMarriageLine(opts);
    case 'separation':
      return renderSeparationLine(opts);
    case 'legal-separation':
      return renderLegalSeparationLine(opts);
    case 'divorce':
      return renderDivorceLine(opts);
    case 'engagement':
      return renderEngagementLine(opts);
    case 'cohabitation':
      return renderCohabitationLine(opts);
    case 'cohabitation-separation':
      return renderCohabitationSeparationLine(opts);
    case 'cohabitation-legal-separation':
      return renderCohabitationLegalSeparationLine(opts);
    case 'cohabitation-divorce':
      return renderCohabitationDivorceLine(opts);
    case 'casual':
      return renderCasualLine(opts);
    case 'committed':
      return renderCommittedLine(opts);
    case 'temporary':
      return renderTemporaryLine(opts);
    case 'casual-separation':
      return renderCasualSeparationLine(opts);
    case 'committed-separation':
      return renderCommittedSeparationLine(opts);
    case 'temporary-separation':
      return renderTemporarySeparationLine(opts);
    case 'love-affair':
      return renderLoveAffairLine(opts);
    case 'nullity':
      return renderNullityLine(opts);
    case 'child':
      return renderChildLine(opts);
    default:
      return null;
  }
}
