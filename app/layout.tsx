import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "42 Warsaw Calendar",
  description: "Subscribe to 42 Warsaw campus events in Apple Calendar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
