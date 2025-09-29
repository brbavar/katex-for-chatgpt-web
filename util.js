const isOfTheClasses = (node, theCs) => {
  for (const c of theCs) {
    if (
      node === null ||
      !('classList' in node) ||
      !node.classList.contains(c)
    ) {
      return false;
    }
  }
  return true;
};

export { isOfTheClasses };
