"use client";

import { useState } from "react";

export function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <button type="button" onClick={copyUrl}>{copied ? "Copied ✓" : "Copy URL"}</button>;
}
