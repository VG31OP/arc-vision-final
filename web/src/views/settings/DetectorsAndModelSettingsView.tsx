import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LuExternalLink } from "react-icons/lu";
import { toast } from "sonner";
import axios from "axios";
import useSWR from "swr";
import { useSWRConfig } from "swr";
import { cn } from "@/lib/utils";
import { useRestart } from "@/api/ws";
import RestartDialog from "@/components/overlay/dialog/RestartDialog";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { StatusBarMessagesContext } from "@/context/statusbar-provider";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import Heading from "@/components/ui/heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FrigateConfig } from "@/types/frigateConfig";
import type {
  SectionStatus,
  SettingsPageProps,
} from "@/views/settings/SingleSectionPage";
import type { ConfigSectionData } from "@/types/configForm";
import { SettingsGroupCard } from "@/components/card/SettingsGroupCard";
import { ConfigSectionTemplate } from "@/components/config-form/sections";
import {
  buildHiddenFieldContext,
  getSectionConfig,
  resolveHiddenFieldEntries,
  sanitizeSectionData,
} from "@/utils/configUtil";

type PageState = {
  detectors: ConfigSectionData;
  customModel: ConfigSectionData;
};

const TYPE_MODEL_DEFAULTS: Record<string, ConfigSectionData> = {
  cpu: {
    path: "/cpu_model.tflite",
    labelmap_path: "/labelmap.txt",
    width: 320,
    height: 320,
    input_tensor: "nhwc",
    input_pixel_format: "rgb",
    input_dtype: "int",
    model_type: "ssd",
  },
  edgetpu: {
    path: "/edgetpu_model.tflite",
    labelmap_path: "/labelmap.txt",
    width: 320,
    height: 320,
    input_tensor: "nhwc",
    input_pixel_format: "rgb",
    input_dtype: "int",
    model_type: "ssd",
  },
  openvino: {
    path: "/openvino-model/ssdlite_mobilenet_v2.xml",
    labelmap_path: "/openvino-model/coco_91cl_bkgr.txt",
    width: 300,
    height: 300,
    input_tensor: "nhwc",
    input_pixel_format: "bgr",
    input_dtype: "int",
    model_type: "ssd",
  },
};

const STATUS_BAR_KEY = "detectors_and_model";

const EMPTY_PENDING: Record<string, ConfigSectionData> = {};

const deriveInitialState = (config: FrigateConfig): PageState => {
  const { plus: _plus, ...modelWithoutPlus } = (config.model ?? {}) as Record<
    string,
    unknown
  >;

  return {
    detectors: (config.detectors ?? {}) as ConfigSectionData,
    customModel: modelWithoutPlus as ConfigSectionData,
  };
};

export default function DetectorsAndModelSettingsView({
  setUnsavedChanges,
  pendingDataBySection,
  onPendingDataChange,
  onSectionStatusChange,
  isSavingAll,
  onSectionSavingChange,
}: SettingsPageProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const { getLocaleDocUrl } = useDocDomain();
  const { data: config } = useSWR<FrigateConfig>("config");
  const { mutate: globalMutate } = useSWRConfig();
  const { addMessage, removeMessage } = useContext(StatusBarMessagesContext)!;

  // track the saved config
  const snapshot = useMemo<PageState | null>(
    () => (config ? deriveInitialState(config) : null),
    [config],
  );
  const [state, setState] = useState<PageState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const { send: sendRestart } = useRestart();
  const childPending = pendingDataBySection ?? EMPTY_PENDING;
  const [detectorStatus, setDetectorStatus] = useState<SectionStatus>({
    hasChanges: false,
    isOverridden: false,
    hasValidationErrors: false,
  });
  const [modelStatus, setModelStatus] = useState<SectionStatus>({
    hasChanges: false,
    isOverridden: false,
    hasValidationErrors: false,
  });

  const detectorHiddenFields = useMemo(
    () =>
      resolveHiddenFieldEntries(
        getSectionConfig("detectors", "global").hiddenFields,
        buildHiddenFieldContext(config, "global"),
      ),
    [config],
  );
  const modelHiddenFields = useMemo(
    () =>
      resolveHiddenFieldEntries(
        getSectionConfig("model", "global").hiddenFields,
        buildHiddenFieldContext(config, "global"),
      ),
    [config],
  );

  const liveDetectors = useMemo(
    () => childPending["detectors"] ?? snapshot?.detectors,
    [childPending, snapshot],
  );
  const liveCustomModel = useMemo(
    () => childPending["model"] ?? snapshot?.customModel,
    [childPending, snapshot],
  );

  const currentDetectorType = useMemo(() => {
    const values = Object.values(liveDetectors ?? {});
    if (values.length === 0) return undefined;
    const first = values[0] as { type?: string } | undefined;
    return first?.type;
  }, [liveDetectors]);

  // fill in defaults when detector type changes
  const prevDetectorTypeRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const newType = currentDetectorType;
    const prevType = prevDetectorTypeRef.current;
    prevDetectorTypeRef.current = newType;
    if (prevType === undefined || prevType === newType) return;
    if (!newType || !(newType in TYPE_MODEL_DEFAULTS)) return;

    const defaults = TYPE_MODEL_DEFAULTS[newType];
    onPendingDataChange?.("model", undefined, defaults);

    if (newType === "openvino") {
      const detectorsCurrent = (childPending.detectors ??
        state?.detectors ??
        {}) as {
        [key: string]: { device?: string };
      };
      const entries = Object.entries(detectorsCurrent);
      if (entries.length > 0) {
        const [firstKey, firstValue] = entries[0];
        if (!firstValue?.device) {
          onPendingDataChange?.("detectors", undefined, {
            ...detectorsCurrent,
            [firstKey]: { ...firstValue, device: "CPU" },
          } as ConfigSectionData);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDetectorType]);

  const handleDetectorStatusChange = useCallback(
    (status: SectionStatus) => {
      setDetectorStatus(status);
      onSectionStatusChange?.("detectors", "global", status);
    },
    [onSectionStatusChange],
  );

  // BaseSection drives `modelStatus` only when the Custom tab is mounted
  const handleModelStatusChange = useCallback(
    (status: SectionStatus) => setModelStatus(status),
    [],
  );

  // report the combined model-section status to the parent without the old
  // Plus-tab product status semantics.
  useEffect(() => {
    if (!state || !snapshot) return;
    onSectionStatusChange?.("model", "global", {
      hasChanges: modelStatus.hasChanges,
      isOverridden: modelStatus.isOverridden,
      overrideSource: modelStatus.overrideSource,
      hasValidationErrors: modelStatus.hasValidationErrors,
    });
  }, [state, snapshot, modelStatus, onSectionStatusChange]);

  useEffect(() => {
    if (!config || state !== null) return;
    setState(deriveInitialState(config));
  }, [config, state, pendingDataBySection]);

  const isDirty = useMemo(() => {
    if (!state || !snapshot) return false;
    if ("detectors" in childPending) return true;
    if ("model" in childPending) return true;
    return false;
  }, [state, snapshot, childPending]);

  useEffect(() => {
    if (isDirty) {
      addMessage(
        STATUS_BAR_KEY,
        t("detectorsAndModel.unsavedChanges"),
        undefined,
        STATUS_BAR_KEY,
      );
    } else {
      removeMessage(STATUS_BAR_KEY, STATUS_BAR_KEY);
    }
    setUnsavedChanges?.(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  useEffect(() => {
    document.title = t("documentTitle.detectorsAndModel");
  }, [t]);

  const onSave = useCallback(async () => {
    if (!state || !snapshot) return;

    // Strip computed/merged fields that the backend populates in /config
    // responses but doesn't accept back on /config/set.
    const sanitizedDetectors = sanitizeSectionData(
      liveDetectors ?? {},
      detectorHiddenFields,
    );
    const sanitizedCustomModel = sanitizeSectionData(
      liveCustomModel ?? {},
      modelHiddenFields,
    );

    const modelPayload = sanitizedCustomModel;

    const detectorKeysChanged =
      JSON.stringify(Object.keys(liveDetectors ?? {}).sort()) !==
      JSON.stringify(Object.keys(snapshot.detectors).sort());

    setIsSaving(true);
    onSectionSavingChange?.(true);
    let preCleared = false;
    try {
      // Pre-clear both `detectors` and `model` together when renaming
      if (detectorKeysChanged) {
        try {
          await axios.put("config/set", {
            requires_restart: 0,
            config_data: { detectors: null, model: null },
          });
          preCleared = true;
        } catch {
          // best-effort cleanup
        }
      }

      await axios.put("config/set", {
        requires_restart: 0,
        config_data: {
          detectors: sanitizedDetectors,
          model: modelPayload,
        },
      });

      await globalMutate("config");
      await globalMutate("config/raw_paths");

      // `snapshot` is derived from `config` via useMemo, so the awaited mutate
      // above has already refreshed it. Just clear the pending entries — that
      // resets isDirty since state should now match snapshot.
      onPendingDataChange?.("detectors", undefined, null);
      onPendingDataChange?.("model", undefined, null);
      setResetKey((k) => k + 1);

      addMessage(
        "detectors_and_model_restart",
        t("detectorsAndModel.restartRequired"),
        undefined,
        "detectors_and_model_restart",
      );

      toast.success(t("detectorsAndModel.toast.saveSuccess"), {
        position: "top-center",
        duration: 10000,
        action: (
          <Button onClick={() => setRestartDialogOpen(true)}>
            {t("restart.button", { ns: "components/dialog" })}
          </Button>
        ),
      });
    } catch (error) {
      const err = error as {
        response?: { data?: { message?: string; detail?: string } };
      };
      const message =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        t("detectorsAndModel.toast.saveError");
      toast.error(message, { position: "top-center" });

      if (preCleared) {
        try {
          await axios.put("config/set", {
            requires_restart: 0,
            config_data: {
              detectors: sanitizeSectionData(
                snapshot.detectors,
                detectorHiddenFields,
              ),
              model: sanitizeSectionData(snapshot.customModel, modelHiddenFields),
            },
          });
        } catch {
          // best-effort
        }
      }

      // Re-sync the config cache to reflect whatever state the backend
      // landed on after the failure (and any restore attempt).
      await globalMutate("config");
    } finally {
      setIsSaving(false);
      onSectionSavingChange?.(false);
    }
  }, [
    state,
    snapshot,
    liveDetectors,
    liveCustomModel,
    detectorHiddenFields,
    modelHiddenFields,
    globalMutate,
    onSectionSavingChange,
    addMessage,
    onPendingDataChange,
    t,
  ]);

  const onUndo = useCallback(() => {
    if (snapshot) {
      setState(snapshot);
      onPendingDataChange?.("detectors", undefined, null);
      onPendingDataChange?.("model", undefined, null);
      // Force the embedded forms to re-mount so their internal dirty/baseline
      // state is rebuilt from the current config — clearing pending alone
      // doesn't reset BaseSection's internal tracking.
      setResetKey((k) => k + 1);
    }
  }, [snapshot, onPendingDataChange]);

  if (!config || !state) {
    return <ActivityIndicator />;
  }

  const saveDisabled =
    !isDirty ||
    isSaving ||
    isSavingAll ||
    detectorStatus.hasValidationErrors ||
    modelStatus.hasValidationErrors;

  return (
    <div className="flex size-full flex-col md:pr-2">
      <div className="mb-1 flex items-center justify-between gap-4 pt-2">
        <div className="flex max-w-5xl flex-col">
          <Heading as="h4">{t("detectorsAndModel.title")}</Heading>
          <div className="my-1 text-sm text-muted-foreground">
            {t("detectorsAndModel.description")}
          </div>
          <div className="flex items-center text-sm text-primary-variant">
            <Link
              to={getLocaleDocUrl("/configuration/object_detectors")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline"
            >
              {t("readTheDocumentation", { ns: "common" })}
              <LuExternalLink className="ml-2 inline-flex size-3" />
            </Link>
          </div>
        </div>
        {isDirty && (
          <Badge
            variant="secondary"
            className="cursor-default bg-unsaved text-xs text-black hover:bg-unsaved"
          >
            {t("button.modified", { ns: "common", defaultValue: "Modified" })}
          </Badge>
        )}
      </div>
      <div className="w-full max-w-5xl space-y-6 pt-4">
        <div className="space-y-6">
          <SettingsGroupCard title={t("detectorsAndModel.cardTitles.detector")}>
            <ConfigSectionTemplate
              key={`detectors-${resetKey}`}
              sectionKey="detectors"
              level="global"
              showOverrideIndicator={false}
              showTitle={false}
              embedded
              pendingDataBySection={childPending}
              onPendingDataChange={onPendingDataChange}
              onStatusChange={handleDetectorStatusChange}
            />
          </SettingsGroupCard>
          <SettingsGroupCard title={t("detectorsAndModel.cardTitles.model")}>
            <ConfigSectionTemplate
              key={`model-${resetKey}`}
              sectionKey="model"
              level="global"
              showOverrideIndicator={false}
              showTitle={false}
              embedded
              pendingDataBySection={childPending}
              onPendingDataChange={onPendingDataChange}
              onStatusChange={handleModelStatusChange}
            />
          </SettingsGroupCard>
        </div>
      </div>

      <div className="sticky bottom-0 z-50 mt-6 w-full border-t border-secondary bg-background pt-0">
        <div
          className={cn(
            "flex flex-col items-center gap-4 pt-2 md:flex-row",
            isDirty ? "justify-between" : "justify-end",
          )}
        >
          {isDirty && (
            <span className="text-sm text-unsaved">
              {t("unsavedChanges", { ns: "views/settings" })}
            </span>
          )}
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
            {isDirty && (
              <Button
                onClick={onUndo}
                variant="outline"
                disabled={isSaving}
                className="flex min-w-36 flex-1 gap-2"
              >
                {t("button.undo", { ns: "common" })}
              </Button>
            )}
            <Button
              onClick={onSave}
              variant="select"
              disabled={saveDisabled}
              className="flex min-w-36 flex-1 gap-2"
            >
              {isSaving ? (
                <>
                  <ActivityIndicator className="h-4 w-4" />
                  {t("button.saving", { ns: "common" })}
                </>
              ) : (
                t("button.save", { ns: "common" })
              )}
            </Button>
          </div>
        </div>
      </div>
      <RestartDialog
        isOpen={restartDialogOpen}
        onClose={() => setRestartDialogOpen(false)}
        onRestart={() => sendRestart("restart")}
      />
    </div>
  );
}
