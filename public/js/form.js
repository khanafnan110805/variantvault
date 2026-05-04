/**
 * VariantVault — form.js
 * Handles: dynamic variant rows, searchable size dropdown, counters, validation
 */

'use strict';

// ── Generate all valid sizes: 0.5, 1.0, 1.5 … 100.0 ──────────────────────
const ALL_SIZES = [];
for (let i = 0.5; i <= 100; i = Math.round((i + 0.5) * 10) / 10) {
  ALL_SIZES.push(i);
}

// ── State ─────────────────────────────────────────────────────────────────
let formId = null;          // active form's id attribute
let rowCount = 0;           // total rows ever created (for unique IDs)

// ── Public entry point ────────────────────────────────────────────────────
/**
 * Call once per page. Sets up the "Add Variant" button + form submit.
 * @param {string} id - form element id
 */
function initVariantForm(id) {
  formId = id;
  const form = document.getElementById(id);
  if (!form) return;

  const addBtn = document.getElementById('addRowBtn');
  if (addBtn) addBtn.addEventListener('click', () => addVariantRow());

  form.addEventListener('submit', handleSubmit);
}

// ── Add a variant row ─────────────────────────────────────────────────────
/**
 * @param {number|null} prefillSize     - pre-selected size (edit page)
 * @param {number|null} prefillQty      - pre-filled quantity (edit page)
 */
function addVariantRow(prefillSize = null, prefillQty = null) {
  const container = document.getElementById('variantContainer');
  const template  = document.getElementById('variantRowTemplate');
  if (!container || !template) return;

  const clone = template.content.cloneNode(true);
  const row   = clone.querySelector('.variant-row');
  rowCount++;
  row.dataset.rowId = rowCount;

  // ── Grab sub-elements ──
  const sizeSearch   = row.querySelector('.size-search');
  const sizeValue    = row.querySelector('.size-value');
  const dropdown     = row.querySelector('.size-dropdown');
  const sizeError    = row.querySelector('.size-error');
  const qtyInput     = row.querySelector('.qty-input');
  const qtyError     = row.querySelector('.qty-error');
  const removeBtn    = row.querySelector('.remove-row-btn');

  // ── Pre-fill if provided ──
  if (prefillSize !== null) {
    sizeSearch.value = String(prefillSize);
    sizeValue.value  = String(prefillSize);
  }
  if (prefillQty !== null) {
    qtyInput.value = String(prefillQty);
  }

  // ── Size search: filter dropdown on input ──
  sizeSearch.addEventListener('input', () => {
    sizeValue.value = '';           // clear confirmed value when user types
    sizeError.classList.add('hidden');
    renderDropdown(sizeSearch.value, dropdown, sizeSearch, sizeValue);
    dropdown.classList.remove('hidden');
  });

  sizeSearch.addEventListener('focus', () => {
    renderDropdown(sizeSearch.value, dropdown, sizeSearch, sizeValue);
    dropdown.classList.remove('hidden');
  });

  // Keyboard navigation inside dropdown
  sizeSearch.addEventListener('keydown', (e) => {
    const opts = dropdown.querySelectorAll('.dropdown-option');
    const highlighted = dropdown.querySelector('.dropdown-option.highlighted');
    let idx = Array.from(opts).indexOf(highlighted);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      idx = Math.min(idx + 1, opts.length - 1);
      setHighlight(opts, idx);
      opts[idx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      idx = Math.max(idx - 1, 0);
      setHighlight(opts, idx);
      opts[idx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted) highlighted.click();
    } else if (e.key === 'Escape') {
      dropdown.classList.add('hidden');
    }
  });

  // Close dropdown when clicking outside this row
  document.addEventListener('click', (e) => {
    if (!row.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  // ── Quantity: live counter update ──
  qtyInput.addEventListener('input', () => {
    qtyError.classList.add('hidden');
    qtyInput.classList.remove('is-invalid');
    updateCounters();
  });

  // ── Remove row ──
  removeBtn.addEventListener('click', () => {
    row.style.opacity = '0';
    row.style.transform = 'translateX(10px)';
    row.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
    setTimeout(() => {
      row.remove();
      updateCounters();
      checkEmptyState();
    }, 150);
  });

  container.appendChild(clone);
  checkEmptyState();
  updateCounters();

  // Focus size field on new blank rows (not prefilled)
  if (prefillSize === null) {
    setTimeout(() => sizeSearch.focus(), 30);
  }
}

// ── Render dropdown options ───────────────────────────────────────────────
function renderDropdown(query, dropdown, sizeSearch, sizeValue) {
  dropdown.innerHTML = '';
  const q = query.trim().toLowerCase();

  const filtered = q
    ? ALL_SIZES.filter(s => String(s).startsWith(q) || String(s).includes(q))
    : ALL_SIZES;

  if (filtered.length === 0) {
    const el = document.createElement('div');
    el.className = 'dropdown-no-results';
    el.textContent = 'No sizes match "' + query + '"';
    dropdown.appendChild(el);
    return;
  }

  const currentVal = sizeValue.value;

  filtered.forEach((size, i) => {
    const el = document.createElement('div');
    el.className = 'dropdown-option' + (String(size) === currentVal ? ' selected' : '');
    if (i === 0 && !currentVal) el.classList.add('highlighted');
    el.textContent = size;
    el.dataset.size = size;

    el.addEventListener('mousedown', (e) => {
      e.preventDefault(); // prevent blur before click
      selectSize(size, sizeSearch, sizeValue, dropdown);
    });

    dropdown.appendChild(el);
  });
}

function selectSize(size, sizeSearch, sizeValue, dropdown) {
  sizeSearch.value = String(size);
  sizeValue.value  = String(size);
  dropdown.classList.add('hidden');
  updateCounters();
}

function setHighlight(opts, idx) {
  opts.forEach(o => o.classList.remove('highlighted'));
  if (opts[idx]) opts[idx].classList.add('highlighted');
}

// ── Counter update ────────────────────────────────────────────────────────
function updateCounters() {
  const rows = document.querySelectorAll('#variantContainer .variant-row');
  const countEl = document.getElementById('variantCount');
  const totalEl = document.getElementById('totalUnits');

  if (countEl) countEl.textContent = rows.length;

  if (totalEl) {
    let total = 0;
    rows.forEach(row => {
      const qty = parseInt(row.querySelector('.qty-input')?.value, 10);
      if (!isNaN(qty) && qty > 0) total += qty;
    });
    totalEl.textContent = total;
  }
}

// ── Empty state ───────────────────────────────────────────────────────────
function checkEmptyState() {
  const container = document.getElementById('variantContainer');
  const hint      = document.getElementById('emptyVariantHint');
  if (!container || !hint) return;
  const hasRows = container.querySelectorAll('.variant-row').length > 0;
  hint.classList.toggle('hidden', hasRows);
}

// ── Form validation & submit ──────────────────────────────────────────────
function handleSubmit(e) {
  const form = e.target;
  let valid  = true;

  // Validate product name
  const nameInput = form.querySelector('#productName');
  if (nameInput && nameInput.value.trim() === '') {
    nameInput.classList.add('is-invalid');
    nameInput.focus();
    valid = false;
  } else if (nameInput) {
    nameInput.classList.remove('is-invalid');
  }

  // Validate variant rows
  const rows = form.querySelectorAll('#variantContainer .variant-row');

  if (rows.length === 0) {
    const hint = document.getElementById('emptyVariantHint');
    if (hint) {
      hint.style.borderColor = '#fca5a5';
      setTimeout(() => { hint.style.borderColor = ''; }, 2000);
    }
    valid = false;
  }

  const seenSizes = new Set();

  rows.forEach(row => {
    const sizeVal  = row.querySelector('.size-value');
    const sizeSearch = row.querySelector('.size-search');
    const sizeError  = row.querySelector('.size-error');
    const qtyInput   = row.querySelector('.qty-input');
    const qtyError   = row.querySelector('.qty-error');

    // Validate size
    if (!sizeVal?.value || isNaN(parseFloat(sizeVal.value))) {
      sizeSearch?.classList.add('is-invalid');
      sizeError?.classList.remove('hidden');
      valid = false;
    } else if (seenSizes.has(sizeVal.value)) {
      sizeSearch?.classList.add('is-invalid');
      if (sizeError) {
        sizeError.textContent = 'Duplicate size.';
        sizeError.classList.remove('hidden');
      }
      valid = false;
    } else {
      sizeSearch?.classList.remove('is-invalid');
      sizeError?.classList.add('hidden');
      seenSizes.add(sizeVal.value);
    }

    // Validate quantity
    const qty = parseInt(qtyInput?.value, 10);
    if (isNaN(qty) || qty < 1) {
      qtyInput?.classList.add('is-invalid');
      qtyError?.classList.remove('hidden');
      valid = false;
    } else {
      qtyInput?.classList.remove('is-invalid');
      qtyError?.classList.add('hidden');
    }
  });

  if (!valid) {
    e.preventDefault();
    // Scroll to first error
    const firstError = form.querySelector('.is-invalid');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
