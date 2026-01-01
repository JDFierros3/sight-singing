/**
 * Builds the header solfege guide using the same shapes as the staff.
 */

import { getElementById, clearElement } from '../../utils/dom.js';
import { SOLFEGE } from '../../config/constants.js';
import { getShapeColor } from '../../rendering/shapes.js';
import { renderShapeIconInto } from '../components/shapeIcon.js';

export function buildSolfegeGuide() {
  const host = getElementById('solfegeGuide');
  if (!host) return;

  clearElement(host);

  SOLFEGE.forEach(baseShape => {
    host.appendChild(createNoteBadge(baseShape));
  });
}

function createNoteBadge(baseShape) {
  const badge = document.createElement('span');
  badge.className = 'noteBadge';

  const icon = document.createElement('span');
  renderShapeIconInto(icon, baseShape, { color: getShapeColor(baseShape), sizePx: 18 });

  const label = document.createElement('span');
  label.className = 'noteLabel';
  label.textContent = baseShape;

  badge.appendChild(icon);
  badge.appendChild(label);

  return badge;
}


