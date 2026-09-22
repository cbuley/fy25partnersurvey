const FIELD_NAME = 'accountname';

// Replace this with the JSON endpoint for your form workbook.
const OPTIONS_URL = '/scactvities/mike?sheet=account';

/**
 * Accept the common response shapes used by published spreadsheet JSON.
 */
function getRows(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }

  return [];
}

/**
 * Read values from the published shared-account sheet.
 *
 * For a simple account-name list, the Option column is used as both
 * the displayed suggestion and the submitted input value.
 */
function getValues(rows) {
  const values = [];
  const seen = new Set();

  rows.forEach((row) => {
    const value = typeof row === 'string'
      ? row
      : row?.Option
        ?? row?.option
        ?? row?.Value
        ?? row?.value
        ?? '';

    const normalized = String(value).trim();

    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      values.push(normalized);
    }
  });

  return values;
}

/**
 * Enhance the existing EDS text input with a native datalist.
 *
 * The original input is preserved, including its name attribute,
 * so normal EDS form submission continues to handle the value.
 */
export default async function enhanceAccountAutocomplete(root = document) {
  const input = root.querySelector(`input[name="${FIELD_NAME}"]`);

  if (!input) {
    console.warn(`Account field not found: input[name="${FIELD_NAME}"]`);
    return false;
  }

  if (input.dataset.accountAutocomplete === 'true') {
    return true;
  }

  input.dataset.accountAutocomplete = 'true';

  const baseId = input.id || FIELD_NAME;
  const listId = `${baseId}-suggestions`.replace(/[^a-zA-Z0-9_-]/g, '-');

  let datalist = document.getElementById(listId);

  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = listId;
    input.insertAdjacentElement('afterend', datalist);
  }

  // This connects the editable input to the suggestion list.
  input.setAttribute('list', listId);

  try {
    const response = await fetch(OPTIONS_URL, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Options request failed with HTTP ${response.status}`);
    }

    const payload = await response.json();
    const values = getValues(getRows(payload));

    datalist.replaceChildren(
      ...values.map((value) => {
        const option = document.createElement('option');
        option.value = value;
        return option;
      }),
    );
  } catch (error) {
    // Leave the text input usable even if the suggestion endpoint fails.
    console.warn('Account suggestions could not be loaded.', error);
  }

  return true;
}
