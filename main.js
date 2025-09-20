class DomInfo {
  #threadContainer = null;
  #messageGrid = null;
  #threadContainerWidth = -1;
  #escapeCharIndices = [];
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

  getTexBounds(msg) {
    const txt = msg.textContent;
    const bounds = [];

    const delimAt = (i) => {
      let delim = '';
      if ((txt[i] === '$' || txt[i] === '\\') && i > 0 && txt[i - 1] === '\\') {
        this.#escapeCharIndices.push(i - 1);
      } else {
        if (txt[i] === '$') {
          delim += '$';
          if (txt[i + 1] === '$') {
            delim += '$';
          }
        }
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

  removeEscapeChars(msgPart) {
    for (let i = 0; i < this.#escapeCharIndices.length; i++) {
      msgPart.textContent = `${msgPart.textContent.substring(
        0,
        this.#escapeCharIndices[i]
      )}${msgPart.textContent.substring(this.#escapeCharIndices[i] + 1)}`;

      for (let j = i + 1; j < this.#escapeCharIndices.length; j++) {
        if (this.#escapeCharIndices[i] < this.#escapeCharIndices[j]) {
          this.#escapeCharIndices[j]--;
        }
      }
    }
    this.#escapeCharIndices.length = 0;
  }

  removeEscapeCharsOutsideBounds(msgPart, texBounds) {
    const outerEscapeCharIndices = [];
    for (let i = 0; i < this.#escapeCharIndices.length; i++) {
      for (let j = 0; j < texBounds.length; j++) {
        if (
          this.#escapeCharIndices[i] > texBounds[j][0] &&
          this.#escapeCharIndices[i] < texBounds[j][1]
        ) {
          break;
        } else {
          if (j === texBounds.length - 1) {
            if (!outerEscapeCharIndices.includes(this.#escapeCharIndices[i])) {
              outerEscapeCharIndices.push(this.#escapeCharIndices[i]);
            }
          }
        }
      }
    }

    this.#escapeCharIndices.length = 0;

    for (let i = 0; i < outerEscapeCharIndices.length; i++) {
      msgPart.textContent = `${msgPart.textContent.substring(
        0,
        outerEscapeCharIndices[i]
      )}${msgPart.textContent.substring(outerEscapeCharIndices[i] + 1)}`;
      for (let j = 0; j < texBounds.length; j++) {
        for (let k = 0; k < 2; k++) {
          if (texBounds[j][k] > outerEscapeCharIndices[i]) {
            texBounds[j][k]--;
          }
        }
      }

      for (let j = i + 1; j < outerEscapeCharIndices.length; j++) {
        if (outerEscapeCharIndices[i] < outerEscapeCharIndices[j]) {
          outerEscapeCharIndices[j]--;
        }
      }
    }
  }

  parseContent(bubble) {
    const msg = bubble.querySelector(this.#messageSelector);
    let texBounds;

    if (msg !== null && msg.textContent !== '') {
      texBounds = this.getTexBounds(msg);
    }

    if (texBounds !== undefined && texBounds.length) {
      this.removeEscapeCharsOutsideBounds(msg, texBounds);

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

      removeNewlines(msg);

      msg
        .querySelectorAll('span:where(div > .katex, .katex-display)')
        .forEach((span) => {
          makeFit(span);
        });
    } else {
      this.removeEscapeChars(msg);
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

const removeNewlines = (msg) => {
  const inlineNodeIndices = [];
  let i = 0;
  while (i < msg.childNodes.length) {
    let msgPart = msg.childNodes[i];

    if (
      'hasAttribute' in msgPart &&
      msgPart.hasAttribute('class') &&
      msgPart.classList.contains('katex-display')
    ) {
      if (inlineNodeIndices.length > 0) {
        const lastInlineNodeIndex =
          inlineNodeIndices[inlineNodeIndices.length - 1];
        const lastInlineNode = msg.childNodes[lastInlineNodeIndex];
        let j;
        if (lastInlineNode.nodeValue !== null) {
          for (
            j = lastInlineNode.nodeValue.length - 1;
            j >= 0 && lastInlineNode.nodeValue[j] === '\n';
            j--
          ) {}
          if (lastInlineNode.nodeValue[++j] === '\n') {
            lastInlineNode.nodeValue = lastInlineNode.nodeValue.substring(0, j);
          }
        }
      }

      inlineNodeIndices.length = 0;
    } else {
      inlineNodeIndices.push(i);
    }
    i++;
  }

  if (inlineNodeIndices.length > 0) {
    const firstInlineNode = msg.childNodes[inlineNodeIndices[0]];
    let j;
    if (firstInlineNode.nodeValue !== null) {
      for (
        j = 0;
        j < firstInlineNode.nodeValue.length &&
        firstInlineNode.nodeValue[j] === '\n';
        j++
      ) {}
      if (firstInlineNode.nodeValue[j - 1] === '\n') {
        firstInlineNode.nodeValue = firstInlineNode.nodeValue.substring(j);
      }
    }
  }
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
      span.style.scrollbarWidth = 'thin';
      span.style.scrollbarColor = 'rgba(135, 135, 135, 0.2) transparent';
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
  if (childOfSpan !== null) {
    childOfSpan.remove();
    span.parentNode.insertBefore(childOfSpan, span);
  }
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
