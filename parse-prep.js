const wrapTextNodes = (root, msgParts) => {
  for (const node of root.childNodes) {
    if (node.nodeName !== 'CODE') {
      if (node.constructor.name === 'Text') {
        const span = document.createElement('span');
        span.textContent = node.textContent;
        node.parentNode.insertBefore(span, node);
        node.remove();

        // console.log(`testing`);
        // // console.log(
        // //   `span.parentNode.getBoundingClientRect().width = ${
        // //     span.parentElement.getBoundingClientRect().width
        // //   }`
        // // );
        // // // span.style.width = `${span.parentNode.getBoundingClientRect().width}px`;
        // // span.width = `${span.parentNode.getBoundingClientRect().width}px`;
        // // // span.style.width = '100%';

        msgParts.push(span);
      } else {
        wrapTextNodes(node, msgParts);
      }
    }
  }
};

export { wrapTextNodes };
