const threadContainerId = 'main';

const messageGrid =
  '#thread div:has(> article[data-testid^="conversation-turn"].text-token-text-primary)';

const chatBubble =
  'div[data-message-author-role="user"] div.user-message-bubble-color, div[data-message-author-role="assistant"] div.markdown.prose';

const message = 'div.whitespace-pre-wrap';

export { threadContainerId, messageGrid, chatBubble, message };
