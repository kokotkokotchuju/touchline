import { checkRateLimit, requestAddress } from "./rate-limit";
import { getCurrentUser } from "./auth";

export async function enforceApiRateLimit(request: Request, scope: string) {
  if (!(await getCurrentUser())) {
    return {
      allowed: false as const,
      response: Response.json(
        {
          error: { code: "AUTH_REQUIRED", message: "Log in to view matches." },
        },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
  const result = await checkRateLimit(`${scope}:${requestAddress(request)}`);
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-RateLimit-Limit": "60",
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  });
  return result.allowed
    ? { allowed: true as const, headers }
    : {
        allowed: false as const,
        response: Response.json(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Too many requests. Try again shortly.",
            },
          },
          { status: 429, headers },
        ),
      };
}

export async function enforcePublicApiRateLimit(
  request: Request,
  scope: string,
) {
  const result = await checkRateLimit(`${scope}:${requestAddress(request)}`);
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-RateLimit-Limit": "60",
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  });
  return result.allowed
    ? { allowed: true as const, headers }
    : {
        allowed: false as const,
        response: Response.json(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Too many requests. Try again shortly.",
            },
          },
          { status: 429, headers },
        ),
      };
}
