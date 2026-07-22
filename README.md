# Pseudo-random distribution calculator

A client-only SvelteKit calculator for Dota 2-style pseudo-random distribution (PRD). Enter a target long-run proc rate to calculate its C constant, inspect every attempt, and compare the conditional, exact, and cumulative chance in an interactive graph.

## How it works

For attempt `N` after the last successful proc, the conditional chance is:

```text
P(N) = min(1, C * N)
```

The app solves C with a binary search so the expected number of attempts per proc is `1 / target probability`. A successful proc resets the attempt counter.

## Development

```sh
npm install
npm run dev
```

Validation and production build:

```sh
npm run check
npm run lint
npm run build
```

## Deployment

The app uses `@sveltejs/adapter-vercel`, disables SSR, and prerenders the client shell for deployment on Vercel.
