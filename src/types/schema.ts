import { Person } from './nodes';
import { Relationship } from './relationships';
import { ConditionIconName } from './nodes';

export interface GenogramData {
  version: string;
  persons: Person[];
  relationships: Relationship[];
  metadata?: GenogramMetadata;
}

export interface GenogramMetadata {
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  author?: string;
  description?: string;
}

export interface LayoutData {
  positions: Map<string, { x: number; y: number }>;
  generations: Map<string, number>;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface ThemeConfig {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  primaryColor: string;
  dangerColor: string;
  successColor: string;
  warningColor: string;
  nodeSize: number;
  fontFamily: string;
  strokeWidth: number;
  selectedStrokeColor: string;
  selectedStrokeWidth: number;
}

export interface SymbolOptions {
  size: number;
  x: number;
  y: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  isDeceased?: boolean;
  type?: string;
  /**
   * Up to 4 conditions fill the quarters given by `quadrant`. With 5 or more,
   * the symbol is split into equal slices in array order and `quadrant` is ignored.
   */
  conditions?: { color: string; quadrant?: number; name?: string; icon?: ConditionIconName }[];
  /** Draw each condition's icon (or first letter) inside its quarter or slice */
  showConditionIcons?: boolean;
  /** Dashed, greyed outline for placeholder persons (unknown relatives) */
  dashed?: boolean;
}

export interface LineOptions {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth?: number;
  /** Child lines only: y of the horizontal rail (defaults to midway between y1 and y2). */
  railY?: number;
}
