import { matchConditionIcon, iconInkFor } from './condition-icons';

describe('matchConditionIcon', () => {
  it.each([
    ['Heart disease', 'heart'],
    ['Myocardial infarction', 'heart'],
    ['Hypertension', 'heart'],
    ['Type 2 diabetes', 'drop'],
    ['Breast cancer', 'ribbon'],
    ['Lung cancer', 'ribbon'], // cancer wins over lung
    ['Leukaemia', 'ribbon'],
    ['Stroke', 'bolt'],
    ['Anxiety', 'mind'],
    ['Bipolar disorder', 'mind'],
    ['Dementia', 'mind'],
    ['Asthma', 'lungs'],
    ['COPD', 'lungs'],
    ['Alcohol misuse', 'glass'],
    ['Substance misuse', 'pill'],
  ])('%s -> %s', (name, icon) => {
    expect(matchConditionIcon(name)).toBe(icon);
  });

  it('returns undefined when nothing matches, so the first letter is drawn', () => {
    expect(matchConditionIcon('Migraine')).toBeUndefined();
  });

  it('prefers an explicit icon over the name', () => {
    expect(matchConditionIcon('Migraine', 'mind')).toBe('mind');
  });
});

describe('iconInkFor', () => {
  it('uses white on dark fills and dark ink on light fills', () => {
    expect(iconInkFor('#1e88e5')).toBe('#ffffff');
    expect(iconInkFor('#ffeb3b')).toBe('#1f2937');
  });

  it('falls back to white for colours it cannot read', () => {
    expect(iconInkFor('red')).toBe('#ffffff');
  });
});
