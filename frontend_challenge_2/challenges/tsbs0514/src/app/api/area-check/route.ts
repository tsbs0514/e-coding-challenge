import { NextRequest, NextResponse } from "next/server";
import { PowerArea } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { postalCode } = await request.json();

    if (!postalCode || typeof postalCode !== "string") {
      return NextResponse.json(
        { error: "郵便番号が必要です" },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      area,
      isValid,
      message,
    });
  } catch (error) {
    console.error("Area check error:", error);
    return NextResponse.json(
      { error: "エリアチェックに失敗しました" },
      { status: 500 }
    );
  }
} 