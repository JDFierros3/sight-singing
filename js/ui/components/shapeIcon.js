/**
 * DOM shape icons that match the canvas staff shapes.
 * Uses inline SVG with currentColor fill so callers can set color via style.
 */

export function shapeIconSvg(baseShape) {
  const path = svgForBaseShape(baseShape);
  return `
    <svg class="shapeIconSvg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      ${path}
    </svg>
  `.trim();
}

export function renderShapeIconInto(el, baseShape, { color = '', sizePx = 18 } = {}) {
  if (!el) return;
  el.classList.add('shapeIcon');
  el.style.width = `${sizePx}px`;
  el.style.height = `${sizePx}px`;
  if (color) el.style.color = color;
  el.innerHTML = shapeIconSvg(baseShape);
}

function svgForBaseShape(baseShape) {
  switch (baseShape) {
    case 'Do':
      return `<polygon fill="currentColor" points="50,20 20,80 80,80" />`;
    case 'Re':
      // Half-oval (upper half ellipse) with flat bottom chord
      return `<path fill="currentColor" d="M26 62 A24 30 0 0 1 74 62 L26 62 Z" />`;
    case 'Mi':
      return `<polygon fill="currentColor" points="50,18 82,50 50,82 18,50" />`;
    case 'Fa':
      // Right-angled triangle "flag"
      return `<polygon fill="currentColor" points="32,67 32,17 87,67" />`;
    case 'Sol':
      // Tilted oval notehead
      return `<ellipse cx="50" cy="50" rx="26" ry="18" fill="currentColor" transform="rotate(-20 50 50)" />`;
    case 'La':
      return `<rect x="22" y="40" width="56" height="22" rx="3" ry="3" fill="currentColor" />`;
    case 'Ti':
      // "Ice cream cone" with shallow cap segment (top ~30%)
      return `<path fill="currentColor" d="M24 52 A70 70 0 0 1 76 52 L76 52 L50 84 L24 52 Z" />`;
    default:
      return `<ellipse cx="50" cy="50" rx="24" ry="18" fill="currentColor" />`;
  }
}


