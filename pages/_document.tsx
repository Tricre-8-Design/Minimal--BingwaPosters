import { Html, Head, Main, NextScript } from "next/document"

// Minimal Document to satisfy Next.js build when scanning for /_document.
// App Router is used for pages, but having this file is safe and avoids build-time errors.
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}