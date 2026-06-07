export function getRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = forwardedHost ?? request.headers.get("host") ?? new URL(request.url).host;
  return `${forwardedProto}://${host}`;
}
