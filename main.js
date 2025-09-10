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
        if (
          'querySelector' in node &&
          (thread = node.querySelector(this.#messageGridSelector))
        ) {
          this.#chatBubbleObserver.disconnect();
          this.#messageGrid = thread;
          this.handleChatBubbles();
          this.observeChatBubbles();
        }
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

      this.#messageGrid.querySelectorAll('span.renderable').forEach((span) => {
        removeLineBreaks(span);
        insertLineBreaks(span);
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

        insertLineBreaks(span);
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

// const getTexBounds = (msg) => {
//   const txt = msg.textContent;
//   const bounds = [];

//   const delimAt = (i) => {
//     return (
//       (txt[i] === '$' && txt[i + 1] === '$') ||
//       (txt[i] === '\\' && (txt[i + 1] === '(' || txt[i + 1] === ')'))
//     );
//   };

//   const openingDelimAt = (l) => {
//     return delimAt(l) && (txt[l] === '$' || txt[l + 1] === '(');
//   };

//   const closingDelimAt = (r) => {
//     return delimAt(r) && (txt[r] === '$' || txt[r + 1] === ')');
//   };

//   let l = 0,
//     r = 0;
//   while (l < txt.length) {
//     if (
//       openingDelimAt(l) &&
//       (bounds.length === 0 || l !== bounds[bounds.length - 1][1])
//     ) {
//       r = l + 2;

//       while (r + 1 < txt.length && !(closingDelimAt(r) && txt[l] == txt[r])) {
//         if (openingDelimAt(r) && txt[l] == txt[r]) {
//           l = r;
//           r += 2;
//         } else {
//           r++;
//         }
//       }

//       if (closingDelimAt(r) && txt[l] == txt[r]) {
//         bounds.push([l, r]);
//       }
//     }
//     l++;
//   }

//   return bounds;
// };
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

const insertLineBreaks = (span) => {
  console.log(`inserting line breaks`);
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
      console.log(
        `collectiveSpanWidth = ${collectiveSpanWidth}, baseSpans[0].parentNode.getBoundingClientRect().width = ${
          baseSpans[0].parentNode.getBoundingClientRect().width
        }`
      );
      if (
        collectiveSpanWidth >
          baseSpans[0].parentNode.getBoundingClientRect().width &&
        i > j
      ) {
        if (
          partialSumOfSpanWidths - baseSpans[i].getBoundingClientRect().width <=
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
};

const removeLineBreaks = (span) => {
  span.querySelectorAll('div').forEach((div) => {
    if (div.style.margin === '10px 0px' && div.attributes.length === 1) {
      div.remove();
    }
  });
};

const startUp = () => {
  const domInfo = new DomInfo();

  domInfo.listenToDocumentVisibility();

  domInfo.setThreadContainer();
  domInfo.setThreadContainerWidth();
  domInfo.observeThreadContainerWidth();

  domInfo.setMessageGrid();
  const waitToHandleChat = () => {
    if (domInfo.getMessageGrid() === null) {
      setTimeout(() => {
        domInfo.setMessageGrid();
        waitToHandleChat();
      }, 100);
    } else {
      domInfo.observeThreadContainerChildList();
      domInfo.handleChatBubbles();
      domInfo.observeChatBubbles();
    }
  };
  waitToHandleChat();
};

window.onload = startUp;
