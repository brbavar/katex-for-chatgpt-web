import { isOfTheClasses } from './util.js';

const scrollbarColor = 'rgba(135, 135, 135, 0.2) transparent';

const emptyBubbleMessage =
  '<div style="max-width: 430px;">LaTeX for ChatGPT failed to render your LaTeX, so your message<br>had no visible content. ChatGPT read what you typed, though.<br>Try again if you want to see your message yourself.<br>(Check console for any parsing errors.)</div>';

const isGridChunk = (el) => {
  return (
    ancestor.hasAttribute('data-turn-id') &&
    ancestor.getAttribute('data-testid').startsWith('conversation-turn') &&
    isOfTheClasses(ancestor, ['text-token-text-primary'])
  );
};

export { scrollbarColor, emptyBubbleMessage, isGridChunk };
