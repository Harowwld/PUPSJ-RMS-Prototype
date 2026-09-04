import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import LucideIconTranslator from "@/components/shared/LucideIconTranslator";
import DynamicFavicon from "@/components/shared/DynamicFavicon";
import localFont from "next/font/local";

const inter = localFont({
  src: [
    { path: "../../public/assets/fonts/inter/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuOKfMZg.ttf", weight: "300" },
    { path: "../../public/assets/fonts/inter/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf", weight: "400" },
    { path: "../../public/assets/fonts/inter/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf", weight: "500" },
    { path: "../../public/assets/fonts/inter/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf", weight: "600" },
    { path: "../../public/assets/fonts/inter/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf", weight: "700" },
  ],
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
