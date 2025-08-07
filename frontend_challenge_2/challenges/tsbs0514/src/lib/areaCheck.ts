import { PowerArea } from "@/types";

/**
 * 郵便番号からエリア判定ロジック
 * 共通化された判定ロジック
 */
export function checkAreaLogic(postalCode: string): {
  area: PowerArea;
  isValid: boolean;
  message: string;
} {
  const firstDigit = postalCode.charAt(0);

  let area: PowerArea = "out-of-service";
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
