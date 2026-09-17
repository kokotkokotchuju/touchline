import { NextRequest, NextResponse } from "next/server";

export const config = { matcher: ["/admin/:path*"] };

export function proxy(request: NextRequest) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password)
    return new NextResponse("Not found", { status: 404 });
  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    let decoded: string;
    try {
      decoded = atob(header.slice(6));
    } catch {
      decoded = "";
    }
    const separator = decoded.indexOf(":");
    if (
      separator > 0 &&
      decoded.slice(0, separator) === username &&
      decoded.slice(separator + 1) === password
    ) {
      return NextResponse.next();
    }
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Touchline admin"' },
  });
}
