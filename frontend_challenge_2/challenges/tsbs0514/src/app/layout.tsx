import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "電気料金シミュレーション | ENECHANGE",
  description:
    "現在の電気料金からどのくらいお得になるかチェック！郵便番号を入力するだけで簡単にシミュレーションできます。",
  icons: {
    icon: "https://enechange.jp/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        {children}
        {/* MSW初期化（開発環境のみ） */}
        {process.env.NODE_ENV === "development" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if (typeof window !== 'undefined') {
                  import('/mocks/browser.js').then(({ worker }) => {
                    worker.start();
                  }).catch(console.error);
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
