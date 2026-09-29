# Deploying Decretum

Production runs the Next.js app on **Vercel** and PostgreSQL on **Neon**. Nothing else is required:
there is no queue, no cache and no object storage. Portraits are static files served from `public/`.

The app is server-authoritative, so every request that changes a game touches the database. That is
the one thing to size correctly.

## 1. Neon

Create a project (Postgres 17 to match local development) and keep **both** connection strings that
Neon offers. They are not interchangeable:

| String | Host contains | Use it for                       |
| ------ | ------------- | -------------------------------- |
| Pooled | `-pooler`     | the application (`DATABASE_URL`) |
| Direct | no `-pooler`  | migrations and seeding           |

Migrations must run on the **direct** string. `node-pg-migrate` takes a session-level advisory lock so
two deploys cannot migrate at once, and a transaction-mode pooler does not keep a session across
statements — the lock would be lost. The application, on the other hand, must use the **pooled**
string: every serverless instance opens its own pool, and the pooler is what keeps the total number of
backend connections bounded.

Both strings already carry `?sslmode=require`. Keep it.

## 2. Vercel

Import the GitHub repository and set the production branch to `main`.

Environment variables (Production, and Preview if you use it):

| Variable            | Value                        |
| ------------------- | ---------------------------- |
| `DATABASE_URL`      | Neon **pooled** string       |
| `DATABASE_POOL_MAX` | `1`                          |
| `NODE_ENV`          | set by Vercel; do not add it |
| `LOG_LEVEL`         | optional, `info` by default  |

`DATABASE_POOL_MAX=1` is the whole point of the pooled string: one connection per function instance,
multiplied by however many instances are live, stays inside Neon's limit. Left unset the code falls
back to 1 on Vercel anyway, but set it explicitly so the size is visible where it is configured.

Check the Node.js version offered in Project Settings against `engines` in `package.json`. If the
pinned major is not offered, lower `engines` and `.nvmrc` together rather than letting the platform
pick silently.

## 3. Schema and content, once per environment

Run these from a machine that has the repository, against the **direct** string:

```bash
DATABASE_URL='<neon direct string>' npm run db:migrate
DATABASE_URL='<neon direct string>' npm run db:seed
```

Both are idempotent and safe to repeat. `db:seed` upserts by card slug: it never deletes a row and
never changes an id, so games already in progress keep working.

**Seeding is not optional, and it is not only for the first deploy.** Card text, speakers and endings
live in the database, not in the running code. Content that changed since the last seed — a renamed
character, a new card — will not appear until `db:seed` runs again.

Do not move these into the Vercel build command. A build runs on every deploy, and two concurrent
deploys would race.

## 4. Deployment protection

The game has **no accounts and no rate limiting**. Until it does, keep the deployment behind
protection: Vercel Settings → Deployment Protection. Availability depends on the plan — Password
Protection is a paid feature — so if it is not offered, gate the app in the code before opening it.

## 5. Verifying a deployment

```bash
curl -s https://<domain>/api/v1/health
```

It answers 200 with a live database report, or 503. It is `force-dynamic` and `no-store`, so it never
answers from a build-time snapshot.

Then play, do not just load: start a campaign, answer a month, open the cabinet, open the chronicle.
A deployment that renders the home page proves only that the build succeeded.

## 6. Known gaps before opening to the public

- **No authentication.** Any visitor can create any number of games.
- **No rate limiting.** Nothing bounds how fast rows are written.
- **No cleanup.** Abandoned games are kept forever.

The first two are what protection in section 4 stands in for.
