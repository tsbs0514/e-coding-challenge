import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useCallback, useEffect, useMemo } from "react";
import {
  electricSimulationFormSchema,
  ElectricSimulationFormData,
} from "@/schemas";
import { PowerArea, PlanOption, ElectricPlan, PowerCompany } from "@/types";
import {
  TOKYO_PLANS,
  KANSAI_PLANS,
  COMPANY_OPTIONS_BY_AREA,
  PLAN_TO_CAPACITIES,
  type CapacityOption,
  POWER_COMPANY_LABELS,
  PLAN_LABELS,
} from "@/constants/options";
import { checkArea } from "@/lib/api";

// use Electric PLAN_TO_CAPACITIES from constants

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

  const { watch, clearErrors, resetField, setFocus } = form;

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

    return COMPANY_OPTIONS_BY_AREA[currentArea];
  }, [currentArea]);

  // 利用可能なプランを取得
  const getAvailablePlans = useCallback((): ReadonlyArray<PlanOption> => {
    if (!watchedPowerCompany || companyError) return [];

    return watchedPowerCompany === "tokyo-electric"
      ? TOKYO_PLANS
      : KANSAI_PLANS;
  }, [watchedPowerCompany, companyError]);

  // 利用可能な契約容量を取得
  const getAvailableCapacities =
    useCallback((): ReadonlyArray<CapacityOption> => {
      if (!watchedPlan) return [];
      return PLAN_TO_CAPACITIES[watchedPlan as Exclude<ElectricPlan, "">] ?? [];
    }, [watchedPlan]);

  // 契約容量が必要かどうか
  const isContractCapacityRequired = useCallback(() => {
    return watchedPlan && watchedPlan !== "kansai-juryou-a";
  }, [watchedPlan]);

  // プランの表示/非表示
  const isPlanVisible = useMemo(() => {
    return Boolean(watchedPowerCompany) && !companyError;
  }, [watchedPowerCompany, companyError]);

  // 契約容量の表示/非表示
  const isCapacityVisible = useMemo(() => {
    return Boolean(watchedPlan) && watchedPlan !== "kansai-juryou-a";
  }, [watchedPlan]);

  // 選択されたプランの情報
  const selectedPlanOption = useMemo(() => {
    if (!watchedPlan) return undefined;
    const plans = getAvailablePlans();
    return plans.find((p) => p.value === watchedPlan);
  }, [watchedPlan, getAvailablePlans]);

  // プランの説明文
  const planDescription = selectedPlanOption?.description || "";

  // 電力会社のラベル
  const companyLabel = useMemo(() => {
    return watchedPowerCompany
      ? POWER_COMPANY_LABELS[
          (watchedPowerCompany as Exclude<PowerCompany, "">) || "other"
        ] || watchedPowerCompany
      : "";
  }, [watchedPowerCompany]);

  // プランのラベル
  const planLabel = useMemo(() => {
    return watchedPlan
      ? PLAN_LABELS[watchedPlan as Exclude<ElectricPlan, "">] || watchedPlan
      : "";
  }, [watchedPlan]);

  // 詳細情報セクションの表示/非表示
  const isDetailsSectionVisible = useMemo(() => {
    return (
      Boolean(watchedPlan) && !!currentArea && currentArea !== "out-of-service"
    );
  }, [watchedPlan, currentArea]);

  // 郵便番号の監視
  useEffect(() => {
    if (watchedPostalCodeFirst && watchedPostalCodeSecond) {
      handlePostalCodeChange(watchedPostalCodeFirst, watchedPostalCodeSecond);
    }
  }, [watchedPostalCodeFirst, watchedPostalCodeSecond, handlePostalCodeChange]);

  // 郵便番号前半3桁入力で後半へ自動フォーカス
  useEffect(() => {
    if (watchedPostalCodeFirst && watchedPostalCodeFirst.length === 3) {
      setFocus("postalCodeSecond");
    }
  }, [watchedPostalCodeFirst, setFocus]);

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
    isPlanVisible,
    isCapacityVisible,
    selectedPlanOption,
    planDescription,
    companyLabel,
    planLabel,
    isDetailsSectionVisible,
    setIsSubmitting,
    getAvailablePowerCompanies,
    getAvailablePlans,
    getAvailableCapacities,
    isContractCapacityRequired,
  };
}
