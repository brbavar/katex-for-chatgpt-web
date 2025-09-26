import * as selector from './selector.js';
import { parseParts } from './parse.js';
import { makeFit, undoMakeFit } from './aesthetex.js';

class DomInfo {
  #threadContainer = null;
  #messageGrid = null;
  #threadContainerWidth = -1;

  #chatBubbleObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        this.handleChatBubbles(node);
      });
    });
  });

  #threadContainerChildListObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        let thread = null;
        const waitForMessageGrid = () => {
          if (
            'querySelector' in node &&
            (thread = node.querySelector(selector.messageGrid))
          ) {
            this.#chatBubbleObserver.disconnect();
            this.#messageGrid = thread;
            this.handleChatBubbles();
            this.observeChatBubbles();
          } else {
            setTimeout(waitForMessageGrid, 100);
          }
        };
        waitForMessageGrid();
      });
    });
  });

  #threadContainerWidthObserver = new ResizeObserver(() => {
    if (
      this.#threadContainer.getBoundingClientRect().width !==
      this.#threadContainerWidth
    ) {
      this.#threadContainerWidth =
        this.#threadContainer.getBoundingClientRect().width;

      this.#messageGrid
        .querySelectorAll(
          `div.user-message-bubble-color > ${selector.message} span:where(:not(.katex-display) > .katex, .katex-display)`
        )
        .forEach((span) => {
          undoMakeFit(span);
          makeFit(span);
        });
    }
  });

  #documentVisibilityListener = () => {
    if (document.hidden) {
      this.disconnectObservers();
    } else {
      this.observeThreadContainerWidth();
      this.observeThreadContainerChildList();
      this.observeChatBubbles();
    }
  };

  getThreadContainer() {
    return this.#threadContainer;
  }

  setThreadContainer() {
    this.#threadContainer = document.getElementById(selector.threadContainerId);
  }

  observeThreadContainerChildList() {
    this.#threadContainerChildListObserver.observe(this.#threadContainer, {
      childList: true,
    });
  }

  setThreadContainerWidth() {
    this.#threadContainerWidth =
      this.#threadContainer.getBoundingClientRect().width;
  }

  observeThreadContainerWidth() {
    this.#threadContainerWidthObserver.observe(this.#threadContainer);
  }

  getMessageGrid() {
    return this.#messageGrid;
  }

  setMessageGrid() {
    this.#messageGrid = this.#threadContainer.querySelector(
      selector.messageGrid
    );
  }

  observeChatBubbles() {
    this.#chatBubbleObserver.observe(this.#messageGrid, {
      childList: true,
      subtree: true,
    });
  }

  handleChatBubbles(bubbleSource) {
    const bubbleHandler = (source) => {
      if (source && 'querySelectorAll' in source) {
        const chatBubbles = source.querySelectorAll(selector.chatBubble);
        chatBubbles.forEach((bubble) => {
          parseParts(bubble);
        });
      }
    };

    if (arguments.length === 0) {
      bubbleHandler(this.#messageGrid);
    }
    if (arguments.length === 1) {
      bubbleHandler(bubbleSource);
    }
  }

  listenToDocumentVisibility() {
    document.addEventListener(
      'visibilitychange',
      this.#documentVisibilityListener
    );
  }

  disconnectObservers() {
    this.#threadContainerWidthObserver.unobserve(this.#threadContainer);
    this.#threadContainerChildListObserver.disconnect();
    this.#chatBubbleObserver.disconnect();
  }
}

const injectCss = (filePath) => {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  // Should not use chrome.runtime API in Safari (and should use cautiously in Firefox)
  css.href = chrome.runtime.getURL(filePath);
  css.type = 'text/css';
  document.head.appendChild(css);
};

injectCss('chatgpt.katex.css');

const startUp = () => {
  const domInfo = new DomInfo();

  domInfo.listenToDocumentVisibility();

  domInfo.setThreadContainer();
  domInfo.setThreadContainerWidth();

  domInfo.setMessageGrid();
  const waitToHandleChat = () => {
    if (domInfo.getMessageGrid() === null) {
      setTimeout(() => {
        domInfo.setMessageGrid();
        waitToHandleChat();
      }, 100);
    } else {
      domInfo.observeThreadContainerWidth();
      domInfo.observeThreadContainerChildList();
      domInfo.handleChatBubbles();
      domInfo.observeChatBubbles();
    }
  };
  waitToHandleChat();
};

window.onload = startUp;
