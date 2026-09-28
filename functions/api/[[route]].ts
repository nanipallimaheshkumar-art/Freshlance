/**
 * Cloudflare Pages Functions Catch-All API Handler
 * Matches any request to /api/* when deployed to Cloudflare Pages
 */
import worker from "../../worker";
import type { Env } from "../../worker";

export async function onRequest(context: {
  request: Request;
  env: Env;
  params: { route: string[] };
}): Promise<Response> {
  return worker.fetch(context.request, context.env);
}
