import { AreaCheckResponse } from "@/types";

/**
 * 郵便番号からエリア判定
 * 静的エクスポート環境ではクライアントサイドで判定
 */
export async function checkArea(
  postalCode: string
): Promise<AreaCheckResponse> {
  // 開発環境ではMSWを使用、本番環境ではクライアントサイドで判定
  if (process.env.NODE_ENV === "development") {
    const response = await fetch("/api/area-check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ postalCode }),
    });

    if (!response.ok) {
      throw new Error("エリアチェックに失敗しました");
    }

    return response.json();
  } else {
    // 本番環境（静的エクスポート）ではクライアントサイドで判定
    const firstDigit = postalCode.charAt(0);

    let area: "tokyo" | "kansai" | "out-of-service" = "out-of-service";
    let isValid = false;
    let message = "";

    if (firstDigit === "1") {
      area = "tokyo";
      isValid = true;
    } else if (firstDigit === "5") {
      area = "kansai";
      isValid = true;
    } else {
      area = "out-of-service";
      isValid = false;
      message = "サービスエリア対象外です。";
    }

    return {
      area,
      isValid,
      message,
    };
  }
}
