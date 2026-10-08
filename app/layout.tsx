import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Legal Metrology Compliance Scanner | Ministry of Consumer Affairs',
  description: 'Scan product labels for compliance with Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 6 mandatory declarations.',
  keywords: 'legal metrology, packaged commodities, label compliance, Rule 6, MRP, FSSAI, SIH2024',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="gov-header">
          <div className="gov-header-top">
            <span>🇮🇳</span>
            <span>Government of India &nbsp;|&nbsp; Ministry of Consumer Affairs, Food &amp; Public Distribution</span>
          </div>
          <div className="gov-header-main">
            {/* Ashoka Chakra SVG emblem placeholder */}
            <svg className="gov-emblem" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Ashoka Emblem">
              <circle cx="50" cy="50" r="46" stroke="#FF9933" strokeWidth="3" fill="none"/>
              <circle cx="50" cy="50" r="30" stroke="#FF9933" strokeWidth="2" fill="none"/>
              <circle cx="50" cy="50" r="4" fill="#FF9933"/>
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i * 360) / 24 * Math.PI / 180;
                const x1 = 50 + 6  * Math.cos(angle);
                const y1 = 50 + 6  * Math.sin(angle);
                const x2 = 50 + 28 * Math.cos(angle);
                const y2 = 50 + 28 * Math.sin(angle);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FF9933" strokeWidth="1.5"/>;
              })}
            </svg>
            <div className="gov-title-block">
              <h1>Legal Metrology Compliance Scanner</h1>
              <div className="subtitle">कानूनी माप विज्ञान अनुपालन स्कैनर</div>
              <div className="dept">Ministry of Consumer Affairs, Food & Public Distribution &bull; SIH26034</div>
            </div>
          </div>
          <div className="tricolor-strip"></div>
        </header>

        <main className="gov-main">
          {children}
        </main>

        <footer className="gov-footer">
          <p>
            &copy; 2024 Ministry of Consumer Affairs, Food &amp; Public Distribution, Government of India. &nbsp;|&nbsp;
            Reference: <a href="https://legalmetrology.gov.in" target="_blank" rel="noopener noreferrer">legalmetrology.gov.in</a> &nbsp;|&nbsp;
            Built for Smart India Hackathon 2026 &mdash; Problem Statement SIH26034
          </p>
          <p style={{ marginTop: '8px', opacity: 0.6 }}>
            This tool is for demonstration purposes. Compliance decisions should be verified by authorised officers.
          </p>
        </footer>
      </body>
    </html>
  );
}
