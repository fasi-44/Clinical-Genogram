import { Person, Relationship, LayoutData } from '../types';
import { DEFAULT_NODE_SIZE } from '../utils/constants';
import { GenerationCalculator } from './GenerationCalculator';
import { PositionResolver } from './PositionResolver';

/**
 * Top-level orchestrator that combines GenerationCalculator and
 * PositionResolver to produce a complete genogram layout.
 */
export class LayoutEngine {
  private generationCalc = new GenerationCalculator();
  private positionResolver = new PositionResolver();

  /**
   * Calculate full layout for the given persons and relationships.
   *
   * Side-effects: updates every person's `x`, `y`, and `generation`
   * properties in place.
   *
   * @returns LayoutData containing positions, generations, and bounding box.
   */
  calculateLayout(persons: Person[], relationships: Relationship[]): LayoutData {
    // Handle empty / null input gracefully
    const safePersons = persons ?? [];
    const safeRels = relationships ?? [];

    // Step 1 - Determine generation for every person
    const generations = this.generationCalc.calculate(safePersons, safeRels);

    // Step 2 - Resolve x, y positions
    const positions = this.positionResolver.resolve(
      safePersons,
      safeRels,
      generations,
      DEFAULT_NODE_SIZE,
    );

    // Step 3 - Write back into each Person object
    for (const person of safePersons) {
      const pos = positions.get(person.id);
      if (pos) {
        person.x = pos.x;
        person.y = pos.y;
      }
      const gen = generations.get(person.id);
      if (gen !== undefined) {
        person.generation = gen;
      }
    }

    // Step 4 - Calculate bounding box
    const bounds = this.calculateBounds(positions);

    return { positions, generations, bounds };
  }

  /**
   * Recalculate layout but preserve manually-moved nodes.
   *
   * Only repositions persons that do not already have both `x` and `y`
   * set (i.e. not `undefined`). Persons that were dragged by the user
   * keep their current coordinates.
   *
   * @returns LayoutData with the merged positions.
   */
  incrementalLayout(persons: Person[], relationships: Relationship[]): LayoutData {
    const safePersons = persons ?? [];
    const safeRels = relationships ?? [];

    // Step 1 - Generations (always recalculated)
    const generations = this.generationCalc.calculate(safePersons, safeRels);

    // Step 2 - Full position resolve (as a baseline)
    const freshPositions = this.positionResolver.resolve(
      safePersons,
      safeRels,
      generations,
      DEFAULT_NODE_SIZE,
    );

    // Step 3 - Merge: keep existing positions for persons that already
    // have coordinates; use fresh positions for the rest.
    const mergedPositions = new Map<string, { x: number; y: number }>();

    for (const person of safePersons) {
      const hasExisting =
        person.x !== undefined &&
        person.x !== null &&
        person.y !== undefined &&
        person.y !== null;

      if (hasExisting) {
        // Preserve user-placed position
        mergedPositions.set(person.id, { x: person.x as number, y: person.y as number });
      } else {
        // Use newly calculated position
        const fresh = freshPositions.get(person.id);
        if (fresh) {
          mergedPositions.set(person.id, fresh);
          person.x = fresh.x;
          person.y = fresh.y;
        }
      }

      // Generation is always recalculated
      const gen = generations.get(person.id);
      if (gen !== undefined) {
        person.generation = gen;
      }
    }

    // Step 4 - Bounding box from merged positions
    const bounds = this.calculateBounds(mergedPositions);

    return { positions: mergedPositions, generations, bounds };
  }

  // -----------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------

  /**
   * Derive the axis-aligned bounding box from a set of positions.
   * Returns zeroed bounds when there are no positions.
   */
  private calculateBounds(
    positions: Map<string, { x: number; y: number }>,
  ): { minX: number; minY: number; maxX: number; maxY: number } {
    if (positions.size === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const { x, y } of positions.values()) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }

    return { minX, minY, maxX, maxY };
  }
}
