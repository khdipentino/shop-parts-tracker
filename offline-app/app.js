"use strict";

/* =====================================================================
   Shop Parts Tracker — fully offline, browser-only edition.

   Everything lives in this browser's localStorage, tied to this exact
   file's location on disk. There is no server, no build step, no
   account, and — importantly — no real access control: anyone who can
   open this file can read or edit the underlying data (open dev tools,
   view source, etc.). The "operator" picker below is for recording who
   did what, not for keeping anyone out. Treat this computer/browser the
   way you'd treat a physical counter with a paper log on it.
   ===================================================================== */

// ---------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------
const STORAGE_KEY = "shopPartsTracker.v1";

function defaultState() {
  return {
    operators: [],
    employees: [],
    parts: [],
    invoices: [],
    invoiceItems: [],
    transactions: [],
    nextInvoiceNumber: 1,
    currentOperatorId: null,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    }
  } catch (e) {
    console.error("Could not read saved data — starting fresh.", e);
  }
  return defaultState();
}

let state = loadState();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------
function uuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function nowISO() {
  return new Date().toISOString();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function numOrNull(v) {
  const s = String(v ?? "").trim();
  return s === "" ? null : Number(s);
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function msgHtml(m) {
  return `<div class="msg ${m.tone === "error" ? "error" : "info"}">${esc(m.text)}</div>`;
}

function noOperatorMsg() {
  return `<div class="msg error">Select an operator at the top of the page before doing anything that changes stock or records.</div>`;
}

function findById(arr, id) {
  return arr.find((x) => x.id === id) || null;
}

// ---------------------------------------------------------------------
// Domain reads
// ---------------------------------------------------------------------
function getOperatorById(id) { return findById(state.operators, id); }
function getEmployeeById(id) { return findById(state.employees, id); }
function getPartById(id) { return findById(state.parts, id); }
function getInvoiceById(id) { return findById(state.invoices, id); }
function getOperatorOrNull() { return state.currentOperatorId ? getOperatorById(state.currentOperatorId) : null; }

function getEmployeeByBadge(code) { return state.employees.find((e) => e.badgeCode === code) || null; }
function getPartByBarcode(code) { return state.parts.find((p) => p.barcodeCode === code) || null; }

function listParts(query) {
  let list = state.parts.slice().sort((a, b) => a.partNumber.localeCompare(b.partNumber));
  if (query) {
    const q = query.toLowerCase();
    list = list.filter(
      (p) => p.partNumber.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.barcodeCode.toLowerCase().includes(q)
    );
  }
  return list;
}

function listEmployees(query) {
  let list = state.employees.slice().sort((a, b) => a.lastName.localeCompare(b.lastName));
  if (query) {
    const q = query.toLowerCase();
    list = list.filter(
      (e) => e.firstName.toLowerCase().includes(q) || e.lastName.toLowerCase().includes(q) || e.badgeCode.toLowerCase().includes(q)
    );
  }
  return list;
}

function transactionsForPart(partId) {
  return state.transactions.filter((t) => t.partId === partId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function transactionsForEmployee(employeeId) {
  return state.transactions.filter((t) => t.employeeId === employeeId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function outstandingItemsForEmployee(employeeId) {
  return state.invoiceItems.filter((item) => {
    const inv = getInvoiceById(item.invoiceId);
    return inv && inv.employeeId === employeeId && !inv.voided && item.quantity - item.returnedQuantity > 0;
  });
}

// ---------------------------------------------------------------------
// Domain writes — every stock movement funnels through insertTransaction
// so quantityOnHand can never drift from the history.
// ---------------------------------------------------------------------
function insertTransaction({ type, partId, quantity, employeeId = null, invoiceId = null, invoiceItemId = null, workOrderNumber = null, notes = null, performedBy }) {
  const txn = { id: uuid(), type, partId, quantity, employeeId, invoiceId, invoiceItemId, workOrderNumber, notes, performedBy, createdAt: nowISO() };
  state.transactions.push(txn);
  const part = getPartById(partId);
  if (part) part.quantityOnHand += quantity;
  return txn;
}

function receivePart(partId, quantity, notes, performedBy) {
  if (!quantity || quantity <= 0) throw new Error("Quantity must be positive.");
  const txn = insertTransaction({ type: "receive", partId, quantity, notes, performedBy });
  save();
  return txn;
}

function adjustStock(partId, delta, notes, performedBy) {
  if (!delta) throw new Error("Adjustment must be non-zero.");
  const txn = insertTransaction({ type: "adjustment", partId, quantity: delta, notes, performedBy });
  save();
  return txn;
}

function createIssue(employeeId, workOrderNumber, items, performedBy) {
  if (!items.length) throw new Error("At least one part is required.");
  const invoiceId = uuid();
  const invoiceNumber = state.nextInvoiceNumber++;
  const invoice = {
    id: invoiceId, invoiceNumber, employeeId, workOrderNumber: workOrderNumber || null,
    createdBy: performedBy, createdAt: nowISO(), voided: false, voidedBy: null, voidedAt: null, voidReason: null,
  };
  state.invoices.push(invoice);

  for (const item of items) {
    if (!item.quantity || item.quantity <= 0) throw new Error("Each item quantity must be a positive number.");
    const part = getPartById(item.partId);
    if (!part) throw new Error("Unknown part in cart.");
    const invoiceItemId = uuid();
    state.invoiceItems.push({ id: invoiceItemId, invoiceId, partId: item.partId, quantity: item.quantity, returnedQuantity: 0, unitCostSnapshot: part.unitCost ?? null });
    insertTransaction({ type: "issue", partId: item.partId, quantity: -item.quantity, employeeId, invoiceId, invoiceItemId, workOrderNumber, performedBy });
  }

  save();
  return invoice;
}

function createReturn(invoiceItemId, quantity, notes, performedBy) {
  if (!quantity || quantity <= 0) throw new Error("Return quantity must be a positive number.");
  const item = findById(state.invoiceItems, invoiceItemId);
  if (!item) throw new Error("Invoice line item not found.");
  const invoice = getInvoiceById(item.invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.voided) throw new Error("Cannot return an item on a voided invoice.");
  const outstanding = item.quantity - item.returnedQuantity;
  if (quantity > outstanding) throw new Error(`Only ${outstanding} of this part are still outstanding on this receipt.`);

  item.returnedQuantity += quantity;
  const txn = insertTransaction({
    type: "return", partId: item.partId, quantity, employeeId: invoice.employeeId, invoiceId: invoice.id,
    invoiceItemId: item.id, workOrderNumber: invoice.workOrderNumber, notes, performedBy,
  });
  save();
  return txn;
}

function voidInvoice(invoiceId, reason, performedBy) {
  const invoice = getInvoiceById(invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.voided) throw new Error("This invoice is already voided.");

  const items = state.invoiceItems.filter((i) => i.invoiceId === invoiceId);
  for (const item of items) {
    const outstanding = item.quantity - item.returnedQuantity;
    if (outstanding > 0) {
      item.returnedQuantity = item.quantity;
      insertTransaction({
        type: "adjustment", partId: item.partId, quantity: outstanding, employeeId: invoice.employeeId,
        invoiceId: invoice.id, invoiceItemId: item.id, workOrderNumber: invoice.workOrderNumber,
        notes: `Restocked: receipt voided — ${(reason || "").trim() || "no reason given"}`, performedBy,
      });
    }
  }

  invoice.voided = true;
  invoice.voidedBy = performedBy;
  invoice.voidedAt = nowISO();
  invoice.voidReason = (reason || "").trim() || null;
  save();
}

function createPart({ partNumber, description, barcodeCode, reorderPoint, binLocation, unitCost, initialQuantity, performedBy }) {
  if (state.parts.some((p) => p.partNumber === partNumber)) throw new Error("A part with that part number already exists.");
  const code = barcodeCode || partNumber;
  if (state.parts.some((p) => p.barcodeCode === code)) throw new Error("A part with that barcode already exists.");
  const part = {
    id: uuid(), partNumber, description, barcodeCode: code, quantityOnHand: 0, reorderPoint: reorderPoint ?? null,
    binLocation: binLocation || null, unitCost: unitCost ?? null, active: true, createdAt: nowISO(), updatedAt: nowISO(),
  };
  state.parts.push(part);
  if (initialQuantity > 0) insertTransaction({ type: "receive", partId: part.id, quantity: initialQuantity, notes: "Initial stock on hand", performedBy });
  save();
  return part;
}

function updatePart(id, { partNumber, description, barcodeCode, reorderPoint, binLocation, unitCost }) {
  const part = getPartById(id);
  if (!part) throw new Error("Part not found.");
  if (!partNumber || !description || !barcodeCode) throw new Error("Part number, description, and barcode are required.");
  if (state.parts.some((p) => p.id !== id && p.partNumber === partNumber)) throw new Error("A part with that part number already exists.");
  if (state.parts.some((p) => p.id !== id && p.barcodeCode === barcodeCode)) throw new Error("A part with that barcode already exists.");
  Object.assign(part, { partNumber, description, barcodeCode, reorderPoint: reorderPoint ?? null, binLocation: binLocation || null, unitCost: unitCost ?? null, updatedAt: nowISO() });
  save();
}

function setPartActive(id, active) {
  const part = getPartById(id);
  if (part) { part.active = active; part.updatedAt = nowISO(); save(); }
}

function createEmployee({ firstName, lastName, badgeCode, shopSection }) {
  if (state.employees.some((e) => e.badgeCode === badgeCode)) throw new Error("An employee with that badge code already exists.");
  const employee = { id: uuid(), firstName, lastName, badgeCode, shopSection: shopSection || null, active: true, createdAt: nowISO() };
  state.employees.push(employee);
  save();
  return employee;
}

function updateEmployee(id, { firstName, lastName, badgeCode, shopSection }) {
  const employee = getEmployeeById(id);
  if (!employee) throw new Error("Employee not found.");
  if (!firstName || !lastName || !badgeCode) throw new Error("First name, last name, and badge code are required.");
  if (state.employees.some((e) => e.id !== id && e.badgeCode === badgeCode)) throw new Error("An employee with that badge code already exists.");
  Object.assign(employee, { firstName, lastName, badgeCode, shopSection: shopSection || null });
  save();
}

function setEmployeeActive(id, active) {
  const employee = getEmployeeById(id);
  if (employee) { employee.active = active; save(); }
}

// ---------------------------------------------------------------------
// Scanner input — a USB/Bluetooth "keyboard wedge" scanner just types the
// code then Enter, exactly like a fast typist. So any text input handles
// it as long as Enter submits instead of a button click.
// ---------------------------------------------------------------------
function wireScanner(input, onScan) {
  input.focus();
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = input.value.trim();
      input.value = "";
      if (code) onScan(code);
    }
  });
}

// ---------------------------------------------------------------------
// Printing — the printable markup is generated once and dropped into
// #print-area right before printing; CSS hides everything else while
// printing (see styles.css).
// ---------------------------------------------------------------------
function labelMarkup(part) {
  return `<div class="print-sheet">
    <p style="font-size:14px; font-weight:500; margin:0;">${esc(part.description)}</p>
    <p style="font-size:12px; color:#555; margin:2px 0 8px;">${esc(part.partNumber)}</p>
    <svg class="barcode-target"></svg>
  </div>`;
}

function badgeMarkup(employee) {
  return `<div class="print-sheet" style="width:260px;">
    <p style="font-size:15px; font-weight:500; margin:0;">${esc(employee.firstName)} ${esc(employee.lastName)}</p>
    ${employee.shopSection ? `<p style="font-size:12px; color:#555; margin:2px 0 8px;">${esc(employee.shopSection)}</p>` : ""}
    <svg class="barcode-target"></svg>
  </div>`;
}

function receiptMarkup(invoice, employee, items) {
  return `<div class="print-sheet">
    <h1 style="font-size:16px; margin:0;">Parts Receipt</h1>
    <p class="subtle" style="margin:0 0 8px;">#${invoice.invoiceNumber}</p>
    <p style="font-size:14px; margin:4px 0;"><span class="subtle">Employee: </span>${employee ? esc(employee.firstName + " " + employee.lastName) : "—"}</p>
    ${invoice.workOrderNumber ? `<p style="font-size:14px; margin:4px 0;"><span class="subtle">Work order / vehicle: </span>${esc(invoice.workOrderNumber)}</p>` : ""}
    <p style="font-size:14px; margin:4px 0 8px;"><span class="subtle">Date: </span>${formatDateTime(invoice.createdAt)}</p>
    <table style="width:100%; font-size:14px; border-top:1px solid #ccc; border-collapse:collapse;">
      <thead><tr style="text-align:left; color:#666;"><th style="padding:4px 0;">Part</th><th style="text-align:right;">Qty</th></tr></thead>
      <tbody>
        ${items.map((i) => {
          const part = getPartById(i.partId);
          return `<tr style="border-top:1px solid #eee;"><td style="padding:4px 0;">${esc(part ? part.description : "")} <span style="color:#888;">(${esc(part ? part.partNumber : "")})</span></td><td style="text-align:right;">${i.quantity}</td></tr>`;
        }).join("")}
      </tbody>
    </table>
    <p style="font-size:12px; color:#888; margin-top:16px;">Attach this receipt to the work order to charge the vehicle.</p>
  </div>`;
}

function printMarkup(html, barcodeValue) {
  const area = document.getElementById("print-area");
  area.innerHTML = html;
  if (barcodeValue) {
    const svg = area.querySelector(".barcode-target");
    if (svg && window.JsBarcode) JsBarcode(svg, barcodeValue, { format: "CODE128", height: 50, displayValue: true, fontSize: 14, margin: 8 });
  }
  window.print();
}

// ---------------------------------------------------------------------
// Operator picker (header)
// ---------------------------------------------------------------------
function populateOperatorPicker() {
  const sel = document.getElementById("operator-picker");
  const active = state.operators.filter((o) => o.active);
  sel.innerHTML = '<option value="">— none —</option>' + active.map((o) => `<option value="${o.id}">${esc(o.fullName)}</option>`).join("");
  sel.value = state.currentOperatorId || "";
  sel.onchange = () => {
    state.currentOperatorId = sel.value || null;
    save();
    router();
  };
}

// ---------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------
function currentHashPathAndQuery() {
  const h = location.hash.replace(/^#\/?/, "");
  const [path, query] = h.split("?");
  return { parts: path.split("/").filter(Boolean), params: new URLSearchParams(query || "") };
}

function updateNavActive(section) {
  document.querySelectorAll("#main-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === section);
  });
}

function router() {
  const { parts, params } = currentHashPathAndQuery();
  const root = document.getElementById("view-root");
  const section = parts[0] || "dashboard";
  updateNavActive(section);

  switch (section) {
    case "dashboard": renderDashboard(root); break;
    case "checkout": renderCheckout(root); break;
    case "receive": renderReceive(root); break;
    case "returns": renderReturns(root); break;
    case "parts":
      if (parts[1] === "new") renderPartNew(root, params);
      else if (parts[1] && parts[2] === "label") renderPartLabel(root, parts[1]);
      else if (parts[1]) renderPartDetail(root, parts[1]);
      else renderPartsList(root);
      break;
    case "employees":
      if (parts[1] === "new") renderEmployeeNew(root);
      else if (parts[1] && parts[2] === "badge") renderEmployeeBadge(root, parts[1]);
      else if (parts[1]) renderEmployeeDetail(root, parts[1]);
      else renderEmployeesList(root);
      break;
    case "invoices":
      if (parts[1] && parts[2] === "print") renderInvoicePrint(root, parts[1]);
      else if (parts[1]) renderInvoiceDetail(root, parts[1]);
      else renderInvoicesList(root);
      break;
    case "operators": renderOperators(root); break;
    default: renderDashboard(root);
  }
}

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------
function renderDashboard(root) {
  const lowStock = state.parts
    .filter((p) => p.active && p.reorderPoint != null && p.quantityOnHand <= p.reorderPoint)
    .sort((a, b) => a.quantityOnHand - b.quantityOnHand)
    .slice(0, 20);
  const recent = state.transactions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15);
  const partCount = state.parts.filter((p) => p.active).length;
  const employeeCount = state.employees.filter((e) => e.active).length;

  root.innerHTML = `
    <div class="stack">
      <div class="risk-banner">Heads up: everything here is saved only in this browser, on this computer. There's no cloud backup — if this browser's data is cleared or the computer changes, this data goes with it.</div>
      <div>
        <h1>Dashboard</h1>
        <p class="subtle">${partCount} active parts · ${employeeCount} active employees</p>
      </div>
      <div class="action-cards">
        <a class="card" href="#/checkout"><h2>Checkout</h2><p class="subtle">Scan an employee badge, scan parts, print the receipt.</p></a>
        <a class="card" href="#/receive"><h2>Receive parts</h2><p class="subtle">Log parts coming in and restock the shelf.</p></a>
        <a class="card" href="#/returns"><h2>Returns</h2><p class="subtle">Put an unused part back on the shelf.</p></a>
      </div>
      <div class="grid-2">
        <section class="card">
          <h2>Low stock</h2>
          ${lowStock.length === 0 ? '<p class="subtle">Nothing at or below its reorder point.</p>' : `<div class="table-wrap"><table><tbody>
            ${lowStock.map((p) => `<tr><td><a href="#/parts/${p.id}">${esc(p.description)}<br><span class="subtle">${esc(p.partNumber)}</span></a></td><td><span class="badge-pill warn">${p.quantityOnHand} on hand</span></td></tr>`).join("")}
          </tbody></table></div>`}
        </section>
        <section class="card">
          <h2>Recent activity</h2>
          ${recent.length === 0 ? '<p class="subtle">Nothing yet.</p>' : `<div class="table-wrap"><table><tbody>
            ${recent.map((t) => {
              const part = getPartById(t.partId);
              const emp = t.employeeId ? getEmployeeById(t.employeeId) : null;
              return `<tr><td>${esc(part ? part.description : "Unknown part")}${emp ? " · " + esc(emp.firstName + " " + emp.lastName) : ""}<br><span class="subtle" style="text-transform:capitalize;">${t.type} · ${timeAgo(t.createdAt)}</span></td><td class="${t.quantity > 0 ? "qty-pos" : "qty-neg"}">${t.quantity > 0 ? "+" : ""}${t.quantity}</td></tr>`;
            }).join("")}
          </tbody></table></div>`}
        </section>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------
let checkoutUI = { employee: null, workOrder: "", cart: [], message: null };
function resetCheckoutUI() { checkoutUI = { employee: null, workOrder: "", cart: [], message: null }; }

function renderCheckout(root) {
  const op = getOperatorOrNull();
  root.innerHTML = `
    <div class="stack" style="max-width:640px;">
      <div><h1>Checkout</h1><p class="subtle">Scan the employee's badge, then scan each part they're taking.</p></div>
      ${!op ? noOperatorMsg() : ""}
      ${checkoutUI.message ? msgHtml(checkoutUI.message) : ""}
      <div class="card stack">
        <label>1. Employee badge</label>
        ${checkoutUI.employee ? `<div class="row between" style="background:var(--muted-bg); padding:8px 12px; border-radius:6px;">
            <span>${esc(checkoutUI.employee.firstName)} ${esc(checkoutUI.employee.lastName)} · ${esc(checkoutUI.employee.badgeCode)}</span>
            <button class="link" id="co-change-emp">Change employee</button>
          </div>` : `<input class="scanner" id="co-emp-scan" placeholder="Scan employee badge…" autocomplete="off">`}
      </div>
      ${checkoutUI.employee ? `
      <div class="card stack">
        <label>Work order / vehicle # (optional)</label>
        <input type="text" id="co-wo" placeholder="e.g. WO-4471" value="${esc(checkoutUI.workOrder)}">
      </div>
      <div class="card stack">
        <label>2. Scan parts</label>
        <input class="scanner" id="co-part-scan" placeholder="Scan part barcode…" autocomplete="off">
      </div>
      ${checkoutUI.cart.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Part</th><th style="width:90px;">Qty</th><th style="width:90px;">Left after</th><th style="width:36px;"></th></tr></thead>
        <tbody>
          ${checkoutUI.cart.map((line, i) => `<tr>
            <td>${esc(line.part.description)}<br><span class="subtle">${esc(line.part.partNumber)}</span></td>
            <td><input type="number" min="1" value="${line.quantity}" data-cart-qty="${i}" style="width:64px;"></td>
            <td class="subtle">${line.part.quantityOnHand - line.quantity}</td>
            <td><button class="link" data-cart-remove="${i}">✕</button></td>
          </tr>`).join("")}
        </tbody>
      </table></div>` : ""}
      <div class="row">
        <button class="primary" id="co-complete" ${checkoutUI.cart.length === 0 ? "disabled" : ""}>Complete &amp; print receipt</button>
        <button class="link" id="co-start-over">Start over</button>
      </div>
      ` : ""}
    </div>
  `;

  const empScan = document.getElementById("co-emp-scan");
  if (empScan) wireScanner(empScan, (code) => {
    const emp = getEmployeeByBadge(code);
    if (!emp || !emp.active) checkoutUI.message = { text: `No active employee found for badge "${code}".`, tone: "error" };
    else { checkoutUI.employee = emp; checkoutUI.message = { text: `Employee: ${emp.firstName} ${emp.lastName}`, tone: "info" }; }
    renderCheckout(root);
  });

  const changeEmp = document.getElementById("co-change-emp");
  if (changeEmp) changeEmp.onclick = () => { resetCheckoutUI(); renderCheckout(root); };

  const woInput = document.getElementById("co-wo");
  if (woInput) woInput.oninput = () => { checkoutUI.workOrder = woInput.value; };

  const partScan = document.getElementById("co-part-scan");
  if (partScan) wireScanner(partScan, (code) => {
    const part = getPartByBarcode(code);
    if (!part || !part.active) { checkoutUI.message = { text: `No active part found for barcode "${code}".`, tone: "error" }; renderCheckout(root); return; }
    const existing = checkoutUI.cart.find((l) => l.part.id === part.id);
    if (existing) existing.quantity += 1; else checkoutUI.cart.push({ part, quantity: 1 });
    checkoutUI.message = { text: `Added: ${part.description}`, tone: "info" };
    renderCheckout(root);
  });

  root.querySelectorAll("[data-cart-qty]").forEach((inp) => {
    inp.onchange = () => {
      const i = Number(inp.dataset.cartQty);
      checkoutUI.cart[i].quantity = Math.max(1, Math.floor(Number(inp.value)) || 1);
      renderCheckout(root);
    };
  });
  root.querySelectorAll("[data-cart-remove]").forEach((btn) => {
    btn.onclick = () => { checkoutUI.cart.splice(Number(btn.dataset.cartRemove), 1); renderCheckout(root); };
  });

  const startOverBtn = document.getElementById("co-start-over");
  if (startOverBtn) startOverBtn.onclick = () => { resetCheckoutUI(); renderCheckout(root); };

  const completeBtn = document.getElementById("co-complete");
  if (completeBtn) completeBtn.onclick = () => {
    const operator = getOperatorOrNull();
    if (!operator) { checkoutUI.message = { text: "Select an operator at the top of the page first.", tone: "error" }; renderCheckout(root); return; }
    try {
      const invoice = createIssue(checkoutUI.employee.id, checkoutUI.workOrder, checkoutUI.cart.map((l) => ({ partId: l.part.id, quantity: l.quantity })), operator.id);
      resetCheckoutUI();
      location.hash = `#/invoices/${invoice.id}/print`;
    } catch (e) {
      checkoutUI.message = { text: e.message, tone: "error" };
      renderCheckout(root);
    }
  };
}

// ---------------------------------------------------------------------
// Receive
// ---------------------------------------------------------------------
let receiveUI = { part: null, notFoundCode: null, log: [] };

function renderReceive(root) {
  const op = getOperatorOrNull();
  root.innerHTML = `
    <div class="stack" style="max-width:560px;">
      <div><h1>Receive parts</h1><p class="subtle">Scan a part barcode, confirm the quantity that came in, and it goes straight onto the shelf count.</p></div>
      ${!op ? noOperatorMsg() : ""}
      ${!receiveUI.part ? `<input class="scanner" id="rc-scan" placeholder="Scan or type part barcode / part number…" autocomplete="off">` : ""}
      ${receiveUI.notFoundCode ? `<div class="msg error">No part found for "${esc(receiveUI.notFoundCode)}". <a href="#/parts/new?barcode=${encodeURIComponent(receiveUI.notFoundCode)}">Add it as a new part</a>.</div>` : ""}
      ${receiveUI.part ? `<div class="card stack">
        <div><strong>${esc(receiveUI.part.description)}</strong><br><span class="subtle">${esc(receiveUI.part.partNumber)} · ${receiveUI.part.quantityOnHand} currently on hand</span></div>
        <div><label>Quantity received</label><input type="number" min="1" id="rc-qty" value="1" style="width:120px;"></div>
        <div><label>Notes (optional — PO #, vendor, etc.)</label><input type="text" id="rc-notes"></div>
        <div id="rc-error"></div>
        <div class="row"><button class="primary" id="rc-log">Log receipt</button><button class="link" id="rc-cancel">Cancel</button></div>
      </div>` : ""}
      ${receiveUI.log.length ? `<div class="table-wrap"><table><tbody>
        ${receiveUI.log.map((l) => `<tr><td>${esc(l.part.description)}</td><td class="qty-pos">+${l.quantity} <span class="subtle">· ${l.at}</span></td></tr>`).join("")}
      </tbody></table></div>` : ""}
    </div>
  `;

  const scanInput = document.getElementById("rc-scan");
  if (scanInput) wireScanner(scanInput, (code) => {
    const part = getPartByBarcode(code);
    if (!part) { receiveUI.part = null; receiveUI.notFoundCode = code; }
    else { receiveUI.part = part; receiveUI.notFoundCode = null; }
    renderReceive(root);
  });

  const cancelBtn = document.getElementById("rc-cancel");
  if (cancelBtn) cancelBtn.onclick = () => { receiveUI.part = null; renderReceive(root); };

  const logBtn = document.getElementById("rc-log");
  if (logBtn) logBtn.onclick = () => {
    const operator = getOperatorOrNull();
    if (!operator) { document.getElementById("rc-error").innerHTML = msgHtml({ text: "Select an operator first.", tone: "error" }); return; }
    const qty = Number(document.getElementById("rc-qty").value);
    const notes = document.getElementById("rc-notes").value.trim() || null;
    try {
      receivePart(receiveUI.part.id, qty, notes, operator.id);
      receiveUI.log.unshift({ part: receiveUI.part, quantity: qty, at: new Date().toLocaleTimeString() });
      receiveUI.part = null;
      renderReceive(root);
    } catch (e) {
      document.getElementById("rc-error").innerHTML = msgHtml({ text: e.message, tone: "error" });
    }
  };
}

// ---------------------------------------------------------------------
// Returns
// ---------------------------------------------------------------------
let returnsUI = { employee: null, items: [], quantities: {}, message: null };

function loadOutstanding() {
  returnsUI.items = outstandingItemsForEmployee(returnsUI.employee.id);
  returnsUI.quantities = {};
  returnsUI.items.forEach((i) => { returnsUI.quantities[i.id] = i.quantity - i.returnedQuantity; });
}

function renderReturns(root) {
  root.innerHTML = `
    <div class="stack" style="max-width:640px;">
      <div><h1>Returns</h1><p class="subtle">Scan the employee's badge to see everything still outstanding on their receipts.</p></div>
      ${returnsUI.message ? msgHtml(returnsUI.message) : ""}
      ${returnsUI.employee ? `<div class="row between" style="background:var(--muted-bg); padding:8px 12px; border-radius:6px;">
          <span>${esc(returnsUI.employee.firstName)} ${esc(returnsUI.employee.lastName)} · ${esc(returnsUI.employee.badgeCode)}</span>
          <button class="link" id="rt-change">Change employee</button>
        </div>` : `<input class="scanner" id="rt-scan" placeholder="Scan employee badge…" autocomplete="off">`}
      ${returnsUI.employee && returnsUI.items.length === 0 ? `<p class="subtle">Nothing outstanding for this employee.</p>` : ""}
      ${returnsUI.items.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Part</th><th>Receipt</th><th style="width:70px;">Out</th><th style="width:90px;">Return</th><th style="width:90px;"></th></tr></thead>
        <tbody>
          ${returnsUI.items.map((item) => {
            const part = getPartById(item.partId);
            const inv = getInvoiceById(item.invoiceId);
            const outstanding = item.quantity - item.returnedQuantity;
            return `<tr>
              <td>${esc(part ? part.description : "")}<br><span class="subtle">${esc(part ? part.partNumber : "")}</span></td>
              <td class="subtle">#${inv.invoiceNumber}${inv.workOrderNumber ? " · " + esc(inv.workOrderNumber) : ""}</td>
              <td class="subtle">${outstanding}</td>
              <td><input type="number" min="1" max="${outstanding}" value="${returnsUI.quantities[item.id]}" data-return-qty="${item.id}" style="width:64px;"></td>
              <td><button class="primary" data-return-go="${item.id}">Return</button></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table></div>` : ""}
    </div>
  `;

  const scanInput = document.getElementById("rt-scan");
  if (scanInput) wireScanner(scanInput, (code) => {
    const emp = getEmployeeByBadge(code);
    if (!emp) { returnsUI.employee = null; returnsUI.items = []; returnsUI.message = { text: `No employee found for badge "${code}".`, tone: "error" }; renderReturns(root); return; }
    returnsUI.employee = emp;
    returnsUI.message = null;
    loadOutstanding();
    renderReturns(root);
  });

  const changeBtn = document.getElementById("rt-change");
  if (changeBtn) changeBtn.onclick = () => { returnsUI = { employee: null, items: [], quantities: {}, message: null }; renderReturns(root); };

  root.querySelectorAll("[data-return-qty]").forEach((inp) => {
    inp.onchange = () => { returnsUI.quantities[inp.dataset.returnQty] = Number(inp.value); };
  });

  root.querySelectorAll("[data-return-go]").forEach((btn) => {
    btn.onclick = () => {
      const operator = getOperatorOrNull();
      if (!operator) { returnsUI.message = { text: "Select an operator first.", tone: "error" }; renderReturns(root); return; }
      const itemId = btn.dataset.returnGo;
      const item = findById(state.invoiceItems, itemId);
      const qty = returnsUI.quantities[itemId];
      try {
        createReturn(itemId, qty, "", operator.id);
        const part = getPartById(item.partId);
        returnsUI.message = { text: `Returned ${qty} × ${part ? part.description : "part"}.`, tone: "info" };
        loadOutstanding();
        renderReturns(root);
      } catch (e) {
        returnsUI.message = { text: e.message, tone: "error" };
        renderReturns(root);
      }
    };
  });
}

// ---------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------
let partsListQuery = "";

function renderPartsList(root) {
  const list = listParts(partsListQuery);
  root.innerHTML = `
    <div class="stack">
      <div class="row between"><h1>Parts</h1><a href="#/parts/new" class="btn primary">+ New part</a></div>
      <input type="text" id="parts-search" placeholder="Search part number, description, or barcode…" value="${esc(partsListQuery)}">
      <div class="table-wrap"><table>
        <thead><tr><th>Part #</th><th>Description</th><th>Bin</th><th>On hand</th></tr></thead>
        <tbody>
          ${list.map((p) => {
            const low = p.reorderPoint != null && p.quantityOnHand <= p.reorderPoint;
            return `<tr class="${p.active ? "" : "inactive"}"><td><a href="#/parts/${p.id}"><strong>${esc(p.partNumber)}</strong></a></td><td>${esc(p.description)}</td><td class="subtle">${p.binLocation ? esc(p.binLocation) : "—"}</td><td>${low ? `<span class="badge-pill warn">${p.quantityOnHand}</span>` : p.quantityOnHand}</td></tr>`;
          }).join("") || `<tr><td colspan="4" class="subtle" style="text-align:center;">No parts found.</td></tr>`}
        </tbody>
      </table></div>
    </div>
  `;
  const searchInput = document.getElementById("parts-search");
  searchInput.oninput = () => { partsListQuery = searchInput.value; renderPartsList(root); };
  searchInput.focus();
  searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
}

function renderPartNew(root, params) {
  const defaultBarcode = params.get("barcode") || "";
  root.innerHTML = `
    <div class="stack" style="max-width:560px;">
      <h1>New part</h1>
      <div class="grid-2">
        <div><label>Part number</label><input type="text" id="np-number"></div>
        <div><label>Barcode (defaults to part number)</label><input type="text" id="np-barcode" value="${esc(defaultBarcode)}"></div>
      </div>
      <div><label>Description</label><input type="text" id="np-desc"></div>
      <div class="grid-3">
        <div><label>Bin location</label><input type="text" id="np-bin"></div>
        <div><label>Reorder point</label><input type="number" id="np-reorder"></div>
        <div><label>Unit cost</label><input type="number" step="0.01" id="np-cost"></div>
      </div>
      <div><label>Starting quantity on hand</label><input type="number" id="np-qty" value="0"></div>
      <div id="np-error"></div>
      <div><button class="primary" id="np-save">Save part</button></div>
    </div>
  `;

  document.getElementById("np-save").onclick = () => {
    const partNumber = document.getElementById("np-number").value.trim();
    const description = document.getElementById("np-desc").value.trim();
    if (!partNumber || !description) { document.getElementById("np-error").innerHTML = msgHtml({ text: "Part number and description are required.", tone: "error" }); return; }
    const operator = getOperatorOrNull();
    try {
      const part = createPart({
        partNumber, description,
        barcodeCode: document.getElementById("np-barcode").value.trim() || partNumber,
        reorderPoint: numOrNull(document.getElementById("np-reorder").value),
        binLocation: document.getElementById("np-bin").value.trim() || null,
        unitCost: numOrNull(document.getElementById("np-cost").value),
        initialQuantity: Number(document.getElementById("np-qty").value) || 0,
        performedBy: operator ? operator.id : null,
      });
      location.hash = `#/parts/${part.id}`;
    } catch (e) {
      document.getElementById("np-error").innerHTML = msgHtml({ text: e.message, tone: "error" });
    }
  };
}

let partDetailUI = { id: null, editing: false, adjusting: false };

function renderPartDetail(root, id) {
  if (partDetailUI.id !== id) partDetailUI = { id, editing: false, adjusting: false };
  const part = getPartById(id);
  if (!part) { root.innerHTML = `<p>Part not found. <a href="#/parts">Back to parts</a></p>`; return; }
  const history = transactionsForPart(id);
  const low = part.reorderPoint != null && part.quantityOnHand <= part.reorderPoint;

  root.innerHTML = `
    <div class="stack">
      <a href="#/parts" class="subtle">← All parts</a>
      <div class="row between">
        <div>
          <h1>${esc(part.description)} ${!part.active ? '<span class="badge-pill muted">Archived</span>' : ""}</h1>
          <p class="subtle">${esc(part.partNumber)} · barcode ${esc(part.barcodeCode)}${part.binLocation ? ` · bin ${esc(part.binLocation)}` : ""}</p>
        </div>
        <div class="row">
          <span style="font-size:24px; font-family:ui-monospace,monospace; ${low ? "color:var(--warn);" : ""}">${part.quantityOnHand}</span>
          <a href="#/parts/${part.id}/label" class="subtle">Print label</a>
        </div>
      </div>
      <div class="row">
        <button class="link" id="pd-edit-toggle">${partDetailUI.editing ? "Cancel edit" : "Edit part"}</button>
        <button class="link" id="pd-adjust-toggle">${partDetailUI.adjusting ? "Cancel adjustment" : "Adjust stock (cycle count / correction)"}</button>
        <button class="link" id="pd-archive">${part.active ? "Archive part" : "Reactivate part"}</button>
      </div>
      ${partDetailUI.editing ? `<div class="card stack">
        <div class="grid-2">
          <div><label>Part number</label><input type="text" id="pe-number" value="${esc(part.partNumber)}"></div>
          <div><label>Barcode</label><input type="text" id="pe-barcode" value="${esc(part.barcodeCode)}"></div>
        </div>
        <div><label>Description</label><input type="text" id="pe-desc" value="${esc(part.description)}"></div>
        <div class="grid-3">
          <div><label>Bin location</label><input type="text" id="pe-bin" value="${part.binLocation ? esc(part.binLocation) : ""}"></div>
          <div><label>Reorder point</label><input type="number" id="pe-reorder" value="${part.reorderPoint ?? ""}"></div>
          <div><label>Unit cost</label><input type="number" step="0.01" id="pe-cost" value="${part.unitCost ?? ""}"></div>
        </div>
        <div id="pe-error"></div>
        <div class="row"><button class="primary" id="pe-save">Save</button></div>
      </div>` : ""}
      ${partDetailUI.adjusting ? `<div class="card stack">
        <div class="row" style="align-items:flex-end;">
          <div><label>Adjustment (+ or -)</label><input type="number" id="as-delta" style="width:100px;"></div>
          <div style="flex:1;"><label>Reason</label><input type="text" id="as-notes" placeholder="e.g. cycle count correction"></div>
        </div>
        <div id="as-error"></div>
        <div class="row"><button class="primary" id="as-save">Apply adjustment</button></div>
      </div>` : ""}
      <div>
        <h2>History</h2>
        <div class="table-wrap"><table>
          <thead><tr><th>When</th><th>Type</th><th>Qty</th><th>Employee / receipt</th><th>Notes</th></tr></thead>
          <tbody>
            ${history.map((h) => {
              const emp = h.employeeId ? getEmployeeById(h.employeeId) : null;
              const inv = h.invoiceId ? getInvoiceById(h.invoiceId) : null;
              return `<tr>
                <td class="subtle" style="white-space:nowrap;">${formatDateTime(h.createdAt)}</td>
                <td style="text-transform:capitalize;">${h.type}</td>
                <td class="${h.quantity > 0 ? "qty-pos" : ""}">${h.quantity > 0 ? "+" : ""}${h.quantity}</td>
                <td>${emp ? esc(emp.firstName + " " + emp.lastName) : ""}${inv ? ` · #${inv.invoiceNumber}` : ""}${h.workOrderNumber ? ` · ${esc(h.workOrderNumber)}` : ""}</td>
                <td class="subtle">${h.notes ? esc(h.notes) : ""}</td>
              </tr>`;
            }).join("") || `<tr><td colspan="5" class="subtle" style="text-align:center;">No history yet.</td></tr>`}
          </tbody>
        </table></div>
      </div>
    </div>
  `;

  document.getElementById("pd-edit-toggle").onclick = () => { partDetailUI.editing = !partDetailUI.editing; partDetailUI.adjusting = false; renderPartDetail(root, id); };
  document.getElementById("pd-adjust-toggle").onclick = () => { partDetailUI.adjusting = !partDetailUI.adjusting; partDetailUI.editing = false; renderPartDetail(root, id); };
  document.getElementById("pd-archive").onclick = () => { setPartActive(part.id, !part.active); renderPartDetail(root, id); };

  if (partDetailUI.editing) {
    document.getElementById("pe-save").onclick = () => {
      try {
        updatePart(part.id, {
          partNumber: document.getElementById("pe-number").value.trim(),
          description: document.getElementById("pe-desc").value.trim(),
          barcodeCode: document.getElementById("pe-barcode").value.trim(),
          reorderPoint: numOrNull(document.getElementById("pe-reorder").value),
          binLocation: document.getElementById("pe-bin").value.trim() || null,
          unitCost: numOrNull(document.getElementById("pe-cost").value),
        });
        partDetailUI.editing = false;
        renderPartDetail(root, part.id);
      } catch (e) {
        document.getElementById("pe-error").innerHTML = msgHtml({ text: e.message, tone: "error" });
      }
    };
  }

  if (partDetailUI.adjusting) {
    document.getElementById("as-save").onclick = () => {
      const operator = getOperatorOrNull();
      if (!operator) { document.getElementById("as-error").innerHTML = msgHtml({ text: "Select an operator first.", tone: "error" }); return; }
      const delta = Number(document.getElementById("as-delta").value);
      const notes = document.getElementById("as-notes").value.trim() || "Manual stock adjustment (e.g. cycle count)";
      try {
        adjustStock(part.id, delta, notes, operator.id);
        partDetailUI.adjusting = false;
        renderPartDetail(root, part.id);
      } catch (e) {
        document.getElementById("as-error").innerHTML = msgHtml({ text: e.message, tone: "error" });
      }
    };
  }
}

function renderPartLabel(root, id) {
  const part = getPartById(id);
  if (!part) { root.innerHTML = `<p>Part not found.</p>`; return; }
  root.innerHTML = `
    <div class="stack">
      <div class="row"><button class="primary" id="lbl-print">Print label</button><p class="subtle">Prints on plain paper — cut to size, or use adhesive label sheets in your printer.</p></div>
      <div style="display:inline-block;">${labelMarkup(part)}</div>
    </div>
  `;
  const svg = root.querySelector(".barcode-target");
  if (svg && window.JsBarcode) JsBarcode(svg, part.barcodeCode, { format: "CODE128", height: 50, displayValue: true, fontSize: 14, margin: 8 });
  document.getElementById("lbl-print").onclick = () => printMarkup(labelMarkup(part), part.barcodeCode);
}

// ---------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------
let employeesListQuery = "";

function renderEmployeesList(root) {
  const list = listEmployees(employeesListQuery);
  root.innerHTML = `
    <div class="stack">
      <div class="row between"><h1>Employees</h1><a href="#/employees/new" class="btn primary">+ New employee</a></div>
      <input type="text" id="employees-search" placeholder="Search name or badge…" value="${esc(employeesListQuery)}">
      <div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Badge</th><th>Section</th></tr></thead>
        <tbody>
          ${list.map((e) => `<tr class="${e.active ? "" : "inactive"}"><td><a href="#/employees/${e.id}"><strong>${esc(e.firstName)} ${esc(e.lastName)}</strong></a></td><td class="subtle" style="font-family:ui-monospace,monospace;">${esc(e.badgeCode)}</td><td>${e.shopSection ? esc(e.shopSection) : "—"}</td></tr>`).join("") || `<tr><td colspan="3" class="subtle" style="text-align:center;">No employees found.</td></tr>`}
        </tbody>
      </table></div>
    </div>
  `;
  const searchInput = document.getElementById("employees-search");
  searchInput.oninput = () => { employeesListQuery = searchInput.value; renderEmployeesList(root); };
  searchInput.focus();
  searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
}

function renderEmployeeNew(root) {
  root.innerHTML = `
    <div class="stack" style="max-width:520px;">
      <h1>New employee</h1>
      <div class="grid-2">
        <div><label>First name</label><input type="text" id="ne-first"></div>
        <div><label>Last name</label><input type="text" id="ne-last"></div>
      </div>
      <div><label>Badge code</label><input type="text" id="ne-badge" placeholder="What's printed/encoded on their badge"></div>
      <div><label>Shop section (optional)</label><input type="text" id="ne-section"></div>
      <div id="ne-error"></div>
      <div><button class="primary" id="ne-save">Save employee</button></div>
    </div>
  `;

  document.getElementById("ne-save").onclick = () => {
    const firstName = document.getElementById("ne-first").value.trim();
    const lastName = document.getElementById("ne-last").value.trim();
    const badgeCode = document.getElementById("ne-badge").value.trim();
    if (!firstName || !lastName || !badgeCode) { document.getElementById("ne-error").innerHTML = msgHtml({ text: "First name, last name, and badge code are required.", tone: "error" }); return; }
    try {
      const employee = createEmployee({ firstName, lastName, badgeCode, shopSection: document.getElementById("ne-section").value.trim() || null });
      location.hash = `#/employees/${employee.id}`;
    } catch (e) {
      document.getElementById("ne-error").innerHTML = msgHtml({ text: e.message, tone: "error" });
    }
  };
}

let employeeDetailUI = { id: null, editing: false };

function renderEmployeeDetail(root, id) {
  if (employeeDetailUI.id !== id) employeeDetailUI = { id, editing: false };
  const employee = getEmployeeById(id);
  if (!employee) { root.innerHTML = `<p>Employee not found. <a href="#/employees">Back to employees</a></p>`; return; }
  const history = transactionsForEmployee(id);

  root.innerHTML = `
    <div class="stack">
      <a href="#/employees" class="subtle">← All employees</a>
      <div class="row between">
        <div>
          <h1>${esc(employee.firstName)} ${esc(employee.lastName)} ${!employee.active ? '<span class="badge-pill muted">Inactive</span>' : ""}</h1>
          <p class="subtle">Badge ${esc(employee.badgeCode)}${employee.shopSection ? ` · ${esc(employee.shopSection)}` : ""}</p>
        </div>
        <a href="#/employees/${employee.id}/badge" class="subtle">Print badge</a>
      </div>
      <div class="row">
        <button class="link" id="ed-edit-toggle">${employeeDetailUI.editing ? "Cancel edit" : "Edit employee"}</button>
        <button class="link" id="ed-active-toggle">${employee.active ? "Deactivate employee" : "Reactivate employee"}</button>
      </div>
      ${employeeDetailUI.editing ? `<div class="card stack">
        <div class="grid-2">
          <div><label>First name</label><input type="text" id="ee-first" value="${esc(employee.firstName)}"></div>
          <div><label>Last name</label><input type="text" id="ee-last" value="${esc(employee.lastName)}"></div>
        </div>
        <div><label>Badge code</label><input type="text" id="ee-badge" value="${esc(employee.badgeCode)}"></div>
        <div><label>Shop section</label><input type="text" id="ee-section" value="${employee.shopSection ? esc(employee.shopSection) : ""}"></div>
        <div id="ee-error"></div>
        <div class="row"><button class="primary" id="ee-save">Save</button></div>
      </div>` : ""}
      <div>
        <h2>Issue / return history</h2>
        <div class="table-wrap"><table>
          <thead><tr><th>When</th><th>Type</th><th>Part</th><th>Qty</th><th>Work order</th></tr></thead>
          <tbody>
            ${history.map((h) => {
              const part = getPartById(h.partId);
              return `<tr>
                <td class="subtle" style="white-space:nowrap;">${formatDateTime(h.createdAt)}</td>
                <td style="text-transform:capitalize;">${h.type}</td>
                <td>${esc(part ? part.description : "")}</td>
                <td class="${h.quantity > 0 ? "qty-pos" : ""}">${h.quantity > 0 ? "+" : ""}${h.quantity}</td>
                <td class="subtle">${h.workOrderNumber ? esc(h.workOrderNumber) : ""}</td>
              </tr>`;
            }).join("") || `<tr><td colspan="5" class="subtle" style="text-align:center;">No activity yet.</td></tr>`}
          </tbody>
        </table></div>
      </div>
    </div>
  `;

  document.getElementById("ed-edit-toggle").onclick = () => { employeeDetailUI.editing = !employeeDetailUI.editing; renderEmployeeDetail(root, id); };
  document.getElementById("ed-active-toggle").onclick = () => { setEmployeeActive(employee.id, !employee.active); renderEmployeeDetail(root, id); };

  if (employeeDetailUI.editing) {
    document.getElementById("ee-save").onclick = () => {
      try {
        updateEmployee(employee.id, {
          firstName: document.getElementById("ee-first").value.trim(),
          lastName: document.getElementById("ee-last").value.trim(),
          badgeCode: document.getElementById("ee-badge").value.trim(),
          shopSection: document.getElementById("ee-section").value.trim() || null,
        });
        employeeDetailUI.editing = false;
        renderEmployeeDetail(root, employee.id);
      } catch (e) {
        document.getElementById("ee-error").innerHTML = msgHtml({ text: e.message, tone: "error" });
      }
    };
  }
}

function renderEmployeeBadge(root, id) {
  const employee = getEmployeeById(id);
  if (!employee) { root.innerHTML = `<p>Employee not found.</p>`; return; }
  root.innerHTML = `
    <div class="stack">
      <div class="row"><button class="primary" id="badge-print">Print badge</button></div>
      <div style="display:inline-block;">${badgeMarkup(employee)}</div>
    </div>
  `;
  const svg = root.querySelector(".barcode-target");
  if (svg && window.JsBarcode) JsBarcode(svg, employee.badgeCode, { format: "CODE128", height: 50, displayValue: true, fontSize: 14, margin: 8 });
  document.getElementById("badge-print").onclick = () => printMarkup(badgeMarkup(employee), employee.badgeCode);
}

// ---------------------------------------------------------------------
// Invoices (receipts)
// ---------------------------------------------------------------------
function renderInvoicesList(root) {
  const invoices = state.invoices.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  root.innerHTML = `
    <div class="stack">
      <h1>Receipt history</h1>
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Employee</th><th>Work order</th><th>Items</th><th>Date</th></tr></thead>
        <tbody>
          ${invoices.map((inv) => {
            const emp = getEmployeeById(inv.employeeId);
            const itemCount = state.invoiceItems.filter((i) => i.invoiceId === inv.id).reduce((s, i) => s + i.quantity, 0);
            return `<tr class="${inv.voided ? "inactive" : ""}">
              <td><a href="#/invoices/${inv.id}">#${inv.invoiceNumber}</a>${inv.voided ? ' <span style="color:var(--danger); font-size:12px;">voided</span>' : ""}</td>
              <td>${emp ? esc(emp.firstName + " " + emp.lastName) : "—"}</td>
              <td class="subtle">${inv.workOrderNumber ? esc(inv.workOrderNumber) : "—"}</td>
              <td class="subtle">${itemCount}</td>
              <td class="subtle" style="white-space:nowrap;">${formatDateTime(inv.createdAt)}</td>
            </tr>`;
          }).join("") || `<tr><td colspan="5" class="subtle" style="text-align:center;">No receipts yet.</td></tr>`}
        </tbody>
      </table></div>
    </div>
  `;
}

let invoiceDetailUI = { id: null, voiding: false };

function renderInvoiceDetail(root, id) {
  if (invoiceDetailUI.id !== id) invoiceDetailUI = { id, voiding: false };
  const invoice = getInvoiceById(id);
  if (!invoice) { root.innerHTML = `<p>Receipt not found. <a href="#/invoices">Back to receipts</a></p>`; return; }
  const emp = getEmployeeById(invoice.employeeId);
  const creator = invoice.createdBy ? getOperatorById(invoice.createdBy) : null;
  const items = state.invoiceItems.filter((i) => i.invoiceId === id);

  root.innerHTML = `
    <div class="stack">
      <a href="#/invoices" class="subtle">← Receipt history</a>
      <div class="row between">
        <div>
          <h1>Receipt #${invoice.invoiceNumber} ${invoice.voided ? '<span style="color:var(--danger); font-size:14px;">Voided</span>' : ""}</h1>
          <p class="subtle">${emp ? esc(emp.firstName + " " + emp.lastName) : "Unknown employee"}${invoice.workOrderNumber ? ` · ${esc(invoice.workOrderNumber)}` : ""} · ${formatDateTime(invoice.createdAt)}${creator ? ` · rung up by ${esc(creator.fullName)}` : ""}</p>
          ${invoice.voided && invoice.voidReason ? `<p style="color:var(--danger); font-size:14px;">Reason: ${esc(invoice.voidReason)}</p>` : ""}
        </div>
        <a href="#/invoices/${invoice.id}/print" class="subtle">Print / reprint</a>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Part</th><th>Issued</th><th>Returned</th></tr></thead>
        <tbody>
          ${items.map((i) => {
            const part = getPartById(i.partId);
            return `<tr><td>${esc(part ? part.description : "")}<br><span class="subtle">${esc(part ? part.partNumber : "")}</span></td><td>${i.quantity}</td><td class="subtle">${i.returnedQuantity}</td></tr>`;
          }).join("")}
        </tbody>
      </table></div>
      ${!invoice.voided ? (invoiceDetailUI.voiding ? `<div class="card stack" style="border-color:var(--danger-border); background:var(--danger-bg); max-width:480px;">
          <p style="color:var(--danger); font-size:14px; margin:0;">This restocks everything on the receipt that hasn't already been individually returned, and marks it voided. It stays in history — nothing is deleted.</p>
          <input type="text" id="void-reason" placeholder="Reason (e.g. wrong employee scanned)">
          <div id="void-error"></div>
          <div class="row"><button class="danger" id="void-confirm">Confirm void</button><button class="link" id="void-cancel">Cancel</button></div>
        </div>` : `<button class="link" style="color:var(--danger);" id="inv-void-open">Void this receipt</button>`) : ""}
    </div>
  `;

  const openBtn = document.getElementById("inv-void-open");
  if (openBtn) openBtn.onclick = () => { invoiceDetailUI.voiding = true; renderInvoiceDetail(root, id); };

  if (invoiceDetailUI.voiding) {
    document.getElementById("void-cancel").onclick = () => { invoiceDetailUI.voiding = false; renderInvoiceDetail(root, id); };
    document.getElementById("void-confirm").onclick = () => {
      const operator = getOperatorOrNull();
      if (!operator) { document.getElementById("void-error").innerHTML = msgHtml({ text: "Select an operator first.", tone: "error" }); return; }
      try {
        voidInvoice(invoice.id, document.getElementById("void-reason").value, operator.id);
        invoiceDetailUI.voiding = false;
        renderInvoiceDetail(root, id);
      } catch (e) {
        document.getElementById("void-error").innerHTML = msgHtml({ text: e.message, tone: "error" });
      }
    };
  }
}

function renderInvoicePrint(root, id) {
  const invoice = getInvoiceById(id);
  if (!invoice) { root.innerHTML = `<p>Receipt not found.</p>`; return; }
  const emp = getEmployeeById(invoice.employeeId);
  const items = state.invoiceItems.filter((i) => i.invoiceId === id);
  const markup = receiptMarkup(invoice, emp, items);

  root.innerHTML = `
    <div class="stack">
      <div class="row"><button class="primary" id="rcpt-print">Print</button><a href="#/checkout" class="subtle">Start next checkout</a></div>
      <div>${markup}</div>
    </div>
  `;

  document.getElementById("rcpt-print").onclick = () => printMarkup(markup, null);
  setTimeout(() => printMarkup(markup, null), 200);
}

// ---------------------------------------------------------------------
// Operators
// ---------------------------------------------------------------------
function renderOperators(root) {
  root.innerHTML = `
    <div class="stack">
      <h1>Operators</h1>
      <p class="subtle">The few people who work the counter. There's no password here — just pick your name at the top of the page before doing anything. This is for record-keeping, not security.</p>
      <div class="card stack">
        <h2>Add operator</h2>
        <div class="row">
          <input type="text" id="op-name" placeholder="Full name" style="flex:1;">
          <button class="primary" id="op-add">Add</button>
        </div>
        <div id="op-error"></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Actions</th></tr></thead>
        <tbody>
          ${state.operators.map((o) => `<tr class="${o.active ? "" : "inactive"}"><td>${esc(o.fullName)}</td><td><button class="link" data-op-toggle="${o.id}">${o.active ? "Deactivate" : "Reactivate"}</button></td></tr>`).join("") || `<tr><td colspan="2" class="subtle" style="text-align:center;">No operators yet.</td></tr>`}
        </tbody>
      </table></div>
    </div>
  `;

  document.getElementById("op-add").onclick = () => {
    const name = document.getElementById("op-name").value.trim();
    if (!name) { document.getElementById("op-error").innerHTML = msgHtml({ text: "Name is required.", tone: "error" }); return; }
    state.operators.push({ id: uuid(), fullName: name, active: true, createdAt: nowISO() });
    save();
    populateOperatorPicker();
    renderOperators(root);
  };

  root.querySelectorAll("[data-op-toggle]").forEach((btn) => {
    btn.onclick = () => {
      const op = getOperatorById(btn.dataset.opToggle);
      op.active = !op.active;
      if (!op.active && state.currentOperatorId === op.id) state.currentOperatorId = null;
      save();
      populateOperatorPicker();
      renderOperators(root);
    };
  });
}

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------
window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", () => {
  populateOperatorPicker();
  if (!location.hash) location.hash = "#/dashboard";
  router();
});

// If this file is open in two tabs/windows at once, the other tab's saves
// would otherwise be silently overwritten whenever this one saves next.
// Reloading state here doesn't fully solve two people editing at the same
// instant, but it keeps this tab from working off stale data.
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    state = loadState();
    populateOperatorPicker();
    router();
  }
});
