class DomInfo {
  #threadContainer = null;
  #messageGrid = null;
  #threadContainerWidth = -1;
  #threadContainerId = 'main';
  #messageGridSelector =
    '#thread div:has(> article[data-testid^="conversation-turn"].text-token-text-primary)';
  #chatBubbleSelector =
    'div[data-message-author-role="user"] div.user-message-bubble-color, div[data-message-author-role="assistant"] div.markdown.prose';
  #messageSelector = 'div.whitespace-pre-wrap';

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
            (thread = node.querySelector(this.#messageGridSelector))
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
          `div.user-message-bubble-color > ${
            this.#messageSelector
          } span:where(div > div > .katex, .katex-display)`
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
    this.#threadContainer = document.getElementById(this.#threadContainerId);
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
      this.#messageGridSelector
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
        const delimLen =
          msg.textContent[texBounds[i][0] + offset] === '$' &&
          msg.textContent[texBounds[i][0] + offset + 1] !== '$'
            ? 1
            : 2;

        msg.textContent = `${msg.textContent.substring(
          0,
          texBounds[i][0] + offset
        )}<span class='renderable'>${msg.textContent.substring(
          texBounds[i][0] + offset,
          texBounds[i][1] + delimLen + offset
        )}</span>${msg.textContent.substring(
          texBounds[i][1] + delimLen + offset
        )}`;
      }

      msg.innerHTML = msg.textContent;

      msg.querySelectorAll('span.renderable').forEach((span) => {
        try {
          const hasDollarDelim = span.textContent[0] === '$';
          const hasSingleDollarDelim =
            hasDollarDelim && span.textContent[1] !== '$';
          const delimLen = hasSingleDollarDelim ? 1 : 2;

          katex.render(
            span.textContent.substring(
              delimLen,
              span.textContent.length - delimLen
            ),
            span,
            {
              displayMode:
                (hasDollarDelim && !hasSingleDollarDelim) ||
                span.textContent[1] === '[',
            }
          );
        } catch (error) {
          console.error('Caught ' + error);
        }

        extractDescendants(span);
      });

      const wrapInlineContent = (msg, inlineDiv, i) => {
        if (i < msg.childNodes.length) {
          let msgPart = msg.childNodes[i];

          if (
            'hasAttribute' in msgPart &&
            msgPart.hasAttribute('class') &&
            msgPart.classList.contains('katex-display')
          ) {
            const lastInlineNode =
              inlineDiv.childNodes[inlineDiv.childNodes.length - 1];
            let j;
            for (
              j = lastInlineNode.textContent.length - 1;
              j >= 0 && lastInlineNode.textContent[j] === '\n';
              j--
            ) {}
            if (lastInlineNode.textContent[++j] === '\n') {
              lastInlineNode.textContent = lastInlineNode.textContent.substring(
                0,
                j
              );
            }

            i = inlineDiv.childNodes.length + 1;
            msg.insertBefore(inlineDiv, msgPart);

            inlineDiv = document.createElement('div');
          } else {
            msgPart.remove();

            inlineDiv.appendChild(msgPart);
          }
          wrapInlineContent(msg, inlineDiv, i);
        } else {
          if (inlineDiv.childNodes.length > 0) {
            const firstInlineNode = inlineDiv.childNodes[0];
            let j;
            for (
              j = 0;
              j < firstInlineNode.textContent.length &&
              firstInlineNode.textContent[j] === '\n';
              j++
            ) {}
            if (firstInlineNode.textContent[j - 1] === '\n') {
              firstInlineNode.textContent =
                firstInlineNode.textContent.substring(j);
            }

            msg.appendChild(inlineDiv);
          }
        }
      };

      let inlineDiv = document.createElement('div');
      wrapInlineContent(msg, inlineDiv, 0);

      msg
        .querySelectorAll('span:where(div > div > .katex, .katex-display)')
        .forEach((span) => {
          makeFit(span);
        });
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

const getTexBounds = (msg) => {
  const txt = msg.textContent;
  const bounds = [];

  const delimAt = (i) => {
    let delim = '';
    if (txt[i] === '$') {
      delim += '$';
      if (txt[i + 1] === '$') {
        delim += '$';
      }
    } else {
      if (txt[i] === '\\') {
        if (
          txt[i + 1] === '(' ||
          txt[i + 1] === ')' ||
          txt[i + 1] === '[' ||
          txt[i + 1] === ']'
        ) {
          delim = `${txt[i]}${txt[i + 1]}`;
        }
      }
    }
    return delim;
  };

  const isOpeningDelim = (delim) => {
    if (delim.length === 0) {
      return false;
    }
    return delim[0] === '$' || delim[1] === '(' || delim[1] === '[';
  };

  const pairsWith = (delim1, delim2) => {
    if (delim1[0] === '$') {
      return delim1 === delim2;
    } else {
      if (delim1[1] === '(') {
        return delim2[1] === ')';
      }
      if (delim1[1] === '[') {
        return delim2[1] === ']';
      }
    }
    return false;
  };

  let l = 0,
    r = 0;
  while (l < txt.length) {
    let leftDelim = delimAt(l);
    let rightDelim;
    if (isOpeningDelim(leftDelim)) {
      r = l + 2;
      rightDelim = delimAt(r);

      while (r + 1 < txt.length && !pairsWith(leftDelim, rightDelim)) {
        if (leftDelim === rightDelim) {
          l = r;
          r += 2;
          leftDelim = delimAt(l);
          rightDelim = delimAt(r);
        } else {
          rightDelim = delimAt(++r);
        }
      }

      if (pairsWith(leftDelim, rightDelim)) {
        bounds.push([l, r]);
      }
    }

    if (bounds.length === 0 || l > bounds[bounds.length - 1][1]) {
      l++;
    } else {
      l = bounds[bounds.length - 1][1] + rightDelim.length;
    }
  }

  return bounds;
};

const makeFit = (span) => {
  const baseSpans = span.querySelectorAll('span.base');
  let collectiveSpanWidth = 0;

  for (let baseSpan of baseSpans) {
    collectiveSpanWidth += baseSpan.getBoundingClientRect().width;
  }

  let partialSumOfSpanWidths = collectiveSpanWidth;
  if (baseSpans.length > 0) {
    let oversizedBaseFound = false;
    for (const baseSpan of baseSpans) {
      if (
        baseSpan.getBoundingClientRect().width >
        span.parentNode.getBoundingClientRect().width
      ) {
        oversizedBaseFound = true;
        break;
      }
    }

    if (oversizedBaseFound) {
      span.classList.add('katex-scrollable');

      if (span.getAttribute('class') === 'katex katex-scrollable') {
        span.style.display = 'inline-block';
      }
      span.style.width = `${span.parentNode.getBoundingClientRect().width}px`;
      span.style.overflowX = 'scroll';
      span.style.overflowY = 'hidden';
      span.style.scrollbarWidth = 'none';
    } else {
      let i = baseSpans.length - 1;
      let j = 0;

      const insertLineBreak = () => {
        if (
          collectiveSpanWidth > span.parentNode.getBoundingClientRect().width
        ) {
          if (i > j) {
            if (
              partialSumOfSpanWidths -
                baseSpans[i].getBoundingClientRect().width <=
                span.parentNode.getBoundingClientRect().width - 10 ||
              i - j === 1
            ) {
              const spacer = document.createElement('div');
              spacer.style.margin = '10px 0px';
              baseSpans[0].parentNode.insertBefore(spacer, baseSpans[i]);

              if (
                collectiveSpanWidth -
                  (partialSumOfSpanWidths -
                    baseSpans[i].getBoundingClientRect().width) >
                span.parentNode.getBoundingClientRect().width - 10
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
        }
      };
      insertLineBreak();
    }
  }
};

const undoMakeFit = (span) => {
  span.querySelectorAll('div').forEach((div) => {
    if (div.style.margin === '10px 0px' && div.attributes.length === 1) {
      div.remove();
    }
  });

  span.classList.remove('katex-scrollable');
  span.removeAttribute('style');
};

const extractDescendants = (span) => {
  const childOfSpan = span.firstElementChild;
  childOfSpan.remove();
  span.parentNode.insertBefore(childOfSpan, span);
  span.remove();
};

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
