import { emptyBubbleMessage, isGridChunk } from './config.js';

const extractDescendants = (span) => {
  const childOfSpan = span.firstElementChild;
  if (childOfSpan !== null) {
    childOfSpan.remove();
    span.parentNode.insertBefore(childOfSpan, span);
  }
  span.remove();
};

const findGridChunk = (descendant) => {
  let ancestor = descendant;

  while (ancestor !== null && !isGridChunk(ancestor)) {
    ancestor = ancestor.parentNode;

    if (ancestor !== null && ancestor.constructor.name === 'HTMLBodyElement') {
      return null;
    }
  }

  return ancestor;
};

const removeIfEmpty = (bubble) => {
  if (/^\s*$/.test(bubble.textContent)) {
    const gridChunk = findGridChunk(bubble);
    for (const node of gridChunk.childNodes) {
      node.remove();
    }
    gridChunk.classList.add('empty-bubble-message');
    gridChunk.innerHTML = emptyBubbleMessage;
  }
};

export { extractDescendants, removeIfEmpty, findGridChunk };
