/**
 * Apollo Sandbox embed. Served at GET /graphql when `enableSandbox` is true
 * and the caller is a browser (Accept: text/html). Lets you exercise the
 * gateway from a GUI without writing any client code.
 *
 * The CDN script is the one Apollo publishes for embedding the Sandbox
 * outside their own studio domain.
 */

export function sandboxHtml(endpoint: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>lead-gen · Apollo Sandbox</title>
  <style>html,body,#sandbox{margin:0;padding:0;height:100vh;width:100vw}</style>
</head>
<body>
  <div id="sandbox"></div>
  <script src="https://embeddable-sandbox.cdn.apollographql.com/_latest/embeddable-sandbox.umd.production.min.js"></script>
  <script>
    new window.EmbeddedSandbox({
      target: "#sandbox",
      initialEndpoint: ${JSON.stringify(endpoint)},
      includeCookies: true,
    });
  </script>
</body>
</html>`;
}
