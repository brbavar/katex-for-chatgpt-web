import { DomInfoCore } from './DomInfoCore.js';

class DomInfo extends DomInfoCore {
  #documentVisibilityListener = () => {
    if (document.hidden) {
      this.disconnectObservers();
    } else {
      this.observeChatWidth();
      this.observeChatContainer();
      this.observeChatBubbles();
    }
  };

  listenToDocumentVisibility() {
    document.addEventListener(
      'visibilitychange',
      this.#documentVisibilityListener
    );
  }
}

export { DomInfo };
