import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "PUP E-Manage",
  description: "Student Record Keeping System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
