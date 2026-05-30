import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { Inter_Tight } from "next/font/google";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "PUP E-Manage",
  description: "Student Record Keeping System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={interTight.variable} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/assets/vendor/phosphor/bold/style.css" />
        <link rel="stylesheet" href="/assets/vendor/phosphor/fill/style.css" />
        <link
          rel="stylesheet"
          href="/assets/vendor/phosphor/duotone/style.css"
        />
        <link rel="stylesheet" href="/assets/vendor/phosphor/thin/style.css" />
        <link rel="stylesheet" href="/assets/vendor/phosphor/light/style.css" />
      </head>
      <body className="antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
