# FinTrack Project Notes

## Structure

- `backend/app.js` builds the Express app, security headers, sessions, static frontend serving, and API route mounting.
- `backend/server.js` connects MongoDB and starts the HTTP server.
- `backend/routes/api` contains JSON API routes only. The app no longer renders EJS views.
- `backend/models` contains Mongoose models.
- `backend/utils` contains reusable finance/reporting/default-data helpers.
- `frontend/public` contains the static browser app, local CSS, local JS, icons, and vendored libraries.

## Frontend Rules

- `frontend/public/js/main.js` is the browser entry point and must stay small.
- Put reusable browser plumbing in `frontend/public/js/core`.
- Put application orchestration and future screen modules under `frontend/public/js/app`.
- Keep JavaScript in external module files under `frontend/public/js`.
- Do not add inline scripts or event attributes such as `onclick`.
- Keep third-party browser assets local under `frontend/public/lib` so the CSP can stay strict and the app works offline.

## Distribution Rules

- Account income percentages must total exactly `100`.
- Goal allocation percentages must total exactly `100` when saved through the distribution UI.
