import { renderHook, act, waitFor } from "@testing-library/react";
import { useElectricForm } from "@/hooks/useElectricForm";

import * as apiModule from "@/lib/api";

// APIモック
jest.mock("@/lib/api", () => ({
  checkArea: jest.fn(),
}));

const mockCheckArea = apiModule.checkArea as jest.MockedFunction<
  typeof apiModule.checkArea
>;

describe("useElectricFormフック", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトのモック設定
    mockCheckArea.mockResolvedValue({
      area: "tokyo",
      isValid: true,
      message: "",
    });
  });

  describe("初期状態", () => {
    it("初期状態が正しく設定される", () => {
      const { result } = renderHook(() => useElectricForm());

      expect(result.current.currentArea).toBeNull();
      expect(result.current.areaError).toBe("");
      expect(result.current.companyError).toBe("");
      expect(result.current.isSubmitting).toBe(false);
    });

    it("フォームの初期値が正しく設定される", () => {
      const { result } = renderHook(() => useElectricForm());

      expect(result.current.form.getValues()).toEqual({
        postalCodeFirst: "",
        postalCodeSecond: "",
        powerCompany: "",
        plan: "",
        contractCapacity: undefined,
        currentElectricBill: undefined,
        email: "",
      });
    });
  });

  describe("郵便番号変更処理", () => {
    it("郵便番号が不完全な場合はエリアチェックが実行されない", async () => {
      const { result } = renderHook(() => useElectricForm());

      act(() => {
        result.current.form.setValue("postalCodeFirst", "13");
        result.current.form.setValue("postalCodeSecond", "001");
      });

      await waitFor(() => {
        expect(mockCheckArea).not.toHaveBeenCalled();
      });
    });

    it("郵便番号が完全な場合はエリアチェックが実行される", async () => {
      const { result } = renderHook(() => useElectricForm());

      act(() => {
        result.current.form.setValue("postalCodeFirst", "130");
        result.current.form.setValue("postalCodeSecond", "0012");
      });

      await waitFor(() => {
        expect(mockCheckArea).toHaveBeenCalledWith("1300012");
      });
    });

    it("エリアチェック成功時にcurrentAreaが更新される", async () => {
      const { result } = renderHook(() => useElectricForm());

      act(() => {
        result.current.form.setValue("postalCodeFirst", "130");
        result.current.form.setValue("postalCodeSecond", "0012");
      });

      await waitFor(() => {
        expect(result.current.currentArea).toBe("tokyo");
        expect(result.current.areaError).toBe("");
      });
    });

    it("エリアチェック失敗時にエラーメッセージが設定される", async () => {
      mockCheckArea.mockResolvedValue({
        area: "out-of-service",
        isValid: false,
        message: "このエリアではサービスを提供していません",
      });

      const { result } = renderHook(() => useElectricForm());

      act(() => {
        result.current.form.setValue("postalCodeFirst", "999");
        result.current.form.setValue("postalCodeSecond", "9999");
      });

      await waitFor(() => {
        expect(result.current.currentArea).toBe("out-of-service");
        expect(result.current.areaError).toBe(
          "このエリアではサービスを提供していません"
        );
      });
    });

    it("エリアチェック失敗時にエラーメッセージが設定される", async () => {
      mockCheckArea.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useElectricForm());

      act(() => {
        result.current.form.setValue("postalCodeFirst", "130");
        result.current.form.setValue("postalCodeSecond", "0012");
      });

      await waitFor(() => {
        expect(result.current.areaError).toBe("エリアチェックに失敗しました");
      });
    });
  });

  describe("電力会社変更処理", () => {
    it("その他選択時にエラーメッセージが設定される", async () => {
      const { result } = renderHook(() => useElectricForm());

      // エリアチェックを完了
      act(() => {
        result.current.form.setValue("postalCodeFirst", "130");
        result.current.form.setValue("postalCodeSecond", "0012");
      });

      await waitFor(() => {
        expect(result.current.currentArea).toBe("tokyo");
      });

      act(() => {
        result.current.form.setValue("powerCompany", "other");
      });

      await waitFor(() => {
        expect(result.current.companyError).toBe(
          "シミュレーション対象外です。"
        );
      });
    });

    it("東京電力選択時にエラーがクリアされる", async () => {
      const { result } = renderHook(() => useElectricForm());

      // エリアチェックを完了
      act(() => {
        result.current.form.setValue("postalCodeFirst", "130");
        result.current.form.setValue("postalCodeSecond", "0012");
      });

      await waitFor(() => {
        expect(result.current.currentArea).toBe("tokyo");
      });

      act(() => {
        result.current.form.setValue("powerCompany", "tokyo-electric");
      });

      await waitFor(() => {
        expect(result.current.companyError).toBe("");
      });
    });
  });

  describe("利用可能な選択肢の取得", () => {
    describe("getAvailablePowerCompanies", () => {
      it("東京エリアでは東京電力とその他が返される", async () => {
        const { result } = renderHook(() => useElectricForm());

        // エリアチェックを完了
        act(() => {
          result.current.form.setValue("postalCodeFirst", "130");
          result.current.form.setValue("postalCodeSecond", "0012");
        });

        await waitFor(() => {
          expect(result.current.currentArea).toBe("tokyo");
        });

        const companies = result.current.getAvailablePowerCompanies();

        expect(companies).toEqual([
          { value: "tokyo-electric", label: "東京電力" },
          { value: "other", label: "その他" },
        ]);
      });

      it("関西エリアでは関西電力とその他が返される", async () => {
        mockCheckArea.mockResolvedValue({
          area: "kansai",
          isValid: true,
          message: "",
        });

        const { result } = renderHook(() => useElectricForm());

        act(() => {
          result.current.form.setValue("postalCodeFirst", "567");
          result.current.form.setValue("postalCodeSecond", "8901");
        });

        await waitFor(() => {
          expect(result.current.currentArea).toBe("kansai");
        });

        const companies = result.current.getAvailablePowerCompanies();

        expect(companies).toEqual([
          { value: "kansai-electric", label: "関西電力" },
          { value: "other", label: "その他" },
        ]);
      });

      it("エリア外の場合は空配列が返される", async () => {
        mockCheckArea.mockResolvedValue({
          area: "out-of-service",
          isValid: false,
          message: "このエリアではサービスを提供していません",
        });

        const { result } = renderHook(() => useElectricForm());

        act(() => {
          result.current.form.setValue("postalCodeFirst", "999");
          result.current.form.setValue("postalCodeSecond", "9999");
        });

        await waitFor(() => {
          expect(result.current.currentArea).toBe("out-of-service");
        });

        const companies = result.current.getAvailablePowerCompanies();

        expect(companies).toEqual([]);
      });
    });

    describe("getAvailablePlans", () => {
      it("東京電力選択時に適切なプランが返される", async () => {
        const { result } = renderHook(() => useElectricForm());

        // エリアチェックを完了
        act(() => {
          result.current.form.setValue("postalCodeFirst", "130");
          result.current.form.setValue("postalCodeSecond", "0012");
        });

        await waitFor(() => {
          expect(result.current.currentArea).toBe("tokyo");
        });

        act(() => {
          result.current.form.setValue("powerCompany", "tokyo-electric");
        });

        await waitFor(() => {
          const plans = result.current.getAvailablePlans();
          expect(plans).toEqual([
            { value: "tokyo-juryou-b", label: "従量電灯B" },
            { value: "tokyo-juryou-c", label: "従量電灯C" },
          ]);
        });
      });

      it("関西電力選択時に適切なプランが返される", async () => {
        mockCheckArea.mockResolvedValue({
          area: "kansai",
          isValid: true,
          message: "",
        });

        const { result } = renderHook(() => useElectricForm());

        act(() => {
          result.current.form.setValue("postalCodeFirst", "567");
          result.current.form.setValue("postalCodeSecond", "8901");
        });

        await waitFor(() => {
          expect(result.current.currentArea).toBe("kansai");
        });

        act(() => {
          result.current.form.setValue("powerCompany", "kansai-electric");
        });

        await waitFor(() => {
          const plans = result.current.getAvailablePlans();
          expect(plans).toEqual([
            { value: "kansai-juryou-a", label: "従量電灯A" },
            { value: "kansai-juryou-b", label: "従量電灯B" },
          ]);
        });
      });

      it("その他選択時は空配列が返される", async () => {
        const { result } = renderHook(() => useElectricForm());

        // エリアチェックを完了
        act(() => {
          result.current.form.setValue("postalCodeFirst", "130");
          result.current.form.setValue("postalCodeSecond", "0012");
        });

        await waitFor(() => {
          expect(result.current.currentArea).toBe("tokyo");
        });

        act(() => {
          result.current.form.setValue("powerCompany", "other");
        });

        await waitFor(() => {
          const plans = result.current.getAvailablePlans();
          expect(plans).toEqual([]);
        });
      });
    });

    describe("getAvailableCapacities", () => {
      it("従量電灯B選択時に適切な契約容量が返される", async () => {
        const { result } = renderHook(() => useElectricForm());

        // エリアチェックを完了
        act(() => {
          result.current.form.setValue("postalCodeFirst", "130");
          result.current.form.setValue("postalCodeSecond", "0012");
        });

        await waitFor(() => {
          expect(result.current.currentArea).toBe("tokyo");
        });

        act(() => {
          result.current.form.setValue("powerCompany", "tokyo-electric");
        });

        await waitFor(() => {
          act(() => {
            result.current.form.setValue("plan", "tokyo-juryou-b");
          });
        });

        await waitFor(() => {
          const capacities = result.current.getAvailableCapacities();
          expect(capacities).toEqual([
            { value: "10A", label: "10A" },
            { value: "15A", label: "15A" },
            { value: "20A", label: "20A" },
            { value: "30A", label: "30A" },
            { value: "40A", label: "40A" },
            { value: "50A", label: "50A" },
            { value: "60A", label: "60A" },
          ]);
        });
      });

      it("従量電灯C選択時に適切な契約容量が返される", async () => {
        const { result } = renderHook(() => useElectricForm());

        // エリアチェックを完了
        act(() => {
          result.current.form.setValue("postalCodeFirst", "130");
          result.current.form.setValue("postalCodeSecond", "0012");
        });

        await waitFor(() => {
          expect(result.current.currentArea).toBe("tokyo");
        });

        act(() => {
          result.current.form.setValue("powerCompany", "tokyo-electric");
        });

        await waitFor(() => {
          act(() => {
            result.current.form.setValue("plan", "tokyo-juryou-c");
          });
        });

        await waitFor(() => {
          const capacities = result.current.getAvailableCapacities();
          expect(capacities).toHaveLength(44);
          expect(capacities[0]).toEqual({ value: "6kVA", label: "6kVA" });
          expect(capacities[43]).toEqual({ value: "49kVA", label: "49kVA" });
        });
      });

      it("従量電灯A選択時は空配列が返される", async () => {
        mockCheckArea.mockResolvedValue({
          area: "kansai",
          isValid: true,
          message: "",
        });

        const { result } = renderHook(() => useElectricForm());

        act(() => {
          result.current.form.setValue("postalCodeFirst", "567");
          result.current.form.setValue("postalCodeSecond", "8901");
        });

        await waitFor(() => {
          expect(result.current.currentArea).toBe("kansai");
        });

        act(() => {
          result.current.form.setValue("powerCompany", "kansai-electric");
        });

        await waitFor(() => {
          act(() => {
            result.current.form.setValue("plan", "kansai-juryou-a");
          });
        });

        await waitFor(() => {
          const capacities = result.current.getAvailableCapacities();
          expect(capacities).toEqual([]);
        });
      });
    });

    describe("isContractCapacityRequired", () => {
      it("従量電灯Bでは契約容量が必要", async () => {
        const { result } = renderHook(() => useElectricForm());

        // エリアチェックを完了
        act(() => {
          result.current.form.setValue("postalCodeFirst", "130");
          result.current.form.setValue("postalCodeSecond", "0012");
        });

        await waitFor(() => {
          expect(result.current.currentArea).toBe("tokyo");
        });

        act(() => {
          result.current.form.setValue("powerCompany", "tokyo-electric");
        });

        await waitFor(() => {
          act(() => {
            result.current.form.setValue("plan", "tokyo-juryou-b");
          });
        });

        await waitFor(() => {
          expect(result.current.isContractCapacityRequired()).toBe(true);
        });
      });

      it("従量電灯Aでは契約容量が不要", async () => {
        mockCheckArea.mockResolvedValue({
          area: "kansai",
          isValid: true,
          message: "",
        });

        const { result } = renderHook(() => useElectricForm());

        act(() => {
          result.current.form.setValue("postalCodeFirst", "567");
          result.current.form.setValue("postalCodeSecond", "8901");
        });

        await waitFor(() => {
          expect(result.current.currentArea).toBe("kansai");
        });

        act(() => {
          result.current.form.setValue("powerCompany", "kansai-electric");
        });

        await waitFor(() => {
          act(() => {
            result.current.form.setValue("plan", "kansai-juryou-a");
          });
        });

        await waitFor(() => {
          expect(result.current.isContractCapacityRequired()).toBe(false);
        });
      });
    });
  });

  describe("状態管理", () => {
    it("isSubmittingの状態が正しく管理される", () => {
      const { result } = renderHook(() => useElectricForm());

      expect(result.current.isSubmitting).toBe(false);

      act(() => {
        result.current.setIsSubmitting(true);
      });

      expect(result.current.isSubmitting).toBe(true);

      act(() => {
        result.current.setIsSubmitting(false);
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });
});
