import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useCallback, useEffect } from "react";
import {
  electricSimulationFormSchema,
  ElectricSimulationFormData,
} from "@/schemas";
import { PowerArea, ContractCapacity, PlanOption, ElectricPlan } from "@/types";

const TOKYO_PLANS: ReadonlyArray<PlanOption> = [
  {
    value: "tokyo-juryou-b",
    label: "従量電灯B",
    description:
      "戸建・ファミリー向けの標準プラン。10A〜60Aの契約容量に応じた基本料金と、使用量に応じた従量料金で構成されます。夜間の使用が少ないご家庭におすすめです。",
  },
  {
    value: "tokyo-juryou-c",
    label: "従量電灯C",
    description:
      "高使用量世帯・小規模事業者向けのプラン。6〜49kVAで契約し、基本料金は契約kVAごとに設定されます。季節や時間帯による単価変動はなく通年で安定した料金設計です。",
  },
];

const KANSAI_PLANS: ReadonlyArray<PlanOption> = [
  {
    value: "kansai-juryou-a",
    label: "従量電灯A",
    description:
      "契約容量の設定が不要な標準プラン。使用量に応じて段階的に単価が変わります。ワンルームや電力使用が少なめの世帯に適しています。",
  },
  {
    value: "kansai-juryou-b",
    label: "従量電灯B",
    description:
      "高使用量世帯・業務利用向けのプラン。6〜49kVAで契約し、基本料金＋従量料金で構成されます。昼間の使用が多い場合に有利になるケースがあります。",
  },
];
import { checkArea } from "@/lib/api";

type CapacityOption = { value: ContractCapacity; label: string };

const tokyoJuryouBOptions: CapacityOption[] = [
  "10A",
  "15A",
  "20A",
  "30A",
  "40A",
  "50A",
  "60A",
].map((amp) => ({ value: amp as ContractCapacity, label: amp }));

const juryouCKansaiOptions: CapacityOption[] = Array.from(
  { length: 44 },
  (_, i) => {
    const kva = i + 6;
    const label = `${kva}kVA`;
    return { value: label as ContractCapacity, label };
  }
);

const PLAN_TO_CAPACITIES: Readonly<
  Record<Exclude<ElectricPlan, "">, ReadonlyArray<CapacityOption>>
> = {
  "tokyo-juryou-b": tokyoJuryouBOptions,
  "tokyo-juryou-c": juryouCKansaiOptions,
  "kansai-juryou-a": [],
  "kansai-juryou-b": juryouCKansaiOptions,
} as const;

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
