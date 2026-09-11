// Share the reviewed disclosure policy with the main website.
export function GET() {
  return Response.redirect("https://ryuhq.com/.well-known/security.txt", 308);
}
