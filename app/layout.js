import "./globals.css";
import AppProvider from "@/components/AppProvider";
import LangSwitch from "@/components/LangSwitch";
import Scene from "@/components/Scene";
import PwaBoot from "@/components/PwaBoot";
import VoiceNotice from "@/components/VoiceNotice";

export const metadata = {
  title: "MindBloom",
  description: "Bilingual letters and numbers for children aged 3 to 6",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "MindBloom", statusBarStyle: "default" },
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#ff7a59" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <PwaBoot />
          <VoiceNotice />
          <Scene />
          <main className="page">
            <LangSwitch />
            {children}
          </main>
        </AppProvider>
      </body>
    </html>
  );
}
