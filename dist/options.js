const storage =
  globalThis.browser?.storage.sync || globalThis.chrome?.storage.sync;

// Saves options to storage API
const saveOptions = () => {
  const format = document.getElementById('long-formula-format').value;
  storage.set({ longFormulaFormat: format }, () => {
    // Update status to let user know options were saved.
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => {
      status.textContent = '';
    }, 750);
  });
};

// Restores select box and checkbox state using the preferences
// stored in storage API.
const restoreOptions = () => {
  storage.get({ longFormulaFormat: 'Add scroll bar' }, (items) => {
    document.getElementById('long-formula-format').value =
      items.longFormulaFormat;
  });
};

document.addEventListener('DOMContentLoaded', saveOptions);
document.getElementById('save').addEventListener('click', saveOptions);
