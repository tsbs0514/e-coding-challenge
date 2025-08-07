import { AreaCheckResponse } from "@/types";

const API_BASE_URL = process.env.NODE_ENV === "development" ? "" : "";

/**
 * 郵便番号からエリア判定
 */
export async function checkArea(
  postalCode: string
): Promise<AreaCheckResponse> {
  const response = await fetch(`${API_BASE_URL}/api/area-check`, {
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
}
