import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Fira_Code } from "next/font/google";
import "./globals.css";
import { TelemetryProvider } from "@/context/TelemetryContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

const outfit = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fira-code",
});

export const metadata: Metadata = {
  title: "ARMS | Inverter Early Warning System",
  description: "Advanced Real-time Monitoring & Safety dashboard for industrial inverters",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ARMS EW",
  },
};

export const viewport: Viewport = {
  themeColor: "#050B14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} ${firaCode.variable} font-sans antialiased`}>
        <TelemetryProvider>
          <div className="flex min-h-screen bg-background relative overflow-hidden">
            {/* Background elements for Antigravity theme */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(14, 165, 233, 0.15) 0%, transparent 50%), radial-gradient(circle at 85% 30%, rgba(16, 185, 129, 0.1) 0%, transparent 40%)' }}>
            </div>

            <Sidebar />
            <div className="flex-1 md:ml-64 flex flex-col z-10">
              <TopBar />
              <main className="flex-1 p-4 md:p-8">
                {children}
              </main>
            </div>
          </div>
        </TelemetryProvider>
      </body>
    </html>
  );
}
