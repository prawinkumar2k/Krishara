import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans, Oswald } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/context/StoreContext";
import { Providers } from "@/components/Providers";
import { DevCredit } from "@/components/DevCredit";
import { EcommerceOverlays } from "@/components/EcommerceOverlays";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: "KRISHARA · Kanchipuram Pure Silk Sarees & Bridal Heritage",
  description:
    "Woven for the Divine. Shop handwoven Kanchipuram pure silk sarees, zari brocades, half sarees, bridal muhurtham weaves, and temple jewelry at Krishara.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${jakarta.variable} ${oswald.variable} antialiased`}
    >
      <body className="min-h-screen bg-white text-[#12231a] selection:bg-[#09492e] selection:text-[#fbf8f3]">
        <Providers>
          <StoreProvider>
            {children}
            <DevCredit />
            <EcommerceOverlays />
          </StoreProvider>
        </Providers>
      </body>
    </html>
  );
}
