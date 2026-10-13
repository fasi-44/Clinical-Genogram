export const DEFAULT_NODE_SIZE = 80;
export const DEFAULT_STROKE_WIDTH = 1.8;
export const SELECTED_STROKE_WIDTH = 3;
export const GENERATION_SPACING_Y = 180;
/** Gap from the bottom of a parent's symbol to the children's horizontal line (clears the name and age labels) */
export const RAIL_BELOW_LABELS = 62;
export const SIBLING_SPACING_X = 140;
export const COUPLE_SPACING_X = 110;
/** Extra horizontal gap between neighbouring blocks that are not siblings. */
export const FAMILY_GAP_X = 40;
export const CHILD_LINE_DROP = 40;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3.0;
export const ZOOM_STEP = 0.1;
/** Fit-to-view never zooms in past this, so small trees aren't blown up */
export const FIT_MAX_ZOOM = 1.5;
export const HISTORY_LIMIT = 50;

export const COLORS = {
  // Gender is shown by shape, as in clinical genograms, so symbols are plain white
  male: '#ffffff',
  female: '#ffffff',
  unknown: '#ffffff',
  pet: '#e8f5e9',
  stroke: '#24323b',
  selected: '#2563eb',
  deceased: '#24323b',
  marriage: '#5b6b75',
  separation: '#ff9800',
  divorce: '#f44336',
  engagement: '#2196f3',
  cohabitation: '#9c27b0',
  casual: '#607d8b',
  committed: '#3f51b5',
  temporary: '#795548',
  loveAffair: '#e91e63',
  nullity: '#9e9e9e',
  adopted: '#1565c0',
  foster: '#2e7d32',
  pregnancy: '#ffffff',
  miscarriage: '#333333',
  abortion: '#333333',
  child: '#5b6b75',
  placeholderFill: '#eef2f5',
  generationBand: '#f3f6f8',
  generationLabel: '#8796a0',
  consanguinity: '#b45309',
} as const;

export const STROKE_PATTERNS = {
  solid: '',
  dashed: '8,4',
  dotted: '3,3',
  dashDot: '10,4,3,4',
  dashDotDot: '10,4,3,4,3,4',
} as const;

export const DEFAULT_THEME = {
  backgroundColor: '#ffffff',
  textColor: '#333333',
  borderColor: '#cccccc',
  primaryColor: '#2196f3',
  dangerColor: '#f44336',
  successColor: '#4caf50',
  warningColor: '#ff9800',
  nodeSize: DEFAULT_NODE_SIZE,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  strokeWidth: DEFAULT_STROKE_WIDTH,
  selectedStrokeColor: '#2196f3',
  selectedStrokeWidth: SELECTED_STROKE_WIDTH,
};

/** Suggested conditions offered by the intake questionnaire. */
export const COMMON_CONDITIONS = [
  'Heart disease',
  'Hypertension',
  'Stroke',
  'Type 2 diabetes',
  'Cancer',
  'Breast cancer',
  'Depression',
  'Anxiety',
  'Bipolar disorder',
  'Schizophrenia',
  'Alcohol misuse',
  'Substance misuse',
  'Dementia',
  'Asthma',
];

/** Colours assigned, in order, to conditions that don't already have one. */
export const CONDITION_PALETTE = [
  '#e53935',
  '#1e88e5',
  '#43a047',
  '#fb8c00',
  '#8e24aa',
  '#00897b',
  '#6d4c41',
  '#d81b60',
  '#3949ab',
  '#7cb342',
];
