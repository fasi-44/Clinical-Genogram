import * as fs from 'fs';
import * as path from 'path';
import { computeFamilyConnectors, buildConnectorPath, RAIL_LANE_SPACING } from './connectors';
import { LayoutEngine } from '../core/LayoutEngine';
import { GenogramData, Person, Relationship } from '../types';

const person = (id: string, x: number, y: number): Person => ({
  id, x, y, gender: 'unknown', type: 'standard', isDeceased: false, isProband: false, conditions: [],
});
const family = (id: string, a: string, b: string, kids: string[]): Relationship => ({
  id, type: 'marriage', person1Id: a, person2Id: b, childrenIds: kids, consanguinity: 'none',
});

describe('computeFamilyConnectors', () => {
  it('stacks overlapping rails in separate lanes, widest on top', () => {
    const persons = [
      person('a', 0, 0), person('b', 110, 0), person('c', 220, 0), person('d', 330, 0),
      person('k1', -100, 180), person('k2', 400, 180), person('k3', 200, 180),
    ];
    const rels = [family('wide', 'a', 'b', ['k1', 'k2']), family('narrow', 'c', 'd', ['k3'])];
    const [wide, narrow] = computeFamilyConnectors(persons, rels);
    expect(narrow.railY - wide.railY).toBe(RAIL_LANE_SPACING);
  });

  it('keeps rails of families that do not overlap at the same height', () => {
    const persons = [
      person('a', 0, 0), person('b', 110, 0), person('c', 500, 0), person('d', 610, 0),
      person('k1', 55, 180), person('k2', 555, 180),
    ];
    const [f1, f2] = computeFamilyConnectors(persons, [family('f1', 'a', 'b', ['k1']), family('f2', 'c', 'd', ['k2'])]);
    expect(f1.railY).toBe(f2.railY);
  });
});

describe('buildConnectorPath', () => {
  it('marks real branch points with junction dots', () => {
    const persons = [person('a', 0, 0), person('b', 110, 0), person('k1', -60, 180), person('k2', 55, 180), person('k3', 170, 180)];
    const all = computeFamilyConnectors(persons, [family('f', 'a', 'b', ['k1', 'k2', 'k3'])]);
    const { junctions } = buildConnectorPath(all[0], all);
    // The parent drop meets the rail in the middle; k1 and k3 are corners, k2 is straight under the parents
    expect(junctions).toEqual([{ x: 55, y: all[0].railY }]);
  });

  it('draws a single straight line when the only child is directly below', () => {
    const persons = [person('a', 0, 0), person('b', 110, 0), person('k', 55, 180)];
    const all = computeFamilyConnectors(persons, [family('f', 'a', 'b', ['k'])]);
    const { d, junctions } = buildConnectorPath(all[0], all);
    expect(d).toMatch(/^M55 0 V\d+/);
    expect(d).not.toContain('H');
    expect(junctions).toHaveLength(0);
  });

  it('adds hops where lines cross in the consanguinity sample', () => {
    const data: GenogramData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../demo/sample-data/consanguinity-family.json'), 'utf8'),
    );
    new LayoutEngine().calculateLayout(data.persons, data.relationships);
    const all = computeFamilyConnectors(data.persons, data.relationships);
    const hops = all.map(f => (buildConnectorPath(f, all).d.match(/a5 5/g) ?? []).length).reduce((s, n) => s + n, 0);
    expect(hops).toBeGreaterThan(0);
    // No two rails of the same parent row closer than a lane apart where they overlap
    for (const f of all) {
      for (const g of all) {
        if (f === g || Math.round(f.py) !== Math.round(g.py)) continue;
        const overlap = f.left < g.right && g.left < f.right;
        if (overlap) expect(Math.abs(f.railY - g.railY)).toBeGreaterThanOrEqual(RAIL_LANE_SPACING - 0.01);
      }
    }
  });
});
