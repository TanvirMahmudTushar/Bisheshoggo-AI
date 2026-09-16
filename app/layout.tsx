import type React from "react"
import type { Metadata } from "next"
import { Space_Grotesk, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/lib/api/auth-context"
import { ServiceWorkerRegister } from "@/components/service-worker-register"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono"
})

export const metadata: Metadata = {
  title: "Bisheshoggo AI - বিশেষজ্ঞ AI Healthcare Platform",
  description:
    "AI-powered medical support platform for Bangladesh's Hill Tracts and rural regions. Access telemedicine, symptom checker, emergency SOS, and find nearby healthcare facilities.",
 
  keywords: [
    "Bisheshoggo AI",
    "বিশেষজ্ঞ",
    "telemedicine",
    "rural healthcare",
    "Bangladesh",
    "Hill Tracts",
    "medical support",
    "emergency SOS",
    "symptom checker",
    "AI healthcare",
  ],
  icons: {
    icon: "/favicon-32.png",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ServiceWorkerRegister />
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
