import { GenogramState } from './GenogramState';
import { GenogramData } from '../types';

const tree = (...names: string[]): GenogramData => ({
  version: '1.0.0',
  persons: names.map(n => ({
    id: n,
    fullName: n,
    gender: 'unknown',
    type: 'standard',
    isDeceased: false,
    isProband: false,
    conditions: [],
  })),
  relationships: [],
});

describe('GenogramState.replaceData', () => {
  it('replaces the tree as a single undoable step', () => {
    const state = new GenogramState(tree('old1', 'old2'));
    expect(state.canUndo()).toBe(false);

    state.replaceData(tree('new1', 'new2', 'new3'));
    expect(state.getPersons().map(p => p.id)).toEqual(['new1', 'new2', 'new3']);

    state.undo();
    expect(state.getPersons().map(p => p.id)).toEqual(['old1', 'old2']);
    expect(state.canUndo()).toBe(false);

    state.redo();
    expect(state.getPersons().map(p => p.id)).toEqual(['new1', 'new2', 'new3']);
  });

  it('notifies subscribers', () => {
    const state = new GenogramState();
    const fn = jest.fn();
    state.subscribe(fn);
    state.replaceData(tree('a'));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('GenogramState.setData migration', () => {
  it('joins legacy firstName/lastName into fullName', () => {
    const legacy: any = {
      version: '1.0.0',
      persons: [
        { id: 'a', firstName: 'John', lastName: 'Miller', gender: 'male', type: 'standard', isDeceased: false, isProband: false, conditions: [] },
        { id: 'b', lastName: 'Clark', gender: 'female', type: 'standard', isDeceased: false, isProband: false, conditions: [] },
        { id: 'c', fullName: 'Kept As Is', firstName: 'Old', gender: 'female', type: 'standard', isDeceased: false, isProband: false, conditions: [] },
      ],
      relationships: [],
    };
    const state = new GenogramState(legacy);
    expect(state.getPerson('a')).toMatchObject({ fullName: 'John Miller' });
    expect(state.getPerson('b')!.fullName).toBe('Clark');
    expect(state.getPerson('c')!.fullName).toBe('Kept As Is');
    expect('firstName' in state.getPerson('a')!).toBe(false);
    expect('lastName' in state.getPerson('a')!).toBe(false);
  });
});

describe('GenogramState family editing', () => {
  const one = (gender: 'male' | 'female' = 'male'): GenogramData => ({
    version: '1.0.0',
    persons: [{ id: 'me', fullName: 'Me', gender, type: 'standard', isDeceased: false, isProband: true, conditions: [] }],
    relationships: [],
  });

  it('adds placeholder parents once, as one undo step', () => {
    const state = new GenogramState(one());
    const couple = state.addParents('me')!;
    expect(couple.childrenIds).toEqual(['me']);
    expect(state.getPersons().filter(p => p.isPlaceholder)).toHaveLength(2);
    expect(state.addParents('me')).toBeNull(); // already has parents
    state.undo();
    expect(state.getPersons()).toHaveLength(1);
  });

  it('adds a sibling to the existing parents, or creates them', () => {
    const state = new GenogramState(one());
    const sis = state.addSibling('me', 'female')!;
    const parents = state.getParentsOf('me').relationship!;
    expect(parents.childrenIds).toEqual(['me', sis.id]);
    const bro = state.addSibling('me', 'male')!;
    expect(state.getParentsOf(bro.id).relationship!.id).toBe(parents.id);
  });

  it('adds a partner of the opposite gender and children to that couple', () => {
    const state = new GenogramState(one('female'));
    const partner = state.addPartner('me')!;
    expect(partner.gender).toBe('male');
    const child = state.addChild('me', 'female')!;
    const couple = state.getCouplesOf('me')[0];
    expect(couple.childrenIds).toEqual([child.id]);
    expect([couple.person1Id, couple.person2Id]).toEqual([partner.id, 'me']); // male partner first
  });

  it('creates a placeholder other parent when adding a child to a single person', () => {
    const state = new GenogramState(one());
    const child = state.addChild('me', 'male')!;
    const couple = state.getParentsOf(child.id).relationship!;
    const other = state.getPerson(couple.person1Id === 'me' ? couple.person2Id : couple.person1Id)!;
    expect(other.isPlaceholder).toBe(true);
    expect(other.gender).toBe('female');
  });

  it('moves a person to different parents and refuses cycles', () => {
    const state = new GenogramState(one());
    const a = state.addParents('me')!;
    const kid = state.addChild('me', 'female')!;
    const b = state.addParents(a.person1Id)!; // grandparents
    // "me" cannot become a child of his own child's couple
    const myCouple = state.getCouplesOf('me')[0];
    expect(state.setParents('me', myCouple.id)).toBe(false);
    expect(state.getPossibleParentCouples('me').map(r => r.id)).not.toContain(myCouple.id);
    // Move the kid to the grandparents (allowed) and back out again
    expect(state.setParents(kid.id, b.id)).toBe(true);
    expect(state.getParentsOf(kid.id).relationship!.id).toBe(b.id);
    expect(state.getRelationship(myCouple.id)!.childrenIds).toEqual([]);
    expect(state.setParents(kid.id, null)).toBe(true);
    expect(state.getParentsOf(kid.id).relationship).toBeNull();
  });

  it('reorders and detaches children without deleting them', () => {
    const state = new GenogramState(one());
    const c1 = state.addChild('me', 'male')!;
    const c2 = state.addChild('me', 'female')!;
    const couple = state.getCouplesOf('me')[0];
    expect(state.moveChild(couple.id, c2.id, -1)).toBe(true);
    expect(state.getRelationship(couple.id)!.childrenIds).toEqual([c2.id, c1.id]);
    expect(state.moveChild(couple.id, c2.id, -1)).toBe(false); // already first
    expect(state.removeChildFromCouple(couple.id, c1.id)).toBe(true);
    expect(state.getRelationship(couple.id)!.childrenIds).toEqual([c2.id]);
    expect(state.getPerson(c1.id)).toBeDefined();
  });
});

describe('GenogramState automatic consanguinity', () => {
  // Grandparents with two sons; each son has a child; the cousins then marry
  function cousins() {
    const state = new GenogramState({
      version: '1.0.0',
      persons: [{ id: 'gf', gender: 'male', type: 'standard', isDeceased: false, isProband: true, conditions: [] }],
      relationships: [],
    });
    state.addPartner('gf', 'female');
    const s1 = state.addChild('gf', 'male')!;
    const s2 = state.addChild('gf', 'male')!;
    const c1 = state.addChild(s1.id, 'male')!;
    const c2 = state.addChild(s2.id, 'female')!;
    return { state, c1, c2 };
  }

  it('works out first cousins when two cousins are linked as a couple', () => {
    const { state, c1, c2 } = cousins();
    const rel = state.addRelationship({ type: 'marriage', person1Id: c1.id, person2Id: c2.id });
    expect(rel.consanguinityRelation).toBe('first-cousins');
    expect(rel.consanguinityAuto).toBe(true);
  });

  it('clears an automatic value when the shared ancestry is removed', () => {
    const { state, c1, c2 } = cousins();
    const rel = state.addRelationship({ type: 'marriage', person1Id: c1.id, person2Id: c2.id });
    state.setParents(c2.id, null);
    expect(state.getRelationship(rel.id)!.consanguinity).toBe('none');
    expect(state.getRelationship(rel.id)!.consanguinityRelation).toBeUndefined();
  });

  it('never overwrites a value set by a person', () => {
    const { state, c1, c2 } = cousins();
    const rel = state.addRelationship({ type: 'marriage', person1Id: c1.id, person2Id: c2.id });
    state.updateRelationship(rel.id, { consanguinity: 'second-degree', consanguinityRelation: undefined });
    state.addSibling(c1.id, 'male'); // any family change
    expect(state.getRelationship(rel.id)!.consanguinity).toBe('second-degree');
    expect(state.getRelationship(rel.id)!.consanguinityAuto).toBe(false);
  });
});
