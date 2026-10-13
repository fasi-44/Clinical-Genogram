import { splitName } from './name';

describe('splitName', () => {
  it('keeps short names on one line', () => {
    expect(splitName('Mary Smith')).toEqual(['Mary Smith']);
  });

  it('returns no lines for an empty name', () => {
    expect(splitName('')).toEqual([]);
  });

  it('splits long names at the space nearest the middle', () => {
    expect(splitName('Sarah Johnson-Lee')).toEqual(['Sarah', 'Johnson-Lee']);
    expect(splitName('Anna Maria Jones')).toEqual(['Anna Maria', 'Jones']);
  });

  it('truncates parts that are still too long', () => {
    expect(splitName('Bartholomewsworth')).toEqual(['Bartholomews…']);
    expect(splitName('Al Bartholomewsworthington')[1]).toMatch(/…$/);
  });
});
