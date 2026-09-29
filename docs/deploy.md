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

## 4. Opening it to the public

The game has no accounts, so the only thing a limit can be keyed to is the address a request arrives
from. Writes are limited per address per hour, counted in the database rather than in memory: every
serverless instance holds its own memory and would only ever see its own share of the traffic.

| Variable                        | Default | Guards                               |
| ------------------------------- | ------: | ------------------------------------ |
| `RATE_LIMIT_GAMES_PER_HOUR`     |      20 | opening a government, and successors |
| `RATE_LIMIT_DECISIONS_PER_HOUR` |     400 | deciding a month                     |
| `RATE_LIMIT_CABINET_PER_HOUR`   |     200 | appointing and dismissing a minister |
| `RATE_LIMIT_DISABLED`           |   unset | set to `1` to switch all of it off   |

The defaults are generous on purpose — a whole mandate is 48 decisions — so they bound a loop or a
crawler without ever being reached by somebody playing. Leave them unset unless you have a reason.

Requests arriving with no `x-forwarded-for` share a single bucket. Behind Vercel that does not happen;
it would matter only if the app were run somewhere that does not set the header.

If you would rather not be public yet, Vercel Settings → Deployment Protection puts a password in
front of everything. It is a paid feature, so on the free plan the limits above are the protection you
have.

## 5. Verifying a deployment

```bash
curl -s https://<domain>/api/v1/health
```

It answers 200 with a live database report, or 503. It is `force-dynamic` and `no-store`, so it never
answers from a build-time snapshot.

Then play, do not just load: start a campaign, answer a month, open the cabinet, open the chronicle.
A deployment that renders the home page proves only that the build succeeded.

## 6. Known gaps

- **No authentication.** A government belongs to nobody: whoever holds its id can read it and play it.
  The id is a v4 uuid and is never listed anywhere, but it is not a secret either.
- **No cleanup.** Abandoned games are kept forever. On a free database tier this is the quota to watch
  first, and `games` and `decisions` grow together.
- **Limits are per address**, so they bound accidents and crawlers rather than somebody determined who
  has many addresses.
