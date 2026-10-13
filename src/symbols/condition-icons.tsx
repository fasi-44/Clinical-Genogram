import { h } from '@stencil/core';
import { ConditionIconName } from '../types';

/** 24x24 glyphs, drawn as filled paths (even-odd for cut-outs) */
const ICON_PATHS: Record<ConditionIconName, string> = {
  heart:
    'M12 21s-7.4-4.6-9.5-9.2C1 8.4 3.1 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.7 0 5.8 3.9 4.3 7.3C19.4 16.4 12 21 12 21z',
  drop: 'M12 2.5c3.6 4.7 7 8.6 7 12.3a7 7 0 0 1-14 0c0-3.7 3.4-7.6 7-12.3z',
  ribbon:
    'M12 2c-2.6 0-4.4 2-4.4 4.5 0 1.9 1 3.6 2.3 5.7L5.4 20.2l2.7 1.6L12 15l3.9 6.8 2.7-1.6-4.5-8c1.3-2.1 2.3-3.8 2.3-5.7C16.4 4 14.6 2 12 2zm0 2.6c1 0 1.7.8 1.7 1.9 0 1-.6 2.2-1.7 3.9-1.1-1.7-1.7-2.9-1.7-3.9 0-1.1.7-1.9 1.7-1.9z',
  mind:
    'M9.5 3A3.2 3.2 0 0 0 6.3 6 3.3 3.3 0 0 0 3.8 11a3.3 3.3 0 0 0 1.4 5.4A3.3 3.3 0 0 0 9.3 21h1.4V3H9.5zm5 0a3.2 3.2 0 0 1 3.2 3 3.3 3.3 0 0 1 2.5 5 3.3 3.3 0 0 1-1.4 5.4 3.3 3.3 0 0 1-4.1 4.6h-1.4V3h1.2z',
  lungs:
    'M11 3h2v7.2l2.2 1.6V8.5c0-1.6 1-2.9 2.4-2.9 2.5 0 4.4 5.2 4.4 10.4 0 2.6-1.4 4-3.6 4-2.6 0-5-1-5-3.6v-3.2L12 12l-1.4 1.2v3.2c0 2.6-2.4 3.6-5 3.6C3.4 20 2 18.6 2 16 2 10.8 3.9 5.6 6.4 5.6c1.4 0 2.4 1.3 2.4 2.9v3.3L11 10.2V3z',
  glass: 'M5 3h14l-1.6 6.5A5.5 5.5 0 0 1 13 13.9V19h3v2H8v-2h3v-5.1a5.5 5.5 0 0 1-4.4-4.4L5 3zm2.6 2 .9 3.9h7l.9-3.9H7.6z',
  pill:
    'M15.5 3.5a5 5 0 0 1 3.5 8.5l-7 7a5 5 0 0 1-7-7l7-7a5 5 0 0 1 3.5-1.5zm-6.1 5.5L6.5 11.9a3 3 0 0 0 4.2 4.3l2.9-2.9-4.2-4.3z',
  bolt: 'M13.5 2 4.5 13.5h6L9.5 22l10-12.5h-6.2L13.5 2z',
};

/**
 * Keyword rules mapping a condition name to an icon. Order matters: the
 * first match wins (e.g. "lung cancer" is a cancer, not a lung condition).
 */
const ICON_RULES: [RegExp, ConditionIconName][] = [
  [/cancer|tumou?r|carcinoma|leuk(a)?emia|lymphoma|melanoma|sarcoma|myeloma|malignan|oncolog/i, 'ribbon'],
  [/stroke|\bcva\b|cerebrovascular|\btia\b|transient ischa?emic/i, 'bolt'],
  [/heart|cardi|coronary|myocard|angina|\bmi\b|hypertens|blood pressure|arrhythm|atrial/i, 'heart'],
  [/diabet|glucose|insulin/i, 'drop'],
  [/alcohol|drink/i, 'glass'],
  [/substance|drug|opioid|cocaine|heroin|cannabis|addict|overdose/i, 'pill'],
  [/asthma|copd|lung|respirat|bronch|emphysema|cystic fibrosis|pulmonary/i, 'lungs'],
  [/anxiety|depress|bipolar|schizo|psych|mental|\bptsd\b|\bocd\b|panic|eating disorder|anorexia|bulimia|suicid|adhd|autis|dementia|alzheimer|parkinson|epilep|seizure/i, 'mind'],
];

/** Icon for a condition: its explicit `icon`, else a keyword match on the name, else none */
export function matchConditionIcon(name: string, explicit?: ConditionIconName): ConditionIconName | undefined {
  if (explicit) return explicit;
  return ICON_RULES.find(([re]) => re.test(name))?.[1];
}

/** Text colour that stays readable on a quarter of the given fill colour */
export function iconInkFor(fill: string): string {
  const hex = fill.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return '#ffffff';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.65 ? '#1f2937' : '#ffffff';
}

/**
 * Draws a condition's icon centred on (cx, cy), or its first letter when no
 * icon matches, so free-text conditions are still identifiable.
 */
export function renderConditionGlyph(
  name: string,
  icon: ConditionIconName | undefined,
  cx: number,
  cy: number,
  size: number,
  color: string,
): any {
  if (!icon) {
    const letter = name.trim().charAt(0).toUpperCase() || '?';
    return (
      <text
        class="condition-glyph"
        x={cx}
        y={cy}
        text-anchor="middle"
        dominant-baseline="central"
        font-size={size * 0.85}
        font-weight="700"
        fill={color}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {letter}
      </text>
    );
  }
  const scale = size / 24;
  return (
    <path
      class="condition-glyph"
      d={ICON_PATHS[icon]}
      fill={color}
      fill-rule="evenodd"
      transform={`translate(${cx - size / 2} ${cy - size / 2}) scale(${scale})`}
      style={{ pointerEvents: 'none' }}
    />
  );
}
