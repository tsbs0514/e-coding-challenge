import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useCallback, useEffect } from "react";
import {
  electricSimulationFormSchema,
  ElectricSimulationFormData,
} from "@/schemas";
import { PowerArea, ContractCapacity } from "@/types";
import { checkArea } from "@/lib/api";

export function useElectricForm() {
  const [currentArea, setCurrentArea] = useState<PowerArea | null>(null);
  const [areaError, setAreaError] = useState<string>("");
  const [companyError, setCompanyError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ElectricSimulationFormData>({
    resolver: zodResolver(electricSimulationFormSchema),
    mode: "onChange",
    defaultValues: {
      postalCodeFirst: "",
      postalCodeSecond: "",
      powerCompany: "",
      plan: "",
      contractCapacity: undefined,
      currentElectricBill: undefined,
      email: "",
    },
  });

  const { watch, clearErrors, resetField } = form;

  const watchedPostalCodeFirst = watch("postalCodeFirst");
  const watchedPostalCodeSecond = watch("postalCodeSecond");
  const watchedPowerCompany = watch("powerCompany");
  const watchedPlan = watch("plan");

  const resetSelectedFields = useCallback(() => {
    resetField("powerCompany");
    resetField("plan");
    resetField("contractCapacity");
  }, [resetField]);

  // 郵便番号変更時のエリアチェック
  const handlePostalCodeChange = useCallback(
    async (first: string, second: string) => {
      if (first.length === 3 && second.length === 4) {
        const fullPostalCode = first + second;
        try {
          const result = await checkArea(fullPostalCode);
          if (result.area !== currentArea) {
            resetSelectedFields();
            setCompanyError("");
          }

          setCurrentArea(result.area);

          if (!result.isValid) {
            setAreaError(result.message || "");
            // エリア外の場合は電力会社以降をリセット
            resetSelectedFields();
          } else {
            setAreaError("");
          }
        } catch {
          setAreaError("エリアチェックに失敗しました");
        }
      } else {
        setCurrentArea(null);
        setAreaError("");
      }
    },
    [resetSelectedFields, currentArea]
  );

  // 電力会社変更時のチェック
  const handlePowerCompanyChange = useCallback(() => {
    try {
      if (watchedPowerCompany === "other") {
        setCompanyError("シミュレーション対象外です。");
        // その他選択時はプラン以降をリセット
        resetField("plan");
        resetField("contractCapacity");
      } else {
        setCompanyError("");
      }
    } catch {
      setCompanyError("電力会社チェックに失敗しました");
    }
  }, [resetField, watchedPowerCompany]);

  // 利用可能な電力会社を取得
  const getAvailablePowerCompanies = useCallback(() => {
    if (!currentArea || currentArea === "out-of-service") return [];

    return currentArea === "tokyo"
      ? [
          { value: "tokyo-electric" as const, label: "東京電力" },
          { value: "other" as const, label: "その他" },
        ]
      : [
          { value: "kansai-electric" as const, label: "関西電力" },
          { value: "other" as const, label: "その他" },
        ];
  }, [currentArea]);

  // 利用可能なプランを取得
  const getAvailablePlans = useCallback(() => {
    if (!watchedPowerCompany || companyError) return [];

    return watchedPowerCompany === "tokyo-electric"
      ? [
          { value: "tokyo-juryou-b" as const, label: "従量電灯B" },
          { value: "tokyo-juryou-c" as const, label: "従量電灯C" },
        ]
      : [
          { value: "kansai-juryou-a" as const, label: "従量電灯A" },
          { value: "kansai-juryou-b" as const, label: "従量電灯B" },
        ];
  }, [watchedPowerCompany, companyError]);

  // 利用可能な契約容量を取得
  const getAvailableCapacities = useCallback(() => {
    if (!watchedPlan) return [];

    switch (watchedPlan) {
      case "tokyo-juryou-b":
        return [
          { value: "10A" as const, label: "10A" },
          { value: "15A" as const, label: "15A" },
          { value: "20A" as const, label: "20A" },
          { value: "30A" as const, label: "30A" },
          { value: "40A" as const, label: "40A" },
          { value: "50A" as const, label: "50A" },
          { value: "60A" as const, label: "60A" },
        ];
      case "tokyo-juryou-c":
      case "kansai-juryou-b":
        return Array.from({ length: 44 }, (_, i) => {
          const kva = i + 6;
          return { value: `${kva}kVA` as ContractCapacity, label: `${kva}kVA` };
        });
      case "kansai-juryou-a":
        return []; // 契約容量不要
      default:
        return [];
    }
  }, [watchedPlan]);

  // 契約容量が必要かどうか
  const isContractCapacityRequired = useCallback(() => {
    return watchedPlan && watchedPlan !== "kansai-juryou-a";
  }, [watchedPlan]);

  // 郵便番号の監視
  useEffect(() => {
    if (watchedPostalCodeFirst && watchedPostalCodeSecond) {
      handlePostalCodeChange(watchedPostalCodeFirst, watchedPostalCodeSecond);
    }
  }, [watchedPostalCodeFirst, watchedPostalCodeSecond, handlePostalCodeChange]);

  // 電力会社の監視
  useEffect(() => {
    if (watchedPowerCompany) {
      handlePowerCompanyChange();
    }
  }, [watchedPowerCompany, handlePowerCompanyChange]);

  // プラン変更時に契約容量をリセット
  useEffect(() => {
    resetField("contractCapacity");
    clearErrors("contractCapacity");
  }, [watchedPlan, resetField, clearErrors]);

  return {
    form,
    currentArea,
    areaError,
    companyError,
    isSubmitting,
    setIsSubmitting,
    getAvailablePowerCompanies,
    getAvailablePlans,
    getAvailableCapacities,
    isContractCapacityRequired,
  };
}
