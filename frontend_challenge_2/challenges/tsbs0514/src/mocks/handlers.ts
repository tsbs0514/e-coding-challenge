import { http, HttpResponse } from "msw";
import { PowerArea } from "@/types";

/**
 * 郵便番号からエリア判定API
 */
export const areaCheckHandler = http.post(
  "/api/area-check",
  async ({ request }) => {
    const { postalCode } = (await request.json()) as { postalCode: string };

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

    return HttpResponse.json({
      area,
      isValid,
      message,
    });
  }
);

export const handlers = [areaCheckHandler];
