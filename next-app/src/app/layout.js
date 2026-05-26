import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/ThemeProvider";

export const metadata = {
  title: "PUP E-Manage",
  description: "Student Record Keeping System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/assets/fonts/inter/inter.css" />
        <link rel="stylesheet" href="/assets/vendor/phosphor/bold/style.css" />
        <link rel="stylesheet" href="/assets/vendor/phosphor/fill/style.css" />
        <link
          rel="stylesheet"
          href="/assets/vendor/phosphor/duotone/style.css"
        />
        <link rel="stylesheet" href="/assets/vendor/phosphor/thin/style.css" />
        <link rel="stylesheet" href="/assets/vendor/phosphor/light/style.css" />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
