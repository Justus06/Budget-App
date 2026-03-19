// ─────────────────────────────────────────────
//  Budget Tracker — Scriptable Widget
//  Supports small · medium · large widgets
//  Add transactions by tapping the widget
// ─────────────────────────────────────────────
//
//  SETUP
//  1. Install the Scriptable app (iOS / iPadOS)
//  2. Copy this file into Scriptable
//  3. Add a Scriptable widget to your home screen
//  4. Choose this script as the widget script
//  5. Optionally set a widget parameter to customise
//     the view: "small" | "medium" | "large"
//
// ─────────────────────────────────────────────

// ── Palette (matches the web app) ────────────
const C = {
  bg:     new Color("#0A0A0D"),
  sf:     new Color("#131318"),
  sf2:    new Color("#1C1C24"),
  bd:     new Color("#FFFFFF", 0.06),
  gold:   new Color("#C9A46E"),
  goldD:  new Color("#C9A46E", 0.10),
  goldB:  new Color("#C9A46E", 0.22),
  green:  new Color("#6EE7B7"),
  greenD: new Color("#6EE7B7", 0.10),
  greenB: new Color("#6EE7B7", 0.18),
  red:    new Color("#F87171"),
  redD:   new Color("#F87171", 0.10),
  redB:   new Color("#F87171", 0.18),
  blue:   new Color("#93C5FD"),
  blueD:  new Color("#93C5FD", 0.10),
  tx:     new Color("#F2EFE8"),
  tm:     new Color("#7A7870"),
  td:     new Color("#35353F"),
  white:  new Color("#FFFFFF"),
}

// ── Category definitions ──────────────────────
const CATEGORIES = [
  { name: "Food",          emoji: "🍽️",  color: C.gold  },
  { name: "Transport",     emoji: "🚌",  color: C.blue  },
  { name: "Shopping",      emoji: "🛍️",  color: C.green },
  { name: "Health",        emoji: "💊",  color: C.red   },
  { name: "Housing",       emoji: "🏠",  color: C.gold  },
  { name: "Entertainment", emoji: "🎬",  color: C.blue  },
  { name: "Income",        emoji: "💰",  color: C.green },
  { name: "Savings",       emoji: "🏦",  color: C.blue  },
  { name: "Other",         emoji: "📦",  color: C.tm    },
]

// ── Persistence ───────────────────────────────
const FM   = FileManager.local()
const DIR  = FM.documentsDirectory()
const PATH = FM.joinPath(DIR, "budget_tracker_data.json")

function loadData() {
  if (!FM.fileExists(PATH)) {
    const seed = {
      monthlyBudget: 2000,
      currency: "€",
      transactions: []
    }
    FM.writeString(PATH, JSON.stringify(seed))
    return seed
  }
  try {
    return JSON.parse(FM.readString(PATH))
  } catch {
    return { monthlyBudget: 2000, currency: "€", transactions: [] }
  }
}

function saveData(data) {
  FM.writeString(PATH, JSON.stringify(data))
}

// ── Date helpers ──────────────────────────────
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}

function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`
}

function isThisMonth(dateStr) {
  return dateStr && dateStr.startsWith(currentMonthKey())
}

function formatDate(dateStr) {
  if (!dateStr) return ""
  const [y, m, dd] = dateStr.split("-")
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return `${months[parseInt(m,10)-1]} ${parseInt(dd,10)}`
}

// ── Summary calculations ──────────────────────
function calcSummary(data) {
  const txns = (data.transactions || []).filter(t => isThisMonth(t.date))

  let income   = 0
  let expenses = 0
  const byCat  = {}

  for (const t of txns) {
    if (t.type === "income") {
      income += t.amount
    } else {
      expenses += t.amount
      byCat[t.category] = (byCat[t.category] || 0) + t.amount
    }
  }

  return {
    income,
    expenses,
    balance:  income - expenses,
    budget:   data.monthlyBudget || 2000,
    currency: data.currency || "€",
    byCat,
    recent:   [...txns].reverse().slice(0, 5),
  }
}

// ── Number formatting ─────────────────────────
function fmt(n, currency) {
  const abs = Math.abs(n)
  let s
  if (abs >= 1000) {
    s = (abs / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  } else {
    s = abs.toFixed(2)
  }
  return (n < 0 ? "-" : "") + currency + s
}

function fmtFull(n, currency) {
  return (n < 0 ? "-" : "") + currency + Math.abs(n).toFixed(2)
}

// ── Category lookup ───────────────────────────
function catInfo(name) {
  return CATEGORIES.find(c => c.name === name) || CATEGORIES[CATEGORIES.length - 1]
}

// ═══════════════════════════════════════════════
//  WIDGET BUILDERS
// ═══════════════════════════════════════════════

// ── Shared gradient background ────────────────
function addBackground(w) {
  const g = new LinearGradient()
  g.colors    = [new Color("#0A0A0D"), new Color("#131318")]
  g.locations = [0, 1]
  g.startPoint = new Point(0, 0)
  g.endPoint   = new Point(1, 1)
  w.backgroundGradient = g
}

// ── Small widget ──────────────────────────────
//  Shows: balance (big), budget progress bar
function buildSmall(data) {
  const s   = calcSummary(data)
  const w   = new ListWidget()
  addBackground(w)
  w.setPadding(14, 14, 14, 14)
  w.url = "scriptable:///run/" + encodeURIComponent(Script.name())

  // Month label
  const mo = w.addText(monthName().toUpperCase())
  mo.font      = Font.mediumSystemFont(8)
  mo.textColor = C.td
  mo.leftAlignText()

  w.addSpacer(6)

  // Balance
  const balPos = s.balance >= 0
  const balColor = balPos ? C.green : C.red

  const lbl = w.addText("BALANCE")
  lbl.font      = Font.mediumSystemFont(7)
  lbl.textColor = C.tm
  lbl.leftAlignText()

  w.addSpacer(2)

  const bal = w.addText(fmt(s.balance, s.currency))
  bal.font      = Font.boldSystemFont(26)
  bal.textColor = balColor
  bal.minimumScaleFactor = 0.6
  bal.leftAlignText()

  w.addSpacer(8)

  // Income / Expenses row
  const row = w.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()

  const incCol = row.addStack()
  incCol.layoutVertically()
  const incLbl = incCol.addText("IN")
  incLbl.font      = Font.mediumSystemFont(7)
  incLbl.textColor = C.tm
  const incVal = incCol.addText(fmt(s.income, s.currency))
  incVal.font      = Font.semiboldSystemFont(11)
  incVal.textColor = C.green

  row.addSpacer()

  const expCol = row.addStack()
  expCol.layoutVertically()
  expCol.rightAlignContent()
  const expLbl = expCol.addText("OUT")
  expLbl.font      = Font.mediumSystemFont(7)
  expLbl.textColor = C.tm
  const expVal = expCol.addText(fmt(s.expenses, s.currency))
  expVal.font      = Font.semiboldSystemFont(11)
  expVal.textColor = C.red

  w.addSpacer(8)

  // Progress bar (expenses vs budget)
  const ratio = Math.min(s.expenses / s.budget, 1)
  addProgressBar(w, ratio, s.budget, s.currency)

  return w
}

// ── Medium widget ─────────────────────────────
//  Shows: balance, key stats, recent 3 transactions
function buildMedium(data) {
  const s = calcSummary(data)
  const w = new ListWidget()
  addBackground(w)
  w.setPadding(14, 16, 14, 16)
  w.url = "scriptable:///run/" + encodeURIComponent(Script.name())

  // Top row: month + balance
  const top = w.addStack()
  top.layoutHorizontally()
  top.centerAlignContent()

  const leftCol = top.addStack()
  leftCol.layoutVertically()

  const mo = leftCol.addText(monthName().toUpperCase() + " BUDGET")
  mo.font      = Font.mediumSystemFont(8)
  mo.textColor = C.td

  leftCol.addSpacer(3)

  const balColor = s.balance >= 0 ? C.green : C.red
  const bal = leftCol.addText(fmtFull(s.balance, s.currency))
  bal.font      = Font.boldSystemFont(22)
  bal.textColor = balColor
  bal.minimumScaleFactor = 0.7

  top.addSpacer()

  // Right side stats column
  const rightCol = top.addStack()
  rightCol.layoutVertically()
  rightCol.rightAlignContent()

  addStatPill(rightCol, "↑ " + fmt(s.income, s.currency), C.green)
  rightCol.addSpacer(4)
  addStatPill(rightCol, "↓ " + fmt(s.expenses, s.currency), C.red)

  w.addSpacer(6)

  // Progress bar
  const ratio = Math.min(s.expenses / s.budget, 1)
  addProgressBar(w, ratio, s.budget, s.currency)

  w.addSpacer(8)

  // Divider
  const div = w.addStack()
  div.layoutHorizontally()
  div.addSpacer()
  const divLine = div.addStack()
  divLine.size = new Size(0, 0.5)
  divLine.backgroundColor = C.bd
  div.addSpacer()

  w.addSpacer(6)

  // Recent transactions (up to 3)
  const recent = s.recent.slice(0, 3)
  if (recent.length === 0) {
    const empty = w.addText("No transactions this month")
    empty.font      = Font.systemFont(10)
    empty.textColor = C.td
    empty.centerAlignText()
  } else {
    for (const t of recent) {
      addTransactionRow(w, t, s.currency)
      if (t !== recent[recent.length - 1]) w.addSpacer(5)
    }
  }

  return w
}

// ── Large widget ──────────────────────────────
//  Shows: balance, progress, category breakdown, recent 5 transactions
function buildLarge(data) {
  const s = calcSummary(data)
  const w = new ListWidget()
  addBackground(w)
  w.setPadding(16, 16, 16, 16)
  w.url = "scriptable:///run/" + encodeURIComponent(Script.name())

  // ── Header ──
  const header = w.addStack()
  header.layoutHorizontally()
  header.centerAlignContent()

  const hLeft = header.addStack()
  hLeft.layoutVertically()

  const mo = hLeft.addText(monthName().toUpperCase())
  mo.font      = Font.mediumSystemFont(9)
  mo.textColor = C.td

  hLeft.addSpacer(2)

  const balColor = s.balance >= 0 ? C.green : C.red
  const bal = hLeft.addText(fmtFull(s.balance, s.currency))
  bal.font      = Font.boldSystemFont(28)
  bal.textColor = balColor
  bal.minimumScaleFactor = 0.6

  const balLbl = hLeft.addText("Available balance")
  balLbl.font      = Font.systemFont(9)
  balLbl.textColor = C.tm

  header.addSpacer()

  // Right side donut-style summary
  const hRight = header.addStack()
  hRight.layoutVertically()
  hRight.rightAlignContent()

  addStatRow(hRight, "Income",   fmt(s.income,   s.currency), C.green)
  hRight.addSpacer(4)
  addStatRow(hRight, "Expenses", fmt(s.expenses, s.currency), C.red)
  hRight.addSpacer(4)
  addStatRow(hRight, "Budget",   fmt(s.budget,   s.currency), C.gold)

  w.addSpacer(10)

  // Progress bar
  const ratio = Math.min(s.expenses / s.budget, 1)
  addProgressBar(w, ratio, s.budget, s.currency)

  w.addSpacer(12)

  // ── Category breakdown ──
  const catLbl = w.addText("SPENDING BY CATEGORY")
  catLbl.font      = Font.mediumSystemFont(8)
  catLbl.textColor = C.td

  w.addSpacer(6)

  const topCats = Object.entries(s.byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  if (topCats.length === 0) {
    const empty = w.addText("No expenses recorded this month")
    empty.font      = Font.systemFont(10)
    empty.textColor = C.td
  } else {
    for (const [cat, amt] of topCats) {
      addCategoryBar(w, cat, amt, s.expenses, s.currency)
      w.addSpacer(5)
    }
  }

  w.addSpacer(8)

  // ── Recent transactions ──
  const txnLbl = w.addText("RECENT TRANSACTIONS")
  txnLbl.font      = Font.mediumSystemFont(8)
  txnLbl.textColor = C.td

  w.addSpacer(6)

  const recent = s.recent.slice(0, 5)
  if (recent.length === 0) {
    const empty = w.addText("No transactions this month")
    empty.font      = Font.systemFont(10)
    empty.textColor = C.td
  } else {
    for (const t of recent) {
      addTransactionRow(w, t, s.currency)
      if (t !== recent[recent.length - 1]) w.addSpacer(5)
    }
  }

  return w
}

// ═══════════════════════════════════════════════
//  SHARED UI COMPONENTS
// ═══════════════════════════════════════════════

function addProgressBar(parent, ratio, budget, currency) {
  const pct = Math.round(ratio * 100)
  const barColor = ratio < 0.7 ? C.green : ratio < 0.9 ? C.gold : C.red

  const row = parent.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()

  const pctTxt = row.addText(pct + "%")
  pctTxt.font      = Font.mediumSystemFont(9)
  pctTxt.textColor = barColor

  row.addSpacer(6)

  // Bar container
  const barWrap = row.addStack()
  barWrap.layoutHorizontally()
  barWrap.backgroundColor = C.sf2
  barWrap.cornerRadius = 3
  barWrap.size = new Size(0, 5)  // width auto-stretches

  // Filled portion
  const fill = barWrap.addStack()
  fill.backgroundColor = barColor
  fill.cornerRadius = 3
  // Scriptable doesn't support percentage width — approximate with spaces
  // We rely on the text spacer trick: fill is sized by addSpacer weight
  fill.addSpacer(null)
  barWrap.addSpacer(null)

  row.addSpacer(6)

  const budLbl = row.addText("of " + fmt(budget, currency))
  budLbl.font      = Font.systemFont(9)
  budLbl.textColor = C.tm
}

function addStatPill(parent, text, color) {
  const pill = parent.addStack()
  pill.layoutHorizontally()
  pill.backgroundColor = new Color(color.hex, 0.12)
  pill.cornerRadius = 6
  pill.setPadding(3, 7, 3, 7)

  const t = pill.addText(text)
  t.font      = Font.semiboldSystemFont(10)
  t.textColor = color
}

function addStatRow(parent, label, value, color) {
  const row = parent.addStack()
  row.layoutHorizontally()
  row.rightAlignContent()

  const lbl = row.addText(label + "  ")
  lbl.font      = Font.systemFont(9)
  lbl.textColor = C.tm

  const val = row.addText(value)
  val.font      = Font.semiboldSystemFont(10)
  val.textColor = color
}

function addTransactionRow(parent, t, currency) {
  const row = parent.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()

  // Dot
  const dot = row.addStack()
  dot.backgroundColor = t.type === "income" ? C.green : C.red
  dot.cornerRadius = 4
  dot.size = new Size(6, 6)

  row.addSpacer(8)

  // Description
  const desc = row.addStack()
  desc.layoutVertically()
  desc.size = new Size(0, 0)  // allow horizontal stretch

  const note = desc.addText(t.note || t.category || "Transaction")
  note.font      = Font.systemFont(11)
  note.textColor = C.tx
  note.lineLimit = 1

  const dateTxt = desc.addText(formatDate(t.date) + " · " + (t.category || ""))
  dateTxt.font      = Font.systemFont(9)
  dateTxt.textColor = C.tm

  row.addSpacer()

  // Amount
  const amtColor = t.type === "income" ? C.green : C.tx
  const amtSign  = t.type === "income" ? "+" : "-"
  const amt = row.addText(amtSign + fmtFull(t.amount, currency))
  amt.font      = Font.semiboldSystemFont(12)
  amt.textColor = amtColor
}

function addCategoryBar(parent, catName, amount, total, currency) {
  const ratio    = total > 0 ? amount / total : 0
  const pct      = Math.round(ratio * 100)
  const info     = catInfo(catName)

  const row = parent.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()

  // Emoji + name
  const label = row.addText(info.emoji + " " + catName)
  label.font      = Font.systemFont(10)
  label.textColor = C.tx
  label.lineLimit = 1

  row.addSpacer()

  // Percent
  const pctTxt = row.addText(pct + "%")
  pctTxt.font      = Font.systemFont(9)
  pctTxt.textColor = C.tm

  row.addSpacer(6)

  // Amount
  const amtTxt = row.addText(fmtFull(amount, currency))
  amtTxt.font      = Font.semiboldSystemFont(10)
  amtTxt.textColor = info.color
}

function monthName() {
  const months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"]
  return months[new Date().getMonth()]
}

// ═══════════════════════════════════════════════
//  IN-APP INTERACTION (Add transaction)
// ═══════════════════════════════════════════════

async function runInteractive(data) {
  // Choose action
  const actionAlert = new Alert()
  actionAlert.title   = "Budget Tracker"
  actionAlert.message = monthName() + " · " + data.currency + (calcSummary(data).balance.toFixed(2))
  actionAlert.addAction("➕  Add Expense")
  actionAlert.addAction("💰  Add Income")
  actionAlert.addAction("⚙️  Set Budget")
  actionAlert.addCancelAction("Cancel")

  const actionIdx = await actionAlert.presentSheet()
  if (actionIdx === -1) return

  if (actionIdx === 2) {
    await setBudget(data)
    return
  }

  const type = actionIdx === 1 ? "income" : "expense"

  // Amount input
  const amountAlert = new Alert()
  amountAlert.title       = type === "income" ? "Add Income" : "Add Expense"
  amountAlert.message     = "Enter amount in " + data.currency
  amountAlert.addTextField("0.00", "")
  amountAlert.addAction("Next →")
  amountAlert.addCancelAction("Cancel")

  const amtIdx = await amountAlert.present()
  if (amtIdx === -1) return

  const rawAmount = parseFloat(amountAlert.textFieldValue(0).replace(",", "."))
  if (isNaN(rawAmount) || rawAmount <= 0) {
    const errAlert = new Alert()
    errAlert.title   = "Invalid Amount"
    errAlert.message = "Please enter a positive number."
    errAlert.addAction("OK")
    await errAlert.present()
    return
  }

  // Category (only for expenses)
  let category = "Income"
  if (type === "expense") {
    const catAlert = new Alert()
    catAlert.title   = "Category"
    catAlert.message = "Select a category for this expense"
    const expCats = CATEGORIES.filter(c => c.name !== "Income")
    for (const c of expCats) catAlert.addAction(c.emoji + "  " + c.name)
    catAlert.addCancelAction("Cancel")

    const catIdx = await catAlert.presentSheet()
    if (catIdx === -1) return
    category = expCats[catIdx].name
  }

  // Note input
  const noteAlert = new Alert()
  noteAlert.title   = "Add a note (optional)"
  noteAlert.addTextField("e.g. Coffee, Salary…", "")
  noteAlert.addAction("Save")
  noteAlert.addCancelAction("Skip")

  const noteIdx = await noteAlert.present()
  const note = noteIdx === 0 ? (noteAlert.textFieldValue(0) || "") : ""

  // Save transaction
  const newTxn = {
    id:       Date.now().toString(36) + Math.random().toString(36).slice(2),
    type,
    amount:   rawAmount,
    category,
    note,
    date:     todayStr(),
  }

  data.transactions.push(newTxn)
  saveData(data)

  // Confirmation
  const s = calcSummary(data)
  const confirmAlert = new Alert()
  confirmAlert.title   = "Saved!"
  confirmAlert.message =
    (type === "income" ? "+" : "-") + data.currency + rawAmount.toFixed(2) +
    " · " + category + "\n\nNew balance: " + data.currency + s.balance.toFixed(2)
  confirmAlert.addAction("Done")
  await confirmAlert.present()

  Script.setWidget(null)   // refresh widget
}

async function setBudget(data) {
  const alert = new Alert()
  alert.title   = "Monthly Budget"
  alert.message = "Current: " + data.currency + data.monthlyBudget
  alert.addTextField("Budget amount", String(data.monthlyBudget))

  const currencies = ["€", "$", "£", "¥", "CHF"]
  for (const cur of currencies) alert.addAction(cur)
  alert.addCancelAction("Cancel")

  const idx = await alert.presentSheet()
  if (idx === -1) return

  const rawBudget = parseFloat(alert.textFieldValue(0).replace(",", "."))
  if (!isNaN(rawBudget) && rawBudget > 0) data.monthlyBudget = rawBudget
  data.currency = currencies[idx]
  saveData(data)
}

// ═══════════════════════════════════════════════
//  ENTRY POINT
// ═══════════════════════════════════════════════

const data = loadData()

if (config.runsInWidget) {
  // Running as a home-screen widget
  const family = config.widgetFamily
  let widget
  if      (family === "small")  widget = buildSmall(data)
  else if (family === "large")  widget = buildLarge(data)
  else                          widget = buildMedium(data)   // medium / accessory*

  Script.setWidget(widget)

} else {
  // Running inside the Scriptable app — show interactive UI
  // Also useful for previewing all widget sizes
  await runInteractive(data)

  // Preview widgets in the app
  const preview = config.widgetFamily || "medium"
  let previewWidget
  if      (preview === "small") previewWidget = buildSmall(data)
  else if (preview === "large") previewWidget = buildLarge(data)
  else                          previewWidget = buildMedium(data)

  previewWidget.presentMedium()
}

Script.complete()
