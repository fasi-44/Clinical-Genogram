import { Person } from '../types';
import { DEFAULT_NODE_SIZE } from './constants';

/**
 * World-space box around everything drawn for these persons: the symbols,
 * the name and age labels below them, and couple labels above them.
 */
export function contentBounds(persons: Person[]): { minX: number; minY: number; maxX: number; maxY: number } {
  const half = DEFAULT_NODE_SIZE / 2;
  const xs = persons.map(p => p.x ?? 0);
  const ys = persons.map(p => p.y ?? 0);
  return {
    minX: Math.min(...xs) - half - 10, // names can be a little wider than the symbol
    maxX: Math.max(...xs) + half + 10,
    minY: Math.min(...ys) - half - 16, // consanguinity label above a couple
    maxY: Math.max(...ys) + half + 40, // up to two name lines plus the age
  };
}
