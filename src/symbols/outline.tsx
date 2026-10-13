import { h } from '@stencil/core';
import { Person } from '../types';

/**
 * The outer shape of a person's base symbol (square, circle, diamond,
 * small diamond or triangle), with the given attributes applied. Used for
 * effects that must follow the symbol's outline, such as the selection halo.
 * Geometry matches the renderers in this folder.
 */
export function renderSymbolOutline(person: Person, x: number, y: number, size: number, attrs: Record<string, any>): any {
  const half = size / 2;

  switch (person.type) {
    case 'pregnancy':
    case 'miscarriage':
    case 'abortion': {
      const height = size * 0.866;
      const top = y - height / 2;
      const bottom = y + height / 2;
      return <polygon points={`${x},${top} ${x - half},${bottom} ${x + half},${bottom}`} {...attrs} />;
    }
    case 'pet': {
      const d = half * 0.7;
      return <polygon points={`${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}`} {...attrs} />;
    }
  }

  switch (person.gender) {
    case 'female':
      return <circle cx={x} cy={y} r={half} {...attrs} />;
    case 'male': {
      const radius = size * 0.09;
      return <rect x={x - half} y={y - half} width={size} height={size} rx={radius} ry={radius} {...attrs} />;
    }
    default:
      return <polygon points={`${x},${y - half} ${x + half},${y} ${x},${y + half} ${x - half},${y}`} {...attrs} />;
  }
}
