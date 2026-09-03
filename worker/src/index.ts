// VoxStage Worker entry — M1 skeleton (docs/STATUS-2026-09-01.md §8, option 2).
// `/api/*` is answered here; everything else is served from the static assets
// directory (`app/dist`) by the Workers Assets layer.
export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return Response.json({ ok: true, service: "voxstage-staging", path: url.pathname });
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
