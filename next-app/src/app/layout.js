import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import DynamicFavicon from "@/components/shared/DynamicFavicon";
import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata = {
  title: "eManage",
  description: "Records Keeping System",
  icons: {
    icon: [
      { url: "/assets/branding/black-icon.png", media: "(prefers-color-scheme: light)" },
      { url: "/assets/branding/white-icon.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jakarta.variable}`} suppressHydrationWarning data-scroll-behavior="smooth">
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
        </ThemeProvider>
      </body>
    </html>
  );
}
