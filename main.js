class DomInfo {
  #threadContainer = null;
  #messageGrid = null;
  #threadContainerId = 'main';
  #messageGridSelector =
    '#thread div:has(> article[data-testid^="conversation-turn"].text-token-text-primary)';
  #chatBubbleSelector =
    'div[data-message-author-role="user"] div.user-message-bubble-color, div[data-message-author-role="assistant"] div.markdown.prose';
  #messageSelector = 'div.whitespace-pre-wrap';

  #threadContainerObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        let thread = null;
        if (
          'querySelector' in node &&
          (thread = node.querySelector(this.#messageGridSelector))
        ) {
          this.#messageGrid = thread;
          this.handleChatBubbles();
          this.observeChatBubbles();
        }
      });
    });
  });

  getThreadContainer() {
    return this.#threadContainer;
  }

  setThreadContainer() {
    this.#threadContainer = document.getElementById(this.#threadContainerId);
  }

  observeThreadContainer() {
    this.#threadContainerObserver.observe(this.#threadContainer, {
      childList: true,
    });
  }

  getMessageGrid() {
    return this.#messageGrid;
  }

  setMessageGrid() {
    this.#messageGrid = this.#threadContainer.querySelector(
      this.#messageGridSelector
    );
  }

  #chatBubbleMutationHandler = (mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        console.log(`bubble source added to grid`);
        this.handleChatBubbles(node);
      });
    });
  };

  observeChatBubbles() {
    const observer = new MutationObserver(this.#chatBubbleMutationHandler);

    observer.observe(this.#messageGrid, {
      childList: true,
      subtree: true,
    });
  }

  handleChatBubbles(bubbleSource) {
    const bubbleHandler = (source) => {
      if (source && 'querySelectorAll' in source) {
        const chatBubbles = source.querySelectorAll(this.#chatBubbleSelector);

        chatBubbles.forEach((bubble) => {
          if (bubble.textContent === '') {
            const waitToParseContent = () => {
              if (
                bubble.textContent === '' ||
                bubble.querySelector(this.#messageSelector) === null
              ) {
                setTimeout(waitToParseContent, 100);
              } else {
                let txt = bubble.textContent;
                const waitForCompleteMessage = () => {
                  setTimeout(() => {
                    if (bubble.textContent !== txt) {
                      txt = bubble.textContent;
                      waitForCompleteMessage();
                    } else {
                      this.parseContent(bubble);
                    }
                  }, 100);
                };
                waitForCompleteMessage();
              }
            };
            waitToParseContent();
          } else {
            this.parseContent(bubble);
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

  parseContent(bubble) {
    const msg = bubble.querySelector(this.#messageSelector);
    let texBounds;

    if (msg !== null && msg.textContent !== '') {
      texBounds = getTexBounds(msg);
    }

    if (texBounds !== undefined && texBounds.length) {
      for (let i = 0; i < texBounds.length; i++) {
        const offset = 32 * i;

        msg.textContent = `${msg.textContent.substring(
          0,
          texBounds[i][0] + offset
        )}<span class='renderable'>${msg.textContent.substring(
          texBounds[i][0] + offset,
          texBounds[i][1] + 2 + offset
        )}</span>${msg.textContent.substring(texBounds[i][1] + 2 + offset)}`;
      }

      msg.innerHTML = msg.textContent;

      msg.querySelectorAll('span.renderable').forEach((span) => {
        try {
          katex.render(
            span.textContent.substring(2, span.textContent.length - 2),
            span,
            {
              displayMode: span.textContent[0] === '$',
            }
          );
        } catch (error) {
          console.error('Caught ' + error);
        }

        const baseSpans = span.querySelectorAll(
          'span:where(.katex, .katex-display) span.katex-html > span.base'
        );
        let collectiveSpanWidth = 0;

        for (let baseSpan of baseSpans) {
          collectiveSpanWidth += baseSpan.getBoundingClientRect().width;
        }

        let partialSumOfSpanWidths = collectiveSpanWidth;
        if (baseSpans.length > 0) {
          let i = baseSpans.length - 1;
          let j = 0;
          const insertLineBreak = () => {
            if (
              collectiveSpanWidth >
                baseSpans[0].parentNode.getBoundingClientRect().width &&
              i > j
            ) {
              if (
                partialSumOfSpanWidths -
                  baseSpans[i].getBoundingClientRect().width <=
                  baseSpans[0].parentNode.getBoundingClientRect().width - 10 ||
                i - j === 1
              ) {
                const spacer = document.createElement('div');
                spacer.style.margin = '10px 0px';
                baseSpans[0].parentNode.insertBefore(spacer, baseSpans[i]);

                if (
                  collectiveSpanWidth -
                    (partialSumOfSpanWidths -
                      baseSpans[i].getBoundingClientRect().width) >
                  baseSpans[0].parentNode.getBoundingClientRect().width - 10
                ) {
                  partialSumOfSpanWidths =
                    collectiveSpanWidth -
                    (partialSumOfSpanWidths -
                      baseSpans[i].getBoundingClientRect().width);
                  collectiveSpanWidth = partialSumOfSpanWidths;
                  j = i;
                  i = baseSpans.length - 1;

                  insertLineBreak();
                }
              } else {
                partialSumOfSpanWidths -=
                  baseSpans[i--].getBoundingClientRect().width;

                insertLineBreak();
              }
            }
          };
          insertLineBreak();
        }
      });
    }
  }
}

const getTexBounds = (msg) => {
  const txt = msg.textContent;
  const bounds = [];

  const delimAt = (i) => {
    return (
      (txt[i] === '$' && txt[i + 1] === '$') ||
      (txt[i] === '\\' && (txt[i + 1] === '(' || txt[i + 1] === ')'))
    );
  };

  const openingDelimAt = (l) => {
    return delimAt(l) && (txt[l] === '$' || txt[l + 1] === '(');
  };

  const closingDelimAt = (r) => {
    return delimAt(r) && (txt[r] === '$' || txt[r + 1] === ')');
  };

  let l = 0,
    r = 0;
  while (l < txt.length) {
    if (
      openingDelimAt(l) &&
      (bounds.length === 0 || l !== bounds[bounds.length - 1][1])
    ) {
      r = l + 2;

      while (r + 1 < txt.length && !(closingDelimAt(r) && txt[l] == txt[r])) {
        if (openingDelimAt(r) && txt[l] == txt[r]) {
          l = r;
          r += 2;
        } else {
          r++;
        }
      }

      if (closingDelimAt(r) && txt[l] == txt[r]) {
        bounds.push([l, r]);
      }
    }
    l++;
  }

  return bounds;
};

const startUp = () => {
  const domInfo = new DomInfo();

  domInfo.setThreadContainer();
  domInfo.setMessageGrid();
  const waitToHandleChat = () => {
    if (domInfo.getMessageGrid() === null) {
      setTimeout(() => {
        domInfo.setMessageGrid();
        waitToHandleChat();
      }, 100);
    } else {
      domInfo.observeThreadContainer();
      domInfo.handleChatBubbles();
      domInfo.observeChatBubbles();
    }
  };
  waitToHandleChat();
};

window.onload = startUp;
