const wrapTextNodes = (root, msgParts) => {
  for (const node of root.childNodes) {
    if (node.nodeName !== 'CODE') {
      if (node.constructor.name === 'Text') {
        const span = document.createElement('span');
        span.textContent = node.textContent;

        node.parentNode.insertBefore(span, node);
        node.remove();

        msgParts.push(span);
      } else {
        wrapTextNodes(node, msgParts);
      }
    }
  }
};

export { wrapTextNodes };
