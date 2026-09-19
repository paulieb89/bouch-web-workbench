// Ashcombe Tool Library: open-now indicator, tool filter, membership form.
// Progressive enhancement: the page is complete without this script.
(function () {
  'use strict';

  /* ---------- Open-now indicator (Europe/London) ---------- */

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Minutes after midnight, UK time. Opening inclusive, closing exclusive.
  const HOURS = {
    Tuesday: { open: '17:30', close: '19:30' },
    Thursday: { open: '17:30', close: '19:30' },
    Saturday: { open: '10:00', close: '13:00' },
  };
  const toMinutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

  const ukFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });

  function ukNow(date) {
    const parts = Object.fromEntries(ukFormat.formatToParts(date).map((p) => [p.type, p.value]));
    const hour = Number(parts.hour) % 24;
    return {
      day: DAYS.indexOf(parts.weekday),
      seconds: hour * 3600 + Number(parts.minute) * 60 + Number(parts.second),
    };
  }

  function openStatus(date) {
    const now = ukNow(date);
    const today = HOURS[DAYS[now.day]];
    if (today) {
      const open = toMinutes(today.open) * 60, close = toMinutes(today.close) * 60;
      if (now.seconds >= open && now.seconds < close) return { open: true, text: `Open now until ${today.close}` };
      if (now.seconds < open) return { open: false, text: `Closed now. Opens today at ${today.open}` };
    }
    for (let offset = 1; offset <= 7; offset++) {
      const name = DAYS[(now.day + offset) % 7];
      const h = HOURS[name];
      if (!h) continue;
      const when = offset === 1 ? 'tomorrow' : name;
      return { open: false, text: `Closed now. Opens ${when} at ${h.open}` };
    }
    return null;
  }

  const openNow = document.getElementById('open-now');
  const hourRows = document.querySelectorAll('.hours tbody tr[data-day]');

  function markToday(dayName) {
    hourRows.forEach((row) => {
      const isToday = row.dataset.day === dayName;
      const tag = row.querySelector('.today-tag');
      row.classList.toggle('is-today', isToday);
      if (isToday && !tag) {
        const span = document.createElement('span');
        span.className = 'today-tag';
        span.textContent = 'Today';
        row.querySelector('th').append(' ', span);
      } else if (!isToday && tag) {
        tag.previousSibling?.nodeType === 3 && tag.previousSibling.remove();
        tag.remove();
      }
    });
  }

  function refreshOpenNow() {
    const date = new Date();
    const status = openStatus(date);
    if (openNow && status) {
      if (openNow.textContent !== status.text) openNow.textContent = status.text;
      openNow.classList.toggle('is-open', status.open);
      openNow.hidden = false;
    }
    markToday(DAYS[ukNow(date).day]);
  }

  refreshOpenNow();
  setInterval(refreshOpenNow, 15000);

  /* ---------- Tool list and filter ---------- */

  const search = document.getElementById('tool-search');
  const chips = Array.from(document.querySelectorAll('.chips button[data-category]'));
  const statusLine = document.getElementById('tool-status');
  const table = document.getElementById('tool-table');
  const empty = document.getElementById('tool-empty');
  const clearButton = document.getElementById('clear-filters');
  const rows = Array.from(table.tBodies[0].rows).map((row) => ({
    row,
    name: row.cells[0].textContent.trim().toLowerCase(),
    category: row.cells[1].textContent.trim(),
  }));
  let category = 'All';

  function applyFilter() {
    const query = search.value.trim().toLowerCase();
    let shown = 0;
    for (const t of rows) {
      const match = (category === 'All' || t.category === category) && t.name.includes(query);
      t.row.hidden = !match;
      if (match) shown++;
    }
    const text = `Showing ${shown} of ${rows.length} tools`;
    if (statusLine.textContent !== text) statusLine.textContent = text;
    table.hidden = shown === 0;
    empty.hidden = shown !== 0;
  }

  function setCategory(next) {
    category = next;
    chips.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.category === next)));
    applyFilter();
  }

  chips.forEach((b) => b.addEventListener('click', () => setCategory(b.dataset.category)));
  search.addEventListener('input', applyFilter);
  clearButton.addEventListener('click', () => {
    search.value = '';
    setCategory('All');
    search.focus();
  });
  applyFilter();

  /* ---------- Membership form ---------- */

  const form = document.getElementById('join-form');
  const POSTCODE = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/;
  const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
  const el = (id) => document.getElementById(id);

  const fields = {
    name: {
      controls: [el('f-name')],
      validate: () => (el('f-name').value.trim() ? '' : 'Enter your full name'),
    },
    email: {
      controls: [el('f-email')],
      validate: () => {
        const v = el('f-email').value.trim();
        if (!v) return 'Enter your email address';
        return EMAIL.test(v) ? '' : 'Enter an email address in the format name@example.com';
      },
    },
    postcode: {
      controls: [el('f-postcode')],
      validate: () => {
        const v = el('f-postcode').value.trim().toUpperCase();
        if (!v) return 'Enter your postcode';
        return POSTCODE.test(v) ? '' : 'Enter a UK postcode, like AB1 2CD';
      },
    },
    type: {
      controls: Array.from(form.querySelectorAll('input[name="type"]')),
      group: el('f-type'),
      validate: () => (form.querySelector('input[name="type"]:checked') ? '' : 'Choose a membership type'),
    },
    interests: {
      controls: [el('f-interests')],
      hint: 'f-interests-hint',
      validate: () => (el('f-interests').value.length > 500 ? 'Use 500 characters or fewer' : ''),
    },
    rules: {
      controls: [el('f-rules')],
      validate: () => (el('f-rules').checked ? '' : 'Confirm you have read the borrowing rules'),
    },
  };

  // The submit button ships disabled so that, without JavaScript, the form cannot send a request.
  el('join-submit').disabled = false;
  let attempted = false;

  function show(key) {
    const f = fields[key];
    const message = f.validate();
    const errorId = `f-${key}-error`;
    const error = el(errorId);
    if (error.textContent !== message) error.textContent = message;
    const describedBy = [message ? errorId : '', f.hint || ''].filter(Boolean).join(' ');
    const targets = f.group ? [f.group, ...f.controls] : f.controls;
    for (const c of targets) {
      if (message) c.setAttribute('aria-invalid', 'true'); else c.removeAttribute('aria-invalid');
      if (describedBy) c.setAttribute('aria-describedby', describedBy); else c.removeAttribute('aria-describedby');
    }
    error.closest('.field').classList.toggle('has-error', Boolean(message));
    return !message;
  }

  for (const key of Object.keys(fields)) {
    for (const c of fields[key].controls) {
      const update = () => { if (attempted) show(key); };
      c.addEventListener('input', update);
      c.addEventListener('change', update);
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    attempted = true;
    let firstInvalid = null;
    for (const key of Object.keys(fields)) {
      if (!show(key) && !firstInvalid) {
        const f = fields[key];
        firstInvalid = f.controls.find((c) => c.checked) || f.controls[0];
      }
    }
    if (firstInvalid) { firstInvalid.focus(); return; }

    const name = el('f-name').value.trim();
    const choice = form.querySelector('input[name="type"]:checked');
    const done = document.createElement('p');
    done.className = 'confirmation';
    done.tabIndex = -1;
    done.textContent = `Thank you, ${name}. This is a demonstration, so nothing has been sent. `
      + `At your first session, bring photo ID and the ${choice.dataset.price} ${choice.value} membership fee.`;
    form.replaceWith(done);
    done.focus();
  });
})();
