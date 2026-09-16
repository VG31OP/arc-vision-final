import { ENV } from "@/env";
import { FrigateConfig } from "@/types/frigateConfig";
import { NavData } from "@/types/navigation";
import { useMemo } from "react";
import { isDesktop } from "react-device-detect";
import { FaChartBar, FaCompactDisc, FaShieldAlt, FaVideo } from "react-icons/fa";
import { IoSearch } from "react-icons/io5";
import { LuBellRing, LuConstruction, LuLayoutDashboard } from "react-icons/lu";
import { MdCategory, MdChat, MdVideoLibrary } from "react-icons/md";
import { TbFaceId } from "react-icons/tb";
import useSWR from "swr";
import { useIsAdmin } from "./use-is-admin";

export const ID_COMMAND_CENTER = 0;
export const ID_LIVE = 1;
export const ID_REVIEW = 2;
export const ID_ALERTS = 3;
export const ID_EXPLORE = 4;
export const ID_EXPORT = 5;
export const ID_SECURITY_ZONES = 6;
export const ID_ANALYTICS = 7;
export const ID_PLAYGROUND = 8;
export const ID_FACE_LIBRARY = 9;
export const ID_CLASSIFICATION = 10;
export const ID_CHAT = 11;

export default function useNavigation(
  variant: "primary" | "secondary" = "primary",
) {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const isAdmin = useIsAdmin();

  const hasChatAgent = useMemo(
    () =>
      Object.values(config?.genai ?? {}).some((agent) =>
        agent?.roles?.includes("chat"),
      ),
    [config?.genai],
  );

  return useMemo(
    () =>
      [
        {
          id: ID_COMMAND_CENTER,
          variant,
          icon: LuLayoutDashboard,
          title: "menu.commandCenter",
          url: "/",
        },
        {
          id: ID_LIVE,
          variant,
          icon: FaVideo,
          title: "menu.live.title",
          url: "/live",
        },
        {
          id: ID_REVIEW,
          variant,
          icon: MdVideoLibrary,
          title: "menu.review",
          url: "/review",
        },
        {
          id: ID_ALERTS,
          variant,
          icon: LuBellRing,
          title: "menu.alerts",
          url: "/alerts",
        },
        {
          id: ID_EXPLORE,
          variant,
          icon: IoSearch,
          title: "menu.explore",
          url: "/explore",
        },
        {
          id: ID_EXPORT,
          variant,
          icon: FaCompactDisc,
          title: "menu.export",
          url: "/export",
        },
        {
          id: ID_SECURITY_ZONES,
          variant,
          icon: FaShieldAlt,
          title: "menu.securityZones",
          url: "/zones",
        },
        {
          id: ID_ANALYTICS,
          variant,
          icon: FaChartBar,
          title: "menu.analytics",
          url: "/analytics",
        },
        {
          id: ID_PLAYGROUND,
          variant,
          icon: LuConstruction,
          title: "menu.uiPlayground",
          url: "/playground",
          enabled: ENV !== "production",
        },
        {
          id: ID_FACE_LIBRARY,
          variant,
          icon: TbFaceId,
          title: "menu.faceLibrary",
          url: "/faces",
          enabled: isDesktop && config?.face_recognition.enabled && isAdmin,
        },
        {
          id: ID_CLASSIFICATION,
          variant,
          icon: MdCategory,
          title: "menu.classification",
          url: "/classification",
          enabled: isDesktop && isAdmin,
        },
        {
          id: ID_CHAT,
          variant,
          icon: MdChat,
          title: "menu.chat",
          url: "/chat",
          enabled: isDesktop && isAdmin && hasChatAgent,
        },
      ] as NavData[],
    [config?.face_recognition?.enabled, hasChatAgent, variant, isAdmin],
  );
}
