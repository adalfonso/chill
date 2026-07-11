# ADR-0004: Resumable (HTTP Range) streaming

- **Status:** Accepted
- **Date:** 2026-06-27
- **Deciders:** Anthony

## Context

A core goal is surviving spotty cell coverage in the car without the song stalling. Pre-transcoding
fixes *startup* latency but does nothing for a stream that dies mid-song: when coverage drops and
returns, the client must resume.

Today [`stream_file`](../../server/lib/io/stream.ts) advertises `accept-ranges: bytes` but **ignores
the `Range` request header entirely** — it always opens the file and streams from byte 0 with a
`200`. So a client that reconnects can't resume; it refetches from the start (wasted data) or fails.
This also degrades seeking.

## Decision

1. **Honor `Range` requests.** Parse the `Range` header, respond `206 Partial Content` with correct
   `Content-Range` / `Content-Length`, and stream only the requested byte window. Keep `200` for
   range-less requests.

2. **Apply to both originals and renditions.** Both are static files on disk once a rendition exists,
   so the same range-capable streamer serves them.

3. **On-the-fly fallback is exempt.** A live transcode has no known length and can't satisfy
   arbitrary ranges; it streams `200` as today. This is acceptable because the fallback is the rare
   path and bumps itself into the cache (per [[0003-rendition-generation-and-storage]]), after which
   range requests work normally.

## Consequences

- Rewrite `stream_file` to accept the request and branch on `Range`.
- Correct seeking and resume-after-drop for all cached files — directly serves the data-cost and
  anti-stall goals.
- Pairs with [[0003-rendition-generation-and-storage]]: instant start (rendition exists) **and**
  resumable mid-stream.
