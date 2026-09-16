import { Archivo, IBM_Plex_Mono, Mrs_Saint_Delafield, Spectral } from "next/font/google";
import "./globals.css";

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

// Signature hand for the oath. Self-hosted by next/font at build time (SIL Open Font License).
const signature = Mrs_Saint_Delafield({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-signature",
  display: "swap",
});

export const metadata = {
  title: "DECRETUM: Salus Populi Suprema Lex",
  description: "Decretum — um jogo de estratégia política em cartas. Salus Populi Suprema Lex.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B1729",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      className={`${spectral.variable} ${archivo.variable} ${plexMono.variable} ${signature.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
