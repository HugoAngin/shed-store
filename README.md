# Shed Storage

A web app for keeping track of the sets and props stored in a school theatre's storage shed. It lets you search the catalogue, see where each item sits on a map of the shed's shelves, and log who checks items out and back in.

## Features

- **Catalogue**: browse every prop, with search by name, shelf location or tag, A–Z sorting and pagination.
- **Item pages**: details for a single prop, including its status, tags and a highlighted map of its shelf slot.
- **Shed map**: an interactive map of shelves A–J. Click a shelf to see its slots, and click a slot to list the items stored there.
- **Check in / check out**: logged-in users can toggle an item's status and record who took it.
- **Activity logs**: a timeline of every check-in and check-out.
- **Admin dashboard**: add items (with name, location, coloured tags and status) and delete them.
- **Login**: the admin dashboard and logs pages need a login. Sessions expire after 15 minutes.

## Tech stack

- **Frontend**: plain HTML, CSS and JavaScript, bundled with webpack
- **Backend**: Node.js and Express, with `express-session` for login sessions
- **Database**: Cloud Firestore. Browsers read the catalogue directly; every write goes through the server using the Firebase Admin SDK

## Project structure

```
├── server.js              # Express server: login, protected pages, item/log API
├── firestore.rules        # Firestore security rules (browsers can only read the catalogue)
├── firebase.json          # Firebase CLI config, for deploying rules and the local emulator
├── webpack.config.js      # Bundles src/ into dist/public/bundle.js
├── scripts/
│   └── hash-password.js   # Generates the admin password hash for .env
├── src/
│   ├── entry.js           # Webpack entry point
│   ├── db.js              # Firestore access, search, item and log rendering
│   ├── script.js          # Shared UI (sidebar, login button), add/delete items
│   ├── catalogue.js       # Sorting
│   ├── dashboard.js       # Home page statistics
│   ├── map.js             # Shed map and shelf location validation
│   ├── logs.js            # Logs page
│   ├── login.js           # Login page
│   ├── html.js            # HTML escaping and API request helpers
│   └── firebase-config.example.js
└── dist/
    ├── admin-dashboard.html   # Protected pages (served only after login)
    ├── logs.html
    ├── login.html
    └── public/                # Public pages, CSS, images and the built bundle
```

## Getting started

### Requirements

- Node.js 20.6 or newer (needed for `--env-file`)
- A Firebase project with Cloud Firestore enabled

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

   | Variable                         | Description                                                     |
   | -------------------------------- | --------------------------------------------------------------- |
   | `ADMIN_EMAIL`                    | Email used to log in as admin                                   |
   | `ADMIN_PASSWORD_HASH`            | bcrypt hash of the admin password. Generate it with `npm run hash-password` |
   | `SESSION_SECRET`                 | Long random string used to sign session cookies. Generate it with `openssl rand -hex 32` |
   | `GOOGLE_APPLICATION_CREDENTIALS` | Path to your Firebase service account key (see step 3)         |
   | `NODE_ENV`                       | Set to `production` when deployed behind HTTPS (enables secure cookies) |
   | `PORT`                           | Port to listen on (default `3000`)                              |

3. Download a service account key so the server can write to Firestore. In the Firebase console, open **Project settings > Service accounts > Generate new private key**. Save the file as `service-account.json` in the project root. It's already in `.gitignore`. **Never commit or share it**, since it gives full access to your database.

4. Add your Firebase web config:

   ```bash
   cp src/firebase-config.example.js src/firebase-config.js
   ```

   Then paste in the values from the Firebase console (**Project settings > Your apps**).

5. Deploy the Firestore security rules. You can paste the contents of `firestore.rules` into the Firebase console (**Firestore Database > Rules**), or use the Firebase CLI:

   ```bash
   npx firebase-tools deploy --only firestore:rules --project <your-project-id>
   ```

6. Build the frontend and start the server:

   ```bash
   npm run build
   npm start
   ```

7. Open <http://localhost:3000>.

## API

Every write goes through these endpoints. They need an admin login, and the server checks all input before saving.

| Method   | Path                      | Description                                          |
| -------- | ------------------------- | ---------------------------------------------------- |
| `POST`   | `/api/items`              | Add an item (`name`, `location`, `status`, `tags`)   |
| `DELETE` | `/api/items/:id`          | Delete an item                                       |
| `POST`   | `/api/items/:id/toggle`   | Check an item in or out (`author`) and record a log  |
| `GET`    | `/api/logs`               | All logs, newest first                               |
| `GET`    | `/api/auth/status`        | Whether the current user is logged in                |

## Firestore data model

**`props-shed`**: one document per item, with the 5-digit item ID as the document ID.

| Field           | Type              | Example                     |
| --------------- | ----------------- | --------------------------- |
| `item-id`       | string            | `"00042"`                   |
| `item-name`     | string            | `"wooden chair"`            |
| `item-location` | string            | `"B3"` (shelf letter + slot) |
| `item-status`   | string            | `"In Shed"` or `"Checked Out"` |
| `tag-names`     | array of strings  | `["Borrowed"]`              |
| `tag-colors`    | array of strings  | `["tag-green"]`             |
| `item-logs`     | array of refs     | references to `logs` docs   |

**`logs`**: one document per check-in or check-out.

| Field           | Type      | Description                         |
| --------------- | --------- | ----------------------------------- |
| `log-author`    | string    | Who checked the item in or out      |
| `log-item`      | reference | The `props-shed` document           |
| `log-status`    | string    | `"Checked In"` or `"Checked Out"`   |
| `log-timestamp` | timestamp | Server time of the action           |

## Shelf locations

Locations are a shelf letter followed by a slot number. Shelves A–I have slots 1–6 and shelf J has slots 1–9, so valid locations run from `A1` to `J9`.

## Security

- **Database access**: the Firestore rules in `firestore.rules` only let browsers read the `props-shed` catalogue. Adding, deleting and checking items in or out all go through the server, which requires a login. Logs contain people's names, so the server only shows them to logged-in users.
- **Login**: the password is stored as a bcrypt hash. Failed logins are rate limited (10 per 15 minutes per IP). Logging in issues a new session ID, and session cookies are `HttpOnly` and `SameSite=Lax`, plus `Secure` in production.
- **Requests**: form posts and API calls coming from other sites are rejected. Redirects after login and logout only go to pages on this site.
- **Output**: all database values are escaped before they're added to the page. Security headers (including a Content Security Policy) are set with [helmet](https://helmetjs.github.io/).
- **Secrets**: `.env`, `service-account.json` and `src/firebase-config.js` are in `.gitignore`. The Firebase web config still ends up in the built `bundle.js` that browsers download. That's normal for Firebase web apps, because the security rules are what protect the data.
