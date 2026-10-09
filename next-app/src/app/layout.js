import SessionRefresh from "@/components/shared/SessionRefresh";
import AccessibilitySync from "@/components/shared/AccessibilitySync";
import ScrollIndicator from "@/components/shared/ScrollIndicator";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import DynamicFavicon from "@/components/shared/DynamicFavicon";
import localFont from "next/font/local";
import { headers } from "next/headers";

const jakarta = localFont({
  src: "../../public/assets/fonts/jakarta/PlusJakartaSans-Variable.woff2",
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

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get("x-nonce") || undefined;
  return (
    <html lang="en" className={`${jakarta.variable}`} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="icon" href="/assets/branding/black-icon.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/assets/branding/white-icon.png" media="(prefers-color-scheme: dark)" />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var h=localStorage.getItem("pup_high_contrast");if(!h){for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf("pup_high_contrast_")===0&&localStorage.getItem(k)==="true"){h="true";break;}}}if(h==="true"){document.documentElement.classList.add("high-contrast");}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased font-sans">
        <ThemeProvider
          nonce={nonce}
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
        >
          <SessionRefresh />
          <AccessibilitySync />
          <DynamicFavicon />
          <ScrollIndicator />
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
