import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import LucideIconTranslator from "@/components/shared/LucideIconTranslator";
import DynamicFavicon from "@/components/shared/DynamicFavicon";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "PUP E-Manage",
  description: "Records Management System",
  icons: {
    icon: [
      { url: "/assets/branding/black-icon.png", media: "(prefers-color-scheme: light)" },
      { url: "/assets/branding/white-icon.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/assets/branding/black-icon.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/assets/branding/white-icon.png" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
        >
          <DynamicFavicon />
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="top-center" />
          <LucideIconTranslator />
        </ThemeProvider>
      </body>
    </html>
  );
}
