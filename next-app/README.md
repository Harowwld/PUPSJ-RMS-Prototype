This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Hot Folder Scanner Ingest

Configure these environment variables in `next-app/.env` or `next-app/.env.local`:

```bash
HOT_FOLDER_INGEST_TOKEN=replace_with_long_secret
HOT_FOLDER_API_URL=http://localhost:3000/api/ingest/hot-folder
HOT_FOLDER_SOURCE_STATION=Registrar-Scanner-01
HOT_FOLDER_ROOT=/absolute/path/to/hot-folder
```

`pnpm dev` starts **Next.js** and the **hot-folder watcher** together (watcher waits until port 3000 is open, then loads `.env` via `dotenv`). To run only Next.js: `pnpm dev:next`.

To run the watcher alone (for example against an already-running server):

```bash
pnpm hot-folder-watcher
```

Watcher folders:

- `INBOUND`: scanner writes files here.
- `PROCESSING`: transient while uploading.
- `DONE`: uploaded successfully (server returned 201).
- `FAILED`: upload failed; file is preserved for retry.

Allowed scan formats: PDF, JPG/JPEG, PNG, TIFF.
