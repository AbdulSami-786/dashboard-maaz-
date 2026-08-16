/**
 * MD Fashion backend — Google Apps Script + Google Sheets.
 *
 * Deploy this as a Web App (Execute as: Me, Who has access: Anyone) and
 * point the frontend's VITE_APPS_SCRIPT_URL at the deployment URL.
 * See SETUP.md in this folder for full step-by-step instructions.
 */

const SHEET_NAMES = {
  USERS: 'Users',
  SESSIONS: 'Sessions',
  RESET_CODES: 'ResetCodes',
  ADDRESSES: 'Addresses',
  ORDERS: 'Orders',
  WISHLIST: 'Wishlist',
  REVIEWS: 'Reviews',
};

const SESSION_DURATION_DAYS = 30;
const RESET_CODE_DURATION_MINUTES = 15;
const STORE_NAME = 'MD Fashion';

/* =========================================================
   ONE-TIME SETUP
   Run this once from the Apps Script editor (select "setup"
   in the function dropdown, click Run). Creates every sheet
   tab and header row it needs, if they don't already exist.
   ========================================================= */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const schemas = {
    Users: ['id', 'name', 'email', 'passwordHash', 'salt', 'phone', 'suspended', 'createdAt'],
    Sessions: ['token', 'userId', 'createdAt', 'expiresAt'],
    ResetCodes: ['email', 'code', 'expiresAt', 'used'],
    Addresses: ['id', 'userId', 'label', 'line', 'city', 'postalCode', 'isDefault'],
    Orders: ['id', 'userId', 'date', 'status', 'itemsJson', 'subtotal', 'shipping', 'total', 'name', 'email', 'phone', 'address', 'city', 'postalCode', 'payment', 'createdAt'],
    Wishlist: ['userId', 'productId', 'addedAt'],
    Reviews: ['id', 'userId', 'orderId', 'productId', 'customerName', 'rating', 'comment', 'approved', 'createdAt'],
  };
  // Columns that hold numeric-looking values that must stay text (phone
  // numbers and postal codes can start with "0" — Sheets would otherwise
  // silently store them as numbers and drop the leading zero).
  const textColumns = {
    Users: ['phone'],
    Addresses: ['postalCode'],
    Orders: ['phone', 'postalCode'],
  };
  // Reviews are hidden from the site until you tick this box for them, and
  // suspended accounts are blocked from logging in until unticked — a real
  // checkbox is much less error-prone for an admin than typing text.
  const checkboxColumns = {
    Reviews: ['approved'],
    Users: ['suspended'],
  };
  Object.keys(schemas).forEach(function (name) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    const headers = schemas[name];
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    } else {
      // Sheet already has data — a schema change (like adding "suspended")
      // can't just overwrite row 1, so append any headers it's missing
      // instead. Re-running setup() after a code update is always safe.
      const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const missing = headers.filter(function (h) { return existingHeaders.indexOf(h) === -1; });
      if (missing.length) sheet.getRange(1, existingHeaders.length + 1, 1, missing.length).setValues([missing]);
    }
    // Read back the sheet's actual header order rather than assuming it
    // matches the schema array above — on a migrated sheet it won't (new
    // columns land at the end, not in their schema position).
    const actualHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    (textColumns[name] || []).forEach(function (col) {
      const idx = actualHeaders.indexOf(col);
      if (idx > -1) sheet.getRange(2, idx + 1, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('@');
    });
    (checkboxColumns[name] || []).forEach(function (col) {
      const idx = actualHeaders.indexOf(col);
      if (idx > -1) sheet.getRange(2, idx + 1, Math.max(sheet.getMaxRows() - 1, 1), 1).insertCheckboxes();
    });
  });
  // getUi() only works when the editor has an active UI session tied to the
  // spreadsheet; re-running this from the editor can lose that context. The
  // sheet/column setup above still completes either way, so don't let a
  // missing UI session make this look like setup failed.
  try {
    SpreadsheetApp.getUi().alert('Setup complete. All sheets are ready.\n\nOne more step: add two installable "On edit" triggers — one for onOrdersSheetEdit (order-status, cancellation, and review-request emails) and one for onReviewsSheetEdit (review-approved emails) — see SETUP.md.');
  } catch (err) {
    Logger.log('Setup complete (confirmation dialog unavailable in this context).');
  }
}

/* =========================================================
   ADMIN KEY SETUP
   Run this once from the Apps Script editor (select
   "setAdminKey" in the function dropdown, click Run) after
   changing ADMIN_KEY_TO_SET below to a strong secret of your
   choosing. This is the password the React dashboard asks
   for on its login screen. Re-run any time to rotate it.
   ========================================================= */
function setAdminKey() {
  const ADMIN_KEY_TO_SET = 'CHANGE_ME_TO_A_STRONG_SECRET';
  PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', ADMIN_KEY_TO_SET);
  try {
    SpreadsheetApp.getUi().alert('Admin key set. Use this value to log into the dashboard:\n\n' + ADMIN_KEY_TO_SET);
  } catch (err) {
    Logger.log('Admin key set to: ' + ADMIN_KEY_TO_SET);
  }
}

/* =========================================================
   EMAIL DIAGNOSTIC
   Run this directly from the Apps Script editor (pick "testEmail"
   in the function dropdown, click Run) to check whether MailApp
   can send at all from this account/deployment — independent of
   the order/review/wishlist flows. If this fails, every other
   email in the app will fail the same way; the alert (or the
   Executions log) will show the real error. If it succeeds but
   e.g. order-confirmation emails still don't arrive, the problem
   is specific to that code path, not MailApp itself.
   ========================================================= */
function testEmail() {
  const to = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  try {
    MailApp.sendEmail({
      to: to,
      subject: STORE_NAME + ' — test email',
      body: 'If you got this, MailApp is working fine from this deployment.\n\nRemaining quota today: ' + MailApp.getRemainingDailyQuota(),
    });
    SpreadsheetApp.getUi().alert('Sent to ' + to + '. Remaining daily quota: ' + MailApp.getRemainingDailyQuota() + '.\n\nCheck that inbox (and spam) now.');
  } catch (err) {
    SpreadsheetApp.getUi().alert('MailApp.sendEmail failed: ' + err.message);
  }
}

/* =========================================================
   ENTRY POINTS
   ========================================================= */
function doGet(e) {
  return jsonOutput({ ok: true, message: STORE_NAME + ' API is running' });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput({ ok: false, error: 'Invalid request body' });
  }

  try {
    switch (body.action) {
      case 'signup': return jsonOutput(handleSignup(body));
      case 'login': return jsonOutput(handleLogin(body));
      case 'forgotPassword': return jsonOutput(handleForgotPassword(body));
      case 'resetPassword': return jsonOutput(handleResetPassword(body));
      case 'getProfile': return jsonOutput(withAuth(body, handleGetProfile));
      case 'updateProfile': return jsonOutput(withAuth(body, handleUpdateProfile));
      case 'getAddresses': return jsonOutput(withAuth(body, handleGetAddresses));
      case 'addAddress': return jsonOutput(withAuth(body, handleAddAddress));
      case 'updateAddress': return jsonOutput(withAuth(body, handleUpdateAddress));
      case 'deleteAddress': return jsonOutput(withAuth(body, handleDeleteAddress));
      case 'getWishlist': return jsonOutput(withAuth(body, handleGetWishlist));
      case 'toggleWishlist': return jsonOutput(withAuth(body, handleToggleWishlist));
      case 'placeOrder': return jsonOutput(withAuth(body, handlePlaceOrder));
      case 'getOrders': return jsonOutput(withAuth(body, handleGetOrders));
      case 'submitReview': return jsonOutput(withAuth(body, handleSubmitReview));
      case 'getMyReviews': return jsonOutput(withAuth(body, handleGetMyReviews));
      case 'deleteReview': return jsonOutput(withAuth(body, handleDeleteReview));
      case 'getProductReviews': return jsonOutput(handleGetProductReviews(body));

      // ---- Admin dashboard actions (require adminKey) ----
      case 'adminGetOrders': return jsonOutput(withAdminAuth(body, handleAdminGetOrders));
      case 'adminUpdateOrderStatus': return jsonOutput(withAdminAuth(body, handleAdminUpdateOrderStatus));
      case 'adminGetReviews': return jsonOutput(withAdminAuth(body, handleAdminGetReviews));
      case 'adminSetReviewApproved': return jsonOutput(withAdminAuth(body, handleAdminSetReviewApproved));
      case 'adminDeleteReview': return jsonOutput(withAdminAuth(body, handleAdminDeleteReview));
      case 'adminGetUsers': return jsonOutput(withAdminAuth(body, handleAdminGetUsers));
      case 'adminSetUserSuspended': return jsonOutput(withAdminAuth(body, handleAdminSetUserSuspended));
      case 'adminDeleteUser': return jsonOutput(withAdminAuth(body, handleAdminDeleteUser));
      case 'adminGetWishlist': return jsonOutput(withAdminAuth(body, handleAdminGetWishlist));

      default: return jsonOutput({ ok: false, error: 'Unknown action: ' + body.action });
    }
  } catch (err) {
    return jsonOutput({ ok: false, error: err.message });
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* =========================================================
   AUTH HANDLERS
   ========================================================= */
function handleSignup(body) {
  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!name) return { ok: false, error: 'Name is required.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid email address.' };
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const existing = findRow(SHEET_NAMES.USERS, function (u) { return String(u.email).toLowerCase() === email; });
    if (existing) return { ok: false, error: 'An account with this email already exists.' };

    const id = Utilities.getUuid();
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    const createdAt = new Date().toISOString();
    appendRow(SHEET_NAMES.USERS, { id: id, name: name, email: email, passwordHash: passwordHash, salt: salt, phone: '', suspended: false, createdAt: createdAt });

    const token = createSession(id);
    return { ok: true, token: token, user: { id: id, name: name, email: email, phone: '' } };
  } finally {
    lock.releaseLock();
  }
}

function handleLogin(body) {
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  const userRow = findRow(SHEET_NAMES.USERS, function (u) { return String(u.email).toLowerCase() === email; });
  if (!userRow) return { ok: false, error: 'No account found with this email.' };

  const hash = hashPassword(password, userRow.salt);
  if (hash !== userRow.passwordHash) return { ok: false, error: 'Incorrect password.' };
  if (String(userRow.suspended) === 'true') return { ok: false, error: 'This account has been suspended. Contact support for help.' };

  const token = createSession(userRow.id);
  return { ok: true, token: token, user: { id: userRow.id, name: userRow.name, email: userRow.email, phone: userRow.phone || '' } };
}

function handleForgotPassword(body) {
  const email = (body.email || '').trim().toLowerCase();
  const userRow = findRow(SHEET_NAMES.USERS, function (u) { return String(u.email).toLowerCase() === email; });

  // Always report success so we don't reveal whether an email is registered.
  if (!userRow) return { ok: true };

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + RESET_CODE_DURATION_MINUTES * 60 * 1000).toISOString();
  appendRow(SHEET_NAMES.RESET_CODES, { email: email, code: code, expiresAt: expiresAt, used: 'false' });

  MailApp.sendEmail({
    to: email,
    subject: 'Your ' + STORE_NAME + ' password reset code',
    body: 'Your password reset code is: ' + code + '\n\n' +
      'This code expires in ' + RESET_CODE_DURATION_MINUTES + ' minutes.\n\n' +
      "If you didn't request this, you can safely ignore this email.",
  });

  return { ok: true };
}

function handleResetPassword(body) {
  const email = (body.email || '').trim().toLowerCase();
  const code = (body.code || '').trim();
  const newPassword = body.newPassword || '';

  if (newPassword.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

  const sheet = getSheet(SHEET_NAMES.RESET_CODES);
  const rows = sheetToObjects(sheet);
  const match = rows.slice().reverse().find(function (r) {
    return String(r.email).toLowerCase() === email && String(r.code) === code && String(r.used) !== 'true';
  });
  if (!match) return { ok: false, error: 'Invalid or expired code.' };
  if (new Date(match.expiresAt) < new Date()) return { ok: false, error: 'This code has expired. Request a new one.' };

  const userRow = findRow(SHEET_NAMES.USERS, function (u) { return String(u.email).toLowerCase() === email; });
  if (!userRow) return { ok: false, error: 'Account not found.' };

  const salt = generateSalt();
  const passwordHash = hashPassword(newPassword, salt);
  updateRowByField(SHEET_NAMES.USERS, 'id', userRow.id, { passwordHash: passwordHash, salt: salt });

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.getRange(match.__row, headers.indexOf('used') + 1).setValue('true');

  return { ok: true };
}

function createSession(userId) {
  const token = Utilities.getUuid();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  appendRow(SHEET_NAMES.SESSIONS, { token: token, userId: userId, createdAt: createdAt.toISOString(), expiresAt: expiresAt.toISOString() });
  return token;
}

function withAuth(body, handler) {
  const token = body.token;
  if (!token) return { ok: false, error: 'Not signed in.' };

  const session = findRow(SHEET_NAMES.SESSIONS, function (s) { return s.token === token; });
  if (!session) return { ok: false, error: 'Session expired. Please sign in again.' };
  if (new Date(session.expiresAt) < new Date()) return { ok: false, error: 'Session expired. Please sign in again.' };

  const userRow = findRow(SHEET_NAMES.USERS, function (u) { return u.id === session.userId; });
  if (!userRow) return { ok: false, error: 'Account not found.' };
  // Catches an account suspended mid-session (their token is still valid but
  // shouldn't keep working) — not just at the login gate.
  if (String(userRow.suspended) === 'true') return { ok: false, error: 'This account has been suspended. Contact support for help.' };

  return handler(body, userRow);
}

/* =========================================================
   ADMIN AUTH
   The dashboard sends `adminKey` in every admin request body;
   it must match the ADMIN_KEY script property set by
   setAdminKey() above.
   ========================================================= */
function withAdminAuth(body, handler) {
  const key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!key) return { ok: false, error: 'Admin key not configured on the server. Run setAdminKey() in the Apps Script editor first.' };
  if (body.adminKey !== key) return { ok: false, error: 'Invalid admin key.' };
  return handler(body);
}

/* =========================================================
   PROFILE
   ========================================================= */
function handleGetProfile(body, userRow) {
  return { ok: true, user: { id: userRow.id, name: userRow.name, email: userRow.email, phone: userRow.phone || '' } };
}

function handleUpdateProfile(body, userRow) {
  const name = (body.name || '').trim();
  const phone = (body.phone || '').trim();
  if (!name) return { ok: false, error: 'Name is required.' };

  updateRowByField(SHEET_NAMES.USERS, 'id', userRow.id, { name: name, phone: phone });
  return { ok: true, user: { id: userRow.id, name: name, email: userRow.email, phone: phone } };
}

/* =========================================================
   ADDRESSES
   ========================================================= */
function handleGetAddresses(body, userRow) {
  const rows = sheetToObjects(getSheet(SHEET_NAMES.ADDRESSES)).filter(function (a) { return a.userId === userRow.id; });
  return { ok: true, addresses: rows.map(stripRowMeta) };
}

function handleAddAddress(body, userRow) {
  const addr = body.address || {};
  const id = Utilities.getUuid();
  const record = {
    id: id,
    userId: userRow.id,
    label: addr.label || 'Home',
    line: addr.line || '',
    city: addr.city || '',
    postalCode: addr.postalCode || '',
    isDefault: addr.isDefault ? 'true' : 'false',
  };
  appendRow(SHEET_NAMES.ADDRESSES, record);
  return { ok: true, address: record };
}

function handleUpdateAddress(body, userRow) {
  const id = body.id;
  const addr = body.address || {};
  const existing = findRow(SHEET_NAMES.ADDRESSES, function (a) { return a.id === id && a.userId === userRow.id; });
  if (!existing) return { ok: false, error: 'Address not found.' };

  const updates = {};
  ['label', 'line', 'city', 'postalCode'].forEach(function (k) {
    if (addr[k] !== undefined) updates[k] = addr[k];
  });
  if (addr.isDefault !== undefined) updates.isDefault = addr.isDefault ? 'true' : 'false';

  updateRowByField(SHEET_NAMES.ADDRESSES, 'id', id, updates);
  return { ok: true };
}

function handleDeleteAddress(body, userRow) {
  const id = body.id;
  const existing = findRow(SHEET_NAMES.ADDRESSES, function (a) { return a.id === id && a.userId === userRow.id; });
  if (!existing) return { ok: false, error: 'Address not found.' };

  deleteRowByField(SHEET_NAMES.ADDRESSES, 'id', id);
  return { ok: true };
}

/* =========================================================
   WISHLIST
   ========================================================= */
function handleGetWishlist(body, userRow) {
  const rows = sheetToObjects(getSheet(SHEET_NAMES.WISHLIST)).filter(function (w) { return w.userId === userRow.id; });
  return { ok: true, wishlist: rows.map(function (r) { return r.productId; }) };
}

function handleToggleWishlist(body, userRow) {
  const productId = body.productId;
  const sheet = getSheet(SHEET_NAMES.WISHLIST);
  const rows = sheetToObjects(sheet);
  const existing = rows.find(function (w) { return w.userId === userRow.id && w.productId === productId; });

  if (existing) {
    sheet.deleteRow(existing.__row);

    try {
      const removedName = body.productName || 'this item';
      MailApp.sendEmail({
        to: userRow.email,
        subject: STORE_NAME + ' — removed from your wishlist',
        body: 'Hi ' + userRow.name + ',\n\n' +
          'We removed ' + removedName + ' from your wishlist, as requested.\n\n' +
          '— ' + STORE_NAME,
      });
    } catch (err) {
      Logger.log('Wishlist removal email failed: ' + err.message);
    }

    return { ok: true, added: false };
  }

  appendRow(SHEET_NAMES.WISHLIST, { userId: userRow.id, productId: productId, addedAt: new Date().toISOString() });

  try {
    const productName = body.productName || 'this item';
    const priceLine = body.productPrice ? ('Price: Rs. ' + body.productPrice + '\n') : '';
    MailApp.sendEmail({
      to: userRow.email,
      subject: STORE_NAME + ' — ' + productName + ' is waiting for you',
      body: 'Hi ' + userRow.name + ',\n\n' +
        "You saved " + productName + ' to your wishlist.\n' +
        priceLine +
        '\nIt\'s still available — head back to your account and grab it before it sells out.\n\n' +
        '— ' + STORE_NAME,
    });
  } catch (err) {
    Logger.log('Wishlist email failed: ' + err.message);
  }

  return { ok: true, added: true };
}

/* =========================================================
   ORDERS
   ========================================================= */
function handlePlaceOrder(body, userRow) {
  const order = body.order || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let record;
  try {
    const id = 'KTA-' + Math.floor(10000 + Math.random() * 90000);
    record = {
      id: id,
      userId: userRow.id,
      date: new Date().toLocaleDateString('en-GB'),
      status: 'Pending',
      itemsJson: JSON.stringify(order.items || []),
      subtotal: order.subtotal || 0,
      shipping: order.shipping || 0,
      total: order.total || 0,
      name: order.name || userRow.name,
      email: order.email || userRow.email,
      phone: order.phone || '',
      address: order.address || '',
      city: order.city || '',
      postalCode: order.postalCode || '',
      payment: order.payment || 'cod',
      createdAt: new Date().toISOString(),
    };
    appendRow(SHEET_NAMES.ORDERS, record);
  } finally {
    lock.releaseLock();
  }

  // The order is already saved at this point — a flaky email send should
  // never turn into a failed/duplicate order on the customer's side.
  try {
    const itemCount = (order.items || []).reduce(function (s, i) { return s + (i.qty || 0); }, 0);
    MailApp.sendEmail({
      to: record.email,
      subject: STORE_NAME + ' — order ' + record.id + ' confirmed',
      body: 'Hi ' + record.name + ',\n\n' +
        'Thanks for your order! Here are the details:\n\n' +
        'Order: ' + record.id + '\n' +
        'Items: ' + itemCount + '\n' +
        'Total: Rs. ' + record.total + '\n' +
        'Delivery to: ' + record.address + ', ' + record.city + ' ' + record.postalCode + '\n' +
        'Payment: ' + record.payment + '\n\n' +
        "We'll email you again as soon as your order ships. " +
        'You can track it any time from My Account > Orders.\n\n' +
        '— ' + STORE_NAME,
    });
  } catch (err) {
    Logger.log('Order confirmation email failed: ' + err.message);
  }

  return {
    ok: true,
    order: {
      id: record.id, date: record.date, status: record.status, total: record.total,
      subtotal: record.subtotal, shipping: record.shipping, name: record.name, email: record.email,
      phone: record.phone, address: record.address, city: record.city, postalCode: record.postalCode,
      payment: record.payment, items: order.items || [],
    },
  };
}

function handleGetOrders(body, userRow) {
  const rows = sheetToObjects(getSheet(SHEET_NAMES.ORDERS)).filter(function (o) { return o.userId === userRow.id; });
  rows.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

  const orders = rows.map(function (o) {
    return {
      id: o.id, date: o.date, status: o.status, total: o.total, subtotal: o.subtotal, shipping: o.shipping,
      name: o.name, email: o.email, phone: o.phone, address: o.address, city: o.city, postalCode: o.postalCode,
      payment: o.payment, items: safeParseJson(o.itemsJson) || [],
    };
  });
  return { ok: true, orders: orders };
}

/* =========================================================
   ORDER STATUS + REVIEW-REQUEST EMAILS
   Requires an installable "On edit" trigger pointed at
   onOrdersSheetEdit — see SETUP.md. (A plain onEdit(e) simple
   trigger can't send email; it runs without authorization.)

   Reads the status straight off the sheet (not e.value) and
   walks every row in the edited range, so this fires correctly
   whether you type into one cell, paste a value into several
   rows at once, or drag-fill a status down a column — e.value
   is only ever set for a single-cell edit, so relying on it
   silently drops status/cancellation emails for anything else.
   ========================================================= */
function onOrdersSheetEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAMES.ORDERS) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf('status') + 1;
  if (statusCol < 1) return;
  if (e.range.getColumn() > statusCol || e.range.getLastColumn() < statusCol) return;

  const firstRow = Math.max(e.range.getRow(), 2); // skip header row
  const lastRow = e.range.getLastRow();

  for (let row = firstRow; row <= lastRow; row++) {
    const newStatus = String(sheet.getRange(row, statusCol).getValue() || '').trim();
    if (!newStatus) continue;

    const rowValues = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
    const order = {};
    headers.forEach(function (h, i) { order[h] = rowValues[i]; });
    if (!order.email) continue;

    sendOrderStatusEmail(order, newStatus);
  }
}

// Shared by the sheet-edit trigger above and the admin dashboard's
// adminUpdateOrderStatus action, so a status change behaves identically
// (same customer emails) no matter which surface made it.
function sendOrderStatusEmail(order, newStatus) {
  try {
    MailApp.sendEmail({
      to: order.email,
      subject: STORE_NAME + ' — order ' + order.id + ' is now ' + newStatus,
      body: 'Hi ' + order.name + ',\n\n' +
        'Your order ' + order.id + ' has been updated to: ' + newStatus + '\n\n' +
        'You can view the full details any time from My Account > Orders.\n\n' +
        '— ' + STORE_NAME,
    });
  } catch (err) {
    Logger.log('Order status email failed: ' + err.message);
  }

  if (newStatus.toLowerCase() === 'delivered') {
    try {
      MailApp.sendEmail({
        to: order.email,
        subject: 'How was your ' + STORE_NAME + ' order?',
        body: 'Hi ' + order.name + ',\n\n' +
          'Your order ' + order.id + ' was marked as delivered — we hope you love it!\n\n' +
          "Sign in to My Account > Orders and tap \"Write a review\" on any item to share your feedback.\n\n" +
          '— ' + STORE_NAME,
      });
    } catch (err) {
      Logger.log('Review-request email failed: ' + err.message);
    }
  }
}

/* =========================================================
   REVIEWS
   ========================================================= */
function handleSubmitReview(body, userRow) {
  // orderId is optional — if present, the review is tied to that delivered order/item
  // (written from Orders > Write a Review). If absent, it's a general product review
  // (written from the product page) and only needs the user to be signed in.
  const orderId = body.orderId || '';
  const productId = body.productId;
  const rating = Number(body.rating);
  const comment = (body.comment || '').trim();

  if (!productId) return { ok: false, error: 'Product not found.' };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: 'Rating must be between 1 and 5.' };
  if (!comment) return { ok: false, error: 'Please write a short comment.' };

  if (orderId) {
    const order = findRow(SHEET_NAMES.ORDERS, function (o) { return o.id === orderId && o.userId === userRow.id; });
    if (!order) return { ok: false, error: 'Order not found.' };
    if (String(order.status).toLowerCase() !== 'delivered') return { ok: false, error: 'You can review an item once your order is delivered.' };

    const items = safeParseJson(order.itemsJson) || [];
    if (!items.some(function (i) { return i.id === productId; })) return { ok: false, error: 'That product is not part of this order.' };
  }

  const alreadyReviewed = findRow(SHEET_NAMES.REVIEWS, function (r) {
    if (r.userId !== userRow.id || r.productId !== productId) return false;
    return orderId ? r.orderId === orderId : true;
  });
  if (alreadyReviewed) return { ok: false, error: 'You already reviewed this product.' };

  appendRow(SHEET_NAMES.REVIEWS, {
    id: Utilities.getUuid(),
    userId: userRow.id,
    orderId: orderId,
    productId: productId,
    customerName: userRow.name,
    rating: rating,
    comment: comment,
    approved: false,
    createdAt: new Date().toISOString(),
  });

  try {
    MailApp.sendEmail({
      to: userRow.email,
      subject: STORE_NAME + ' — thanks for your review',
      body: 'Hi ' + userRow.name + ',\n\n' +
        "We've received your review and it's pending a quick check before it goes live on the product page. " +
        "We'll email you again as soon as it's approved.\n\n" +
        '— ' + STORE_NAME,
    });
  } catch (err) {
    Logger.log('Review submission email failed: ' + err.message);
  }

  return { ok: true };
}

function handleGetMyReviews(body, userRow) {
  const rows = sheetToObjects(getSheet(SHEET_NAMES.REVIEWS)).filter(function (r) { return r.userId === userRow.id; });
  rows.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

  const reviews = rows.map(function (r) {
    return {
      id: r.id, orderId: r.orderId, productId: r.productId,
      rating: Number(r.rating), comment: r.comment,
      approved: String(r.approved) === 'true',
      createdAt: r.createdAt,
    };
  });
  return { ok: true, reviews: reviews };
}

function handleDeleteReview(body, userRow) {
  const id = body.id;
  const existing = findRow(SHEET_NAMES.REVIEWS, function (r) { return r.id === id && r.userId === userRow.id; });
  if (!existing) return { ok: false, error: 'Review not found.' };

  deleteRowByField(SHEET_NAMES.REVIEWS, 'id', id);

  try {
    MailApp.sendEmail({
      to: userRow.email,
      subject: STORE_NAME + ' — your review was removed',
      body: 'Hi ' + userRow.name + ',\n\n' +
        'Your review has been deleted, as requested.\n\n' +
        '— ' + STORE_NAME,
    });
  } catch (err) {
    Logger.log('Review deletion email failed: ' + err.message);
  }

  return { ok: true };
}

function handleGetProductReviews(body) {
  const productId = body.productId;
  const rows = sheetToObjects(getSheet(SHEET_NAMES.REVIEWS)).filter(function (r) {
    return r.productId === productId && String(r.approved) === 'true';
  });
  rows.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

  const reviews = rows.map(function (r) {
    return { customerName: r.customerName, rating: Number(r.rating), comment: r.comment, createdAt: r.createdAt };
  });
  return { ok: true, reviews: reviews };
}

/* =========================================================
   REVIEW-APPROVAL EMAIL
   Requires a second installable "On edit" trigger, pointed at
   onReviewsSheetEdit — see SETUP.md. Fires when the `approved`
   checkbox in the Reviews sheet is ticked, and walks every row
   in the edited range so ticking several boxes at once (or a
   drag-fill) still emails each customer.
   ========================================================= */
function onReviewsSheetEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAMES.REVIEWS) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const approvedCol = headers.indexOf('approved') + 1;
  if (approvedCol < 1) return;
  if (e.range.getColumn() > approvedCol || e.range.getLastColumn() < approvedCol) return;

  const firstRow = Math.max(e.range.getRow(), 2); // skip header row
  const lastRow = e.range.getLastRow();

  for (let row = firstRow; row <= lastRow; row++) {
    const isApproved = String(sheet.getRange(row, approvedCol).getValue()) === 'true';
    if (!isApproved) continue;

    const rowValues = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
    const review = {};
    headers.forEach(function (h, i) { review[h] = rowValues[i]; });

    sendReviewApprovedEmail(review);
  }
}

// Shared by the sheet-edit trigger above and the admin dashboard's
// adminSetReviewApproved action.
function sendReviewApprovedEmail(review) {
  const userRow = findRow(SHEET_NAMES.USERS, function (u) { return u.id === review.userId; });
  if (!userRow || !userRow.email) return;

  try {
    MailApp.sendEmail({
      to: userRow.email,
      subject: STORE_NAME + ' — your review is now live',
      body: 'Hi ' + userRow.name + ',\n\n' +
        "Your review has been approved and is now visible on the product page. Thanks for sharing your feedback!\n\n" +
        '— ' + STORE_NAME,
    });
  } catch (err) {
    Logger.log('Review-approved email failed: ' + err.message);
  }
}

/* =========================================================
   ADMIN — ORDERS
   ========================================================= */
function handleAdminGetOrders(body) {
  const rows = sheetToObjects(getSheet(SHEET_NAMES.ORDERS)).filter(function (o) { return o.id; });
  rows.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

  const orders = rows.map(function (o) {
    return {
      id: o.id, userId: o.userId, date: o.date, status: o.status, total: o.total, subtotal: o.subtotal,
      shipping: o.shipping, name: o.name, email: o.email, phone: o.phone, address: o.address, city: o.city,
      postalCode: o.postalCode, payment: o.payment, createdAt: o.createdAt, items: safeParseJson(o.itemsJson) || [],
    };
  });
  return { ok: true, orders: orders };
}

function handleAdminUpdateOrderStatus(body) {
  const id = body.id;
  const status = (body.status || '').trim();
  if (!id) return { ok: false, error: 'Order id is required.' };
  if (!status) return { ok: false, error: 'Status is required.' };

  const order = findRow(SHEET_NAMES.ORDERS, function (o) { return o.id === id; });
  if (!order) return { ok: false, error: 'Order not found.' };

  updateRowByField(SHEET_NAMES.ORDERS, 'id', id, { status: status });
  sendOrderStatusEmail(order, status);
  return { ok: true };
}

/* =========================================================
   ADMIN — REVIEWS
   ========================================================= */
function handleAdminGetReviews(body) {
  const rows = sheetToObjects(getSheet(SHEET_NAMES.REVIEWS)).filter(function (r) { return r.id; });
  rows.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

  const reviews = rows.map(function (r) {
    return {
      id: r.id, userId: r.userId, orderId: r.orderId, productId: r.productId, customerName: r.customerName,
      rating: Number(r.rating), comment: r.comment, approved: String(r.approved) === 'true', createdAt: r.createdAt,
    };
  });
  return { ok: true, reviews: reviews };
}

function handleAdminSetReviewApproved(body) {
  const id = body.id;
  const approved = !!body.approved;
  if (!id) return { ok: false, error: 'Review id is required.' };

  const review = findRow(SHEET_NAMES.REVIEWS, function (r) { return r.id === id; });
  if (!review) return { ok: false, error: 'Review not found.' };

  const wasApproved = String(review.approved) === 'true';
  updateRowByField(SHEET_NAMES.REVIEWS, 'id', id, { approved: approved });
  if (approved && !wasApproved) sendReviewApprovedEmail(review);
  return { ok: true };
}

function handleAdminDeleteReview(body) {
  const id = body.id;
  if (!id) return { ok: false, error: 'Review id is required.' };

  const existing = findRow(SHEET_NAMES.REVIEWS, function (r) { return r.id === id; });
  if (!existing) return { ok: false, error: 'Review not found.' };

  deleteRowByField(SHEET_NAMES.REVIEWS, 'id', id);
  return { ok: true };
}

/* =========================================================
   ADMIN — USERS
   ========================================================= */
function handleAdminGetUsers(body) {
  const rows = sheetToObjects(getSheet(SHEET_NAMES.USERS)).filter(function (u) { return u.id; });
  rows.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

  const users = rows.map(function (u) {
    return { id: u.id, name: u.name, email: u.email, phone: u.phone || '', suspended: String(u.suspended) === 'true', createdAt: u.createdAt };
  });
  return { ok: true, users: users };
}

function handleAdminSetUserSuspended(body) {
  const id = body.id;
  const suspended = !!body.suspended;
  if (!id) return { ok: false, error: 'User id is required.' };

  const user = findRow(SHEET_NAMES.USERS, function (u) { return u.id === id; });
  if (!user) return { ok: false, error: 'User not found.' };

  updateRowByField(SHEET_NAMES.USERS, 'id', id, { suspended: suspended });
  return { ok: true };
}

function handleAdminDeleteUser(body) {
  const id = body.id;
  if (!id) return { ok: false, error: 'User id is required.' };

  const user = findRow(SHEET_NAMES.USERS, function (u) { return u.id === id; });
  if (!user) return { ok: false, error: 'User not found.' };

  deleteRowByField(SHEET_NAMES.USERS, 'id', id);

  // Log out any active session for this account — order/review/address
  // history is left in place (orders and reviews already keep their own
  // snapshot of the customer's name, so deleting the account doesn't
  // corrupt that history).
  const sessions = sheetToObjects(getSheet(SHEET_NAMES.SESSIONS)).filter(function (s) { return s.userId === id; });
  sessions.forEach(function (s) { deleteRowByField(SHEET_NAMES.SESSIONS, 'token', s.token); });

  return { ok: true };
}

/* =========================================================
   ADMIN — WISHLIST
   ========================================================= */
function handleAdminGetWishlist(body) {
  const rows = sheetToObjects(getSheet(SHEET_NAMES.WISHLIST)).filter(function (w) { return w.userId && w.productId; });
  rows.sort(function (a, b) { return new Date(b.addedAt) - new Date(a.addedAt); });

  const userById = {};
  sheetToObjects(getSheet(SHEET_NAMES.USERS)).forEach(function (u) { userById[u.id] = u; });

  const wishlist = rows.map(function (w) {
    const user = userById[w.userId];
    return {
      userId: w.userId,
      productId: w.productId,
      addedAt: w.addedAt,
      customerName: user ? user.name : 'Unknown customer',
      customerEmail: user ? user.email : '',
    };
  });
  return { ok: true, wishlist: wishlist };
}

/* =========================================================
   PASSWORD HASHING
   ========================================================= */
function generateSalt() {
  return Utilities.getUuid();
}

function hashPassword(password, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + salt, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0'); }).join('');
}

/* =========================================================
   SHEET HELPERS
   ========================================================= */
function getSheet(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name + '. Run setup() once from the Apps Script editor.');
  return sheet;
}

function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  return values.slice(1).map(function (row, i) {
    const obj = {};
    headers.forEach(function (h, j) { obj[h] = row[j]; });
    obj.__row = i + 2; // 1-indexed sheet row, accounting for the header row
    return obj;
  });
}

function findRow(sheetName, predicate) {
  const objs = sheetToObjects(getSheet(sheetName));
  const match = objs.find(predicate);
  return match || null;
}

function appendRow(sheetName, obj) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
}

function updateRowByField(sheetName, matchField, matchValue, updates) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const matchCol = headers.indexOf(matchField);
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][matchCol]) === String(matchValue)) {
      Object.keys(updates).forEach(function (key) {
        const col = headers.indexOf(key);
        if (col > -1) sheet.getRange(i + 1, col + 1).setValue(updates[key]);
      });
      return true;
    }
  }
  return false;
}

function deleteRowByField(sheetName, matchField, matchValue) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const matchCol = headers.indexOf(matchField);
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][matchCol]) === String(matchValue)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function safeParseJson(str) {
  try { return JSON.parse(str); } catch (e) { return null; }
}

function stripRowMeta(obj) {
  const copy = Object.assign({}, obj);
  delete copy.__row;
  return copy;
}
