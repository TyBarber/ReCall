# ReCall frontend

The ReCall consumer interface is a Next.js App Router application using
TypeScript, React, and Tailwind CSS. It reads the existing Milestone 2 FastAPI
recall API; it does not duplicate or modify backend behavior.

## Run locally

Node.js 20 or newer is required.

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

`NEXT_PUBLIC_API_BASE_URL` selects the recall API. The checked-in example
points to the ReCall development API and may be replaced in `.env.local`.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

The frontend currently provides a searchable current-recall feed, status
filtering, offset pagination, recall details, responsive layouts, and loading,
empty, not-found, and error states. It intentionally does not include accounts,
pantries, alerts, recommendations, payments, or barcode scanning.
