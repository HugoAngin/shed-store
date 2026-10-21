const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Refuse to start without the required settings from .env
const REQUIRED_ENV = ["ADMIN_EMAIL", "ADMIN_PASSWORD_HASH", "SESSION_SECRET"];
for (const name of REQUIRED_ENV) {
  if (!process.env[name]) {
    console.error(`Missing ${name} in .env (see .env.example)`);
    process.exit(1);
  }
}

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!process.env.FIRESTORE_EMULATOR_HOST && (!credentialsPath || !fs.existsSync(credentialsPath))) {
  console.error("Firebase service account key not found. Set GOOGLE_APPLICATION_CREDENTIALS in .env (see README)");
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === "production";

// Firestore admin access: credentials come from GOOGLE_APPLICATION_CREDENTIALS
initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID });
const db = getFirestore();
const items = db.collection("props-shed");
const logs = db.collection("logs");

const app = express();

if (isProduction) app.set("trust proxy", 1); //Needed for secure cookies and rate limiting behind a hosting proxy

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://cdn-icons-png.flaticon.com"], //Dropdown arrow in admin-dashboard.css
        connectSrc: ["'self'", "https://*.googleapis.com"],
        frameSrc: ["'self'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    referrerPolicy: { policy: "same-origin" }, //"no-referrer" makes browsers send Origin: null on form posts
  })
);

app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(express.json({ limit: "10kb" }));

// Serve public files to the user
app.use("/", express.static(path.join(__dirname, "dist/public")));

// Sessions
app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET,
    resave: false, //Only save session when session is changed or updated
    saveUninitialized: false, //Remove failed login session attempts
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 15 * 60 * 1000 //Require re-authentication after 15 minutes
    }
  })
);

// Block cross-site form submissions and API calls
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (req.method !== "GET" && req.method !== "HEAD" && origin) {
    let originHost = null;
    try { originHost = new URL(origin).host; } catch { } //Origin can be "null"
    if (originHost !== req.get("host")) {
      return res.status(403).json({ error: "Cross-site request blocked" });
    }
  }
  next();
});

// Only allow redirects to paths on this site (prevents open redirects)
function safeRedirect(target, fallback = "/") {
  if (typeof target === "string" && target.startsWith("/") && !target.startsWith("//") && !target.includes("\\")) {
    return target;
  }
  return fallback;
}

// Middleware to protect pages
function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.session.redirectTo = req.originalUrl; //If user logs in from a public page, redirect back to public page
    return res.redirect("/login.html");
  }
  next();
}

// Middleware to protect API routes
function requireApiLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}

// Protected admin page
app.get("/admin-dashboard.html", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "dist/admin-dashboard.html"));
});

//Protected logs page
app.get("/logs.html", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "dist/logs.html"))
});

// Login page
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "dist/login.html"));
});

// Limit failed login attempts to slow down password guessing
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req, res) => res.locals.loginSucceeded === true, //Failed logins also redirect, so status codes can't tell them apart
  handler: (req, res) => res.redirect("/login.html?err=locked"),
});

// Login handler
app.post("/login", loginLimiter, async (req, res, next) => {
  const { email, password, redirect } = req.body; //Gets data from login page when user submits

  const emailMatches = typeof email === "string" && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
  const passwordMatches = typeof password === "string" && (await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH));

  if (!emailMatches || !passwordMatches) {
    return res.redirect("/login.html?err=error"); //If they do not match, refresh the page with an error
  }

  const redirectTo = safeRedirect(req.session.redirectTo || redirect, "/admin-dashboard.html");

  // New session ID on login to prevent session fixation
  res.locals.loginSucceeded = true;
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.user = process.env.ADMIN_EMAIL;
    res.redirect(redirectTo);
  });
});

// Logout
app.get("/logout", (req, res) => {
  const redirectPath = safeRedirect(req.query.redirect);
  req.session.destroy(() => {
    res.clearCookie("sid");
    //If user logs out from a protected page, redirect to the main page
    if (redirectPath.startsWith("/logs.html") || redirectPath.startsWith("/admin-dashboard.html")){
      res.redirect("/");
    } else {
    //If user logs out from a public page, simply redirect back to the same page
      res.redirect(redirectPath);
    }
  });
});

//Custom logged-in API check for later use throughout website
app.get("/api/auth/status", (req, res) => {
  res.json({ loggedIn: Boolean(req.session && req.session.user) });
});

// ---------- Item and log API (all writes go through here) ----------

const STATUSES = ["In Shed", "Checked Out"];
const TAG_COLORS = ["tag-grey", "tag-red", "tag-orange", "tag-yellow", "tag-green", "tag-blue", "tag-purple"];
const MAX_TAGS = 5;

// Same rules as verifyShelf in src/map.js: A1-I6, or J1-J9
function isValidLocation(location) {
  return typeof location === "string" && /^([A-I][1-6]|J[1-9])$/.test(location);
}

function isValidId(id) {
  return typeof id === "string" && /^\d{5}$/.test(id);
}

function cleanString(value, maxLength) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return trimmed;
}

// Next 5-digit ID after the highest existing one
async function generateId() {
  const snap = await items.select().get();
  let highest = -1;
  snap.docs.forEach((doc) => {
    const n = Number(doc.id);
    if (Number.isInteger(n) && n > highest) highest = n;
  });
  return String(highest + 1).padStart(5, "0");
}

// Add an item
app.post("/api/items", requireApiLogin, async (req, res) => {
  const name = cleanString(req.body.name, 25);
  const location = req.body.location;
  const status = req.body.status;
  const tags = req.body.tags;

  if (!name) return res.status(400).json({ error: "Please enter a name (up to 25 characters)" });
  if (!isValidLocation(location)) return res.status(400).json({ error: "Please enter a valid location format between A1 to J9" });
  if (!STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });
  if (!Array.isArray(tags) || tags.length > MAX_TAGS) return res.status(400).json({ error: "Invalid tags" });

  const tagNames = [];
  const tagColors = [];
  for (const tag of tags) {
    const tagName = cleanString(tag && tag.name, 20);
    if (!tagName || !TAG_COLORS.includes(tag.color)) return res.status(400).json({ error: "Invalid tags" });
    tagNames.push(tagName);
    tagColors.push(tag.color);
  }

  // Retry if another request took the same ID at the same time
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = await generateId();
    try {
      await items.doc(id).create({
        "item-id": id,
        "item-location": location,
        "item-name": name.toLowerCase(),
        "item-status": status,
        "tag-colors": tagColors,
        "tag-names": tagNames,
        "item-logs": []
      });
      return res.status(201).json({ id, name: name.toLowerCase(), location, status, tagNames, tagColors });
    } catch (error) {
      if (error.code !== 6) throw error; //6 = ALREADY_EXISTS
    }
  }
  res.status(409).json({ error: "Could not create item, please try again" });
});

// Delete an item
app.delete("/api/items/:id", requireApiLogin, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
  await items.doc(req.params.id).delete();
  res.status(204).end();
});

// Check an item in or out, and record a log
app.post("/api/items/:id/toggle", requireApiLogin, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
  const author = cleanString(req.body.author, 50);
  if (!author) return res.status(400).json({ error: "Please enter a name (up to 50 characters)" });

  const itemRef = items.doc(req.params.id);
  const logRef = logs.doc();

  const newStatus = await db.runTransaction(async (t) => {
    const itemSnap = await t.get(itemRef);
    if (!itemSnap.exists) return null;

    //Uses if statements to toggle status
    const checkingOut = itemSnap.get("item-status") === "In Shed";
    const itemStatus = checkingOut ? "Checked Out" : "In Shed";

    t.set(logRef, {
      "log-author": author,
      "log-item": itemRef,
      "log-status": checkingOut ? "Checked Out" : "Checked In",
      "log-timestamp": FieldValue.serverTimestamp(),
    });
    t.update(itemRef, {
      "item-logs": FieldValue.arrayUnion(logRef),
      "item-status": itemStatus
    });
    return itemStatus;
  });

  if (!newStatus) return res.status(404).json({ error: "This prop does not exist!" });
  res.json({ status: newStatus });
});

// Logs, newest first (only visible when logged in)
app.get("/api/logs", requireApiLogin, async (req, res) => {
  const snap = await logs.orderBy("log-timestamp", "desc").get();

  // Look up the names of all logged items in one request
  const itemRefs = snap.docs.map((doc) => doc.get("log-item")).filter(Boolean);
  const itemSnaps = itemRefs.length ? await db.getAll(...itemRefs) : [];
  const names = {};
  itemSnaps.forEach((s) => { names[s.ref.path] = s.exists ? s.get("item-name") : "(deleted item)"; });

  res.json(snap.docs.map((doc) => ({
    author: doc.get("log-author"),
    status: doc.get("log-status"),
    timestamp: doc.get("log-timestamp")?.toMillis() ?? null,
    itemName: names[doc.get("log-item")?.path] ?? "(deleted item)",
  })));
});

// Hide error details from users
app.use((err, req, res, next) => {
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: "Invalid request" }); //e.g. malformed JSON
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
