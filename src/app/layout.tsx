import type { Metadata } from "next";
import "./globals.css";

const description = "VynnLockwood — Backend, Data, Full-stack and AI engineer. Bangkok, Thailand.";

export const metadata: Metadata = {
  metadataBase: new URL("https://vynnlockwood.lunariankids.com"),
  title: "VynnLockwood",
  description,
  icons: { icon: "/vynn-logo.png" },
  openGraph: { title: "VynnLockwood", description, images: ["/vynn-logo.png"], type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
