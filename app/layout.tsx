import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";

import "./globals.css";
import "react-loading-skeleton/dist/skeleton.css";
import Navbar from "@/components/navbar";
import Providers from "@/components/Provider";

const nunito = Nunito({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TENANT",
  description:
    "Discover unique stays and plan your next trip with TENANT.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={nunito.className}>
        <Providers>
          <Navbar />
          <main className="pb-16 md:pt-28 pt-24">{children}</main>
        </Providers>
      </body>
      <GoogleAnalytics gaId={process.env.GA_MEASUREMENT_ID || ""} />
    </html>
  );
}
