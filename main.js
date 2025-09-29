import { injectCss } from './aesthetex.js';
import { DomInfo } from './DomInfo.js';

const startUp = () => {
  injectCss();

  const domInfo = new DomInfo();

  domInfo.listenToDocumentVisibility();

  // domInfo.setThreadContainer();
  // domInfo.setThreadContainerWidth();
  domInfo.setChatContainer();
  domInfo.setResizeObservee();
  domInfo.setChatWidth();

  domInfo.setChat();
  domInfo.setMessageGrid();
  const waitToHandleChat = () => {
    if (domInfo.getMessageGrid() === null) {
      setTimeout(() => {
        domInfo.setChat();
        domInfo.setMessageGrid();
        waitToHandleChat();
      }, 100);
    } else {
      // domInfo.observeThreadContainerWidth();
      // domInfo.observeThreadContainerChildList();
      domInfo.observeChatWidth();
      domInfo.observeChatContainer();
      domInfo.handleChatBubbles();
      domInfo.observeChatBubbles();
    }
  };
  waitToHandleChat();
};

window.onload = startUp;
