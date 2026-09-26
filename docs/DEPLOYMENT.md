# Deploying to Render

This covers deploying the ASP.NET Core API and the Python Agentic AI service to Render's free tier, using the `render.yaml` blueprint at the repo root. I (Claude) don't have access to your Render or GitHub accounts, so the account-level steps below are things you need to click through yourself — I've prepared everything else (Dockerfiles, the blueprint, the code) so this should just be filling in values.

## 0. Prerequisites

- A GitHub repo with this code pushed to it (Render deploys from a connected GitHub repo). If you don't have one yet: create an empty repo on GitHub, then from the project root:
  ```bash
  git remote add origin https://github.com/<you>/<repo>.git
  git branch -M main
  git push -u origin main
  ```
- A Render account (free) at [render.com](https://render.com), signed in with GitHub so it can see your repos.
- Your Supabase project's **connection pooler** string, not the direct `db.*.supabase.co` host — the direct host resolves to an IPv6-only address, which may not be reachable from Render depending on their network path. Get it from: Supabase dashboard → your project → Project Settings → Database → **Connection Pooling** → copy the "Connection string" (Session mode). It looks like:
  ```
  Host=aws-0-<region>.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.<project-ref>;Password=<your-password>;
  ```
  Convert it to the Npgsql keyword=value format above if Supabase shows it as a `postgres://` URI — same info, different notation.
- A fresh JWT signing secret for production — **don't reuse the one in `appsettings.Development.json`**. Generate one:
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(48))"
  ```

## 1. Deploy the blueprint

1. In Render: **New +** → **Blueprint** → select your GitHub repo. Render will detect `render.yaml` at the repo root and show both services (`eventflow-api`, `eventflow-agents`).
2. It'll prompt for the env vars marked `sync: false` in `render.yaml`. For the first deploy, enter:
   - `eventflow-api` → `ConnectionStrings__Default`: your Supabase pooler connection string from step 0.
   - `eventflow-api` → `Jwt__Key`: the secret you generated in step 0.
   - `eventflow-api` → `AgentServiceUrl`: leave as a placeholder like `http://localhost:8000` for now — you'll fix this in step 2.
   - `eventflow-agents` → `API_BASE_URL`: leave as a placeholder like `http://localhost:5000` for now too.
3. Click **Apply** / **Deploy Blueprint**. Both services will build and deploy — first build takes a few minutes each.

## 2. Wire the two services to each other

Once both are deployed, Render gives each one a URL like `https://eventflow-api-xxxx.onrender.com` and `https://eventflow-agents-xxxx.onrender.com` (visible on each service's dashboard page).

1. Go to `eventflow-api`'s **Environment** tab, set `AgentServiceUrl` to the real `eventflow-agents` URL (e.g. `https://eventflow-agents-xxxx.onrender.com` — no trailing slash).
2. Go to `eventflow-agents`'s **Environment** tab, set `API_BASE_URL` to the real `eventflow-api` URL.
3. Both changes trigger an automatic redeploy (or trigger manually via **Manual Deploy**).

## 3. Apply migrations to Supabase

If you haven't already (this session already did this once against the current Supabase project — skip if nothing's changed since):
```bash
cd backend/EventManagement.Api
# Point ConnectionStrings:Default at the same Supabase DB, e.g. via appsettings.Development.json or:
export ConnectionStrings__Default="<your pooler connection string>"
dotnet ef database update
```

## 4. Verify

- API health: `https://eventflow-api-xxxx.onrender.com/` should return the JSON status blob.
- Swagger: `https://eventflow-api-xxxx.onrender.com/swagger`
- Agent service health: `https://eventflow-agents-xxxx.onrender.com/health` → `{"status":"ok"}`
- Try `POST /api/auth/login` against the deployed API with one of your real team accounts to confirm the DB connection works end-to-end.

## 5. Point the clients at the deployed API

- **Web**: set `VITE_API_URL=https://eventflow-api-xxxx.onrender.com/api` in your Vercel (or wherever) deployment's environment variables, then redeploy.
- **Mobile**: rebuild the APK with the real URL:
  ```bash
  cd mobile
  flutter build apk --release --dart-define=API_BASE_URL=https://eventflow-api-xxxx.onrender.com/api
  ```
  This is the version you'd actually submit — it works from any network, not just while a dev machine is on.

## Free-tier cold starts (important for the demo/viva)

Render's free web services **spin down after 15 minutes of inactivity** and take ~30-60 seconds to wake back up on the next request. During your demo, this means the very first login/request could hang for up to a minute and *look* exactly like the "stuck loading" problem from before — it isn't broken, it's just cold-starting. Send a request to `eventflow-api`'s health URL a minute or two before you actually need to demo, to warm it up. If this is a concern for the live evaluation, ask the lecturer whether a brief warm-up before the demo is acceptable, or consider a low-cost always-on tier for just the evaluation window.
