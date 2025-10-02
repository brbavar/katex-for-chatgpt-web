const resizableChat =
  '#thread div:has(> article[data-testid^="conversation-turn"].text-token-text-primary)';

const chatContainer = '#main';

const resizeObservee = chatContainer;

// const chatBubble =
//   'div[data-message-author-role="user"] div.user-message-bubble-color, div[data-message-author-role="assistant"] div.markdown.prose';
const chatBubble =
  'div[data-message-author-role="user"] div.user-message-bubble-color';

const message = 'div.whitespace-pre-wrap';

const katex = `div.user-message-bubble-color > ${message} span:where(:not(.katex-display) > .katex, .katex-display)`;

export {
  chatContainer,
  resizeObservee,
  resizableChat,
  chatBubble,
  message,
  katex,
};
