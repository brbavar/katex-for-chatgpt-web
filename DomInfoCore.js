import * as selector from './selector.js';
import { parseParts } from './parse.js';
import { makeFit, undoMakeFit } from './aesthetex.js';

class DomInfoCore {
  #chat = null;
  #chatContainer = null;
  #resizeObservee = null;
  #messageGrid = null;
  #chatWidth = -1;
  #labelToBubbleObserver = new Map();
  #observeeToActiveResizeObserver = new Map();
  #activeMutationObservers = [];
  #mapsToMutationObservers = [this.#labelToBubbleObserver];

  #chatWidthObserver = new ResizeObserver(() => {
    if (
      this.#resizeObservee.getBoundingClientRect().width !== this.#chatWidth
    ) {
      this.#chatWidth = this.#resizeObservee.getBoundingClientRect().width;

      this.#messageGrid.querySelectorAll(selector.katex).forEach((span) => {
        undoMakeFit(span);
        makeFit(span);
      });
    }
  });

  #chatContainerObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        let resizableChat = null;
        const waitForResizableChat = () => {
          if (
            'querySelector' in node &&
            (resizableChat = node.querySelector(selector.resizableChat))
          ) {
            const loneEntry = this.#labelToBubbleObserver
              .entries()
              .next().value;
            loneEntry[1].disconnect();
            this.#labelToBubbleObserver.delete(loneEntry[0]);

            this.#chat = resizableChat;
            this.setMessageGrid();
            this.handleChatBubbles();
            this.observeChatBubbles();
          } else {
            setTimeout(waitForResizableChat, 100);
          }
        };
        waitForResizableChat();
      });
    });
  });

  getChat() {
    return this.#chat;
  }

  setChat(chat) {
    if (arguments.length === 0) {
      this.#chat = document.querySelector(selector.resizableChat);
    }
    if (arguments.length === 1) {
      this.#chat = chat;
    }
  }

  getChatContainer() {
    return this.#chatContainer;
  }

  setChatContainer() {
    this.#chatContainer = document.querySelector(selector.chatContainer);
  }

  observeChatContainer() {
    if (this.#chatContainer !== null) {
      this.#chatContainerObserver.observe(this.#chatContainer, {
        childList: true,
      });

      this.#activeMutationObservers.push(this.#chatContainerObserver);
    }
  }

  ignoreChatContainer() {
    this.#chatContainerObserver.disconnect();

    const i = this.#activeMutationObservers.indexOf(
      this.#chatContainerObserver
    );
    if (i >= 0) {
      this.#activeMutationObservers.splice(i, 1);
    }
  }

  setResizeObservee() {
    this.#resizeObservee = document.querySelector(selector.resizeObservee);
  }

  setChatWidth() {
    this.#chatWidth = this.#resizeObservee.getBoundingClientRect().width;
  }

  observeChatWidth() {
    if (this.#resizeObservee !== null) {
      this.#chatWidthObserver.observe(this.#resizeObservee);

      this.#observeeToActiveResizeObserver.set(
        this.#resizeObservee,
        this.#chatWidthObserver
      );
    }
  }

  ignoreChatWidth() {
    this.#chatWidthObserver.unobserve(this.#resizeObservee);

    this.#observeeToActiveResizeObserver.delete(this.#resizeObservee);
  }

  getMessageGrid() {
    return this.#messageGrid;
  }

  setMessageGrid(pointOfReference = this.#chat) {
    if (selector.labeledMessageGrid === undefined) {
      this.#messageGrid = this.#chat;
    } else {
      let grid = pointOfReference.querySelector(selector.labeledMessageGrid);
      // Conditional statement below may be unnecessary
      if (grid === null) {
        grid = pointOfReference.querySelector(selector.messageGrid);
      }

      this.#messageGrid = grid;
    }
  }

  getLabelToBubbleObserver() {
    return this.#labelToBubbleObserver;
  }

  getActiveMutationObservers() {
    return this.#activeMutationObservers;
  }

  getMapsToMutationObservers() {
    return this.#mapsToMutationObservers;
  }

  #chatBubbleMutationHandler = (mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        this.handleChatBubbles(node);
      });
    });
  };

  observeChatBubbles() {
    if (this.#messageGrid !== null) {
      const observer = new MutationObserver(this.#chatBubbleMutationHandler);

      observer.observe(this.#messageGrid, {
        childList: true,
        subtree: true,
      });

      const label = this.#messageGrid.getAttribute('aria-label');
      this.#labelToBubbleObserver.set(label, observer);
    }
  }

  handleChatBubbles(bubbleSource) {
    const bubbleHandler = (source) => {
      if (source && 'querySelectorAll' in source) {
        const chatBubbles = source.querySelectorAll(selector.chatBubble);
        chatBubbles.forEach((bubble) => {
          if (
            this.waitForCompleteMessage !== undefined &&
            this.isNewMessage(bubble)
          ) {
            this.waitForCompleteMessage(bubble);
          } else {
            parseParts(bubble);
          }
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

  disconnectObservers() {
    this.#activeMutationObservers.forEach((observer) => observer.disconnect());
    this.#activeMutationObservers.length = 0;

    for (const entry of this.#observeeToActiveResizeObserver.entries()) {
      if (entry[0] !== null) {
        entry[1].unobserve(entry[0]);
      }
    }
    this.#observeeToActiveResizeObserver.clear();

    for (const map of this.#mapsToMutationObservers) {
      for (const entry of map.entries()) {
        entry[1].disconnect();
      }
    }
  }
}

export { DomInfoCore };
