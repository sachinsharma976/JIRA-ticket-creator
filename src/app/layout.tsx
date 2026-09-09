import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Sidebar, MobileNav } from "@/components/Sidebar";
import { QuotaProvider } from "@/components/QuotaProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jira Ticket Creator",
  description: "Draft and create Jira tickets in your active sprint with AI assistance.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full">
        <QuotaProvider>
          <Sidebar />
          <div className="flex min-h-full flex-1 flex-col">
            <MobileNav />
            {children}
          </div>
        </QuotaProvider>
      </body>
    </html>
  );
}
