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
        // console.log(`node added to thread container child list:`);
        // console.log(node);
        // console.log(
        //   `node.querySelector(this.#messageGridSelector = ${node.querySelector(
        //     this.#messageGridSelector
        //   )}`
        // );
        const waitForMessageGrid = () => {
          if (
            'querySelector' in node &&
            (thread = node.querySelector(this.#messageGridSelector))
          ) {
            // console.log(`thread changed`);
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

      // // // this.#messageGrid.querySelectorAll('span.renderable').forEach((span) => {
      // // this.#messageGrid
      // //   .querySelectorAll(
      // //     `div.user-message-bubble-color > ${
      // //       this.#messageSelector
      // //     } > span:where(.katex,.katex-display)`
      // //   )
      // //   .forEach((span) => {
      // this.#messageGrid
      //   .querySelectorAll(
      //     `div.user-message-bubble-color > ${
      //       this.#messageSelector
      //     } > :where(div > span.katex, span.katex-display:not(.katex-scrollable))`
      //   )
      //   .forEach((span) => {
      this.#messageGrid
        .querySelectorAll(
          `div.user-message-bubble-color > ${
            this.#messageSelector
          } > :not(.katex-scrollable):where(div > span.katex, span.katex-display)`
        )
        .forEach((span) => {
          // console.log(`adjusting line breaks as needed`);
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
    // console.log(`observing thread container child list`);
    // console.log(`this.#threadContainer = ${this.#threadContainer}`);
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

        // const childOfSpan = span.firstElementChild;
        // childOfSpan.remove();
        // span.parentNode.insertBefore(childOfSpan, span);
        // span.remove();
        extractDescendants(span);
      });

      msg.classList.remove('whitespace-pre-wrap');

      // const inlineMsgParts = [];
      // for (const msgPart of msg.childNodes) {
      //   if (
      //     'classList' in msgPart &&
      //     msgPart.classList.contains('katex-display')
      //   ) {
      //     const inlineDiv = document.createElement('div');
      //     msg.insertBefore(inlineDiv, msgPart);
      //     for (const part of inlineMsgParts) {
      //     }
      //     inlineMsgParts.length = 0;
      //   } else {
      //     inlineMsgParts.push(msgPart);
      //   }

      //   if (inlineMsgParts.length > 0) {

      //   }
      // }

      // let inlineDiv = document.createElement('div');
      // inlineDiv.classList.add('whitespace-pre-wrap');
      // for (const msgPart of msg.childNodes) {
      //   console.log(`msgPart:`);
      //   console.log(msgPart);
      //   if (
      //     'classList' in msgPart &&
      //     msgPart.classList.contains('katex-display')
      //   ) {
      //     msg.insertBefore(inlineDiv, msgPart);
      //     // break;
      //     inlineDiv = document.createElement('div');
      //     inlineDiv.classList.add('whitespace-pre-wrap');
      //   } else {
      //     msgPart.remove();
      //     inlineDiv.appendChild(msgPart);
      //   }
      // }
      // if (inlineDiv.parentElement === null || inlineDiv.parentElement !== msg) {
      //   msg.appendChild(inlineDiv);
      // }

      // const wrapInlineContent = (i) => {
      //   let inlineDiv = document.createElement('div');
      //   inlineDiv.classList.add('whitespace-pre-wrap');
      //   // for (const msgPart of msg.childNodes) {
      //   let msgPart;
      //   for (let j = i; j < msg.childNodes.length; j++) {
      //     msgPart = msg.childNodes[j];
      //     console.log(`msgPart:`);
      //     console.log(msgPart);
      //     if (
      //       'classList' in msgPart &&
      //       msgPart.classList.contains('katex-display')
      //     ) {
      //       msg.insertBefore(inlineDiv, msgPart);
      //       // break;
      //       inlineDiv = document.createElement('div');
      //       inlineDiv.classList.add('whitespace-pre-wrap');
      //     } else {
      //       msgPart.remove();
      //       inlineDiv.appendChild(msgPart);
      //     }
      //   }
      //   if (
      //     inlineDiv.parentElement === null ||
      //     inlineDiv.parentElement !== msg
      //   ) {
      //     msg.appendChild(inlineDiv);
      //   }
      // };

      // for (const node of msg.childNodes) {
      //   console.log(`child node:`);
      //   console.log(node);
      // }

      const wrapInlineContent = (
        msg,
        inlineDiv,
        i /*childNodeIndex,
        childIndex*/
      ) => {
        // console.log(
        //   `childNodeIndex = ${childNodeIndex}: ${msg.childNodes.length} child nodes found`
        // );
        console.log(`i = ${i}: ${msg.childNodes.length} child nodes found`);
        for (const child of msg.childNodes) {
          console.log(`child.textContent = ${child.textContent}`);
        }
        // if (childNodeIndex < msg.childNodes.length) {
        if (i < msg.childNodes.length) {
          inlineDiv.classList.add('whitespace-pre-wrap');
          // let msgPart = msg.childNodes[childNodeIndex];
          let msgPart = msg.childNodes[i];
          console.log(`msgPart:`);
          console.log(msgPart);

          // const j = msg.children.indexOf(msgPart);
          // const j = Array.from(msg.children).indexOf(msgPart);
          // const j = [...msg.children].indexOf(msgPart);

          // let msgPartEl = null;
          // for (const child of msg.children) {
          //   if (msgPart.isEqualNode(child)) {
          //     msgPartEl = child;
          //   }
          // }

          if (
            'hasAttribute' in msgPart &&
            msgPart.hasAttribute('class') &&
            msgPart.classList.contains('katex-display')
          ) {
            const lastInlineNode =
              inlineDiv.childNodes[inlineDiv.childNodes.length - 1];
            // console.log(`lastInlineNode:`);
            // console.log(lastInlineNode);
            // console.log(
            //   `last char of lastInlineNode.textContent === '\\n' = ${
            //     lastInlineNode.textContent[
            //       lastInlineNode.textContent.length - 1
            //     ] === '\n'
            //   }`
            // );
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
            // inlineDiv.textContent = inlineDiv.textContent.trim();
            // // if (j !== -1 && msg.children[j].classList.contains('katex-display')) {
            // // if (
            // //   msgPartEl !== null &&
            // //   msgPartEl.classList.contains('katex-display')
            // // ) {
            // console.log(`msgPart.nodeType = ${msgPart.nodeType}`);
            // // if (msgPart.nodeType === Node.ELEMENT_NODE) {
            // console.log(`this is an element:`);
            // console.log(msgPart);
            // childIndex++;
            // if (
            //   msg.children[++childIndex].classList.contains('katex-display')
            // ) {
            i = inlineDiv.childNodes.length + 1;
            // inlineDiv.style.boxSizing = '';
            // inlineDiv.style.height = 'fit-content';
            msg.insertBefore(inlineDiv, msgPart);
            console.log(`AFTER INSERTION`);
            for (const node of msg.childNodes) {
              console.log(`child node:`);
              console.log(node);
            }
            // break;
            inlineDiv = document.createElement('div');
            inlineDiv.classList.add('whitespace-pre-wrap');
          } else {
            msgPart.remove();
            console.log(`AFTER REMOVAL`);
            for (const node of msg.childNodes) {
              console.log(`child node:`);
              console.log(node);
            }

            inlineDiv.appendChild(msgPart);
          }
          wrapInlineContent(msg, inlineDiv, i);
          // }
          // else {
          //   msgPart.remove();
          //   console.log(`AFTER REMOVAL`);
          //   for (const node of msg.childNodes) {
          //     console.log(`child node:`);
          //     console.log(node);
          //   }
          //   inlineDiv.appendChild(msgPart);
          // }
          // wrapInlineContent(msg, inlineDiv, ++childNodeIndex, childIndex);
        } else {
          if (inlineDiv.childNodes.length > 0) {
            const firstInlineNode = inlineDiv.childNodes[0];
            // if (firstInlineNode.textContent[0] === '\n') {
            //   firstInlineNode.textContent =
            //     firstInlineNode.textContent.substring(1);
            // }
            // // inlineDiv.textContent = inlineDiv.textContent.trim();
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
      // if (
      //   inlineDiv.parentElement === null ||
      //   inlineDiv.parentElement !== msg
      // ) {
      //   msg.appendChild(inlineDiv);
      // }
      let inlineDiv = document.createElement('div');
      wrapInlineContent(msg, inlineDiv, 0 /*, -1*/);
    }
  }

  listenToDocumentVisibility() {
    document.addEventListener(
      'visibilitychange',
      this.#documentVisibilityListener
    );
  }

  disconnectObservers() {
    // console.log(`disconnecting observers`);
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

const insertLineBreaks = (span) => {
  const baseSpans = span.querySelectorAll(
    'span:where(.katex, .katex-display) span.katex-html > span.base'
  );
  let collectiveSpanWidth = 0;

  for (let baseSpan of baseSpans) {
    collectiveSpanWidth += baseSpan.getBoundingClientRect().width;
  }

  let partialSumOfSpanWidths = collectiveSpanWidth;
  if (baseSpans.length > 0) {
    const msg = span.parentNode;
    let oversizedBaseFound = false;
    // console.log(`msg:`);
    // console.log(msg);
    // console.log(
    //   `msg.getBoundingClientRect().width = ${msg.getBoundingClientRect().width}`
    // );
    for (const baseSpan of baseSpans) {
      // console.log(`baseSpan:`);
      // console.log(baseSpan);
      // console.log(
      //   `baseSpan.getBoundingClientRect().width = ${
      //     baseSpan.getBoundingClientRect().width
      //   }`
      // );
      if (
        baseSpan.getBoundingClientRect().width >
        msg.getBoundingClientRect().width
      ) {
        oversizedBaseFound = true;
        break;
      }
    }

    if (oversizedBaseFound) {
      // console.log(`setting overflow-x to scroll`);
      const katexSpan = span.firstElementChild;
      // let katexSpan = span.firstElementChild;
      // if (span.firstElementChild.getAttribute('class') === 'katex') {
      //   katexSpan = document.createElement('span');
      //   const inlineKatex = span.firstElementChild;
      //   span.insertBefore(katexSpan, inlineKatex);
      //   inlineKatex.remove();
      //   katexSpan.appendChild(inlineKatex);
      // }
      katexSpan.classList.add('katex-scrollable');

      if (katexSpan.getAttribute('class') === 'katex katex-scrollable') {
        katexSpan.style.display = 'inline-block';
      }
      katexSpan.style.width = `${msg.getBoundingClientRect().width}px`;
      katexSpan.style.overflowX = 'scroll';
      katexSpan.style.overflowY = 'hidden';
      katexSpan.style.scrollbarWidth = 'none';
      // const katexHtmlSpan = baseSpans[0].parentNode;
      // katexHtmlSpan.style.width = `${msg.getBoundingClientRect().width}px`;
      // katexHtmlSpan.style.overflowX = 'scroll';
      // katexHtmlSpan.style.overflowY = 'hidden';
      // katexHtmlSpan.style.scrollbarWidth = 'none';
    } else {
      let i = baseSpans.length - 1;
      let j = 0;
      // console.log(`baseSpans[0]`);
      // console.log(baseSpans[0]);
      // console.log(`i = ${i}, j = ${j}`);
      // baseSpans[0].parentNode.style.width = '100%';
      // const insertLineBreak = () => {
      //   if (
      //     collectiveSpanWidth >
      //     baseSpans[0].parentNode.getBoundingClientRect().width
      //   ) {
      //     console.log(`formula too wide for container`);
      //     if (i > j) {
      //       if (
      //         partialSumOfSpanWidths -
      //           baseSpans[i].getBoundingClientRect().width <=
      //           baseSpans[0].parentNode.getBoundingClientRect().width - 10 ||
      //         i - j === 1
      //       ) {
      //         const spacer = document.createElement('div');
      //         spacer.style.margin = '10px 0px';
      //         baseSpans[0].parentNode.insertBefore(spacer, baseSpans[i]);

      //         if (
      //           collectiveSpanWidth -
      //             (partialSumOfSpanWidths -
      //               baseSpans[i].getBoundingClientRect().width) >
      //           baseSpans[0].parentNode.getBoundingClientRect().width - 10
      //         ) {
      //           partialSumOfSpanWidths =
      //             collectiveSpanWidth -
      //             (partialSumOfSpanWidths -
      //               baseSpans[i].getBoundingClientRect().width);
      //           collectiveSpanWidth = partialSumOfSpanWidths;
      //           j = i;
      //           i = baseSpans.length - 1;

      //           insertLineBreak();
      //         }
      //       } else {
      //         partialSumOfSpanWidths -=
      //           baseSpans[i--].getBoundingClientRect().width;

      //         insertLineBreak();
      //       }
      //     } else {
      //       console.log(`setting overflow-x to scroll`);
      //       baseSpans[0].style.overflowX = 'scroll';
      //     }
      //   }
      // };
      const insertLineBreak = () => {
        if (
          collectiveSpanWidth > span.parentNode.getBoundingClientRect().width
        ) {
          // console.log(`formula too wide for container`);
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
          // else {
          //   console.log(`setting overflow-x to scroll`);
          //   baseSpans[0].style.width = `${
          //     span.parentNode.getBoundingClientRect().width
          //   }px`;
          //   // baseSpans[0].style.width = '100px';
          //   baseSpans[0].style.overflowX = 'scroll';
          //   baseSpans[0].style.overflowY = 'hidden';
          //   // baseSpans[0].style.scrollbarWidth = 'thin';
          //   baseSpans[0].style.scrollbarWidth = 'none';
          // }
        }
      };
      insertLineBreak();
    }
  }
};

const removeLineBreaks = (span) => {
  span.querySelectorAll('div').forEach((div) => {
    if (div.style.margin === '10px 0px' && div.attributes.length === 1) {
      div.remove();
    }
  });
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
  // domInfo.observeThreadContainerWidth();

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
