# Login, registration, and Google Sign-In setup

The frontend already uses Clerk's hosted authentication components for email
sign-in and registration. Google Sign-In appears in those components after the
Google provider is enabled for the Clerk application.

## 1. Configure Clerk

1. Create a Clerk application and enable email sign-in/sign-up.
2. Enable Google in the application's social connections/provider settings.
3. Copy the Clerk publishable and secret keys from its API keys page.
4. Put the keys only in `backend/.env`; never put the secret key in frontend code
   or share it in chat.
5. Set `ADMIN_EMAIL` in `backend/.env` to the exact, verified email address that
   should receive the admin role. Restart the backend after changing this value.
   Existing accounts matching that verified email are promoted on their next
   authenticated request.

## 2. Configure local environment

From the project root in PowerShell, create local environment files:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Edit `backend/.env` and replace the example values with real credentials. The
backend needs a reachable MongoDB instance. `MONGO_URL` and `DB_NAME` must point
to the database used by this environment. Email and LLM integration keys are for
email and AI features; they are not Clerk credentials.

## Optional SmileTalk Gemini replies

SmileTalk works without an AI key using local, learning-material-based replies.
To enable the optional Gemini checkbox, add `GEMINI_API_KEY` to `backend/.env`
and restart the backend. Keep the key on the backend; never add it to the
frontend or share it in chat.

Gemini stays off by default. Before each message sent with Gemini, the user must
select the consent checkbox. Only that message and relevant public learning
material are sent to Google; previous chat messages are not. Safety-priority
messages are handled locally and queued for counselor follow-up instead.

## 3. Start the services

Start MongoDB first. In separate PowerShell terminals, run the backend from the
project root and the frontend from `frontend`:

```powershell
backend\.venv\Scripts\python.exe -m uvicorn backend.server:app --host 127.0.0.1 --port 8000
```

```powershell
cd frontend
npm start
```

Open `http://localhost:3000/sign-up` or `http://localhost:3000/sign-in`.
Restart the frontend after changing its `.env` file. When the backend reports
Clerk as enabled, the sign-in and sign-up pages will show Clerk's available
methods, including Google if that provider is enabled in Clerk.
