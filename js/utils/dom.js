/**
 * DOM utility functions for element selection and manipulation
 */

export function getElementById(id) {
  return document.getElementById(id);
}

export function querySelector(selector) {
  return document.querySelector(selector);
}

export function querySelectorAll(selector) {
  return document.querySelectorAll(selector);
}

export function clearElement(element) {
  if (element) {
    element.innerHTML = '';
  }
}

export function setTextContent(element, text) {
  if (element) {
    element.textContent = text;
  }
}

/**
 * Create a DOM element with optional attributes
 * @param {string} tagName - The HTML tag name
 * @param {Object} attributes - Optional attributes object (id, class, style, etc.)
 * @returns {HTMLElement} The created element
 */
export function createElement(tagName, attributes = {}) {
  const element = document.createElement(tagName);
  
  // Set attributes
  Object.keys(attributes).forEach(key => {
    if (key === 'class') {
      element.className = attributes[key];
    } else if (key === 'style' && typeof attributes[key] === 'string') {
      element.style.cssText = attributes[key];
    } else if (key.startsWith('data-') || key.startsWith('aria-')) {
      element.setAttribute(key, attributes[key]);
    } else {
      element[key] = attributes[key];
    }
  });
  
  return element;
}

