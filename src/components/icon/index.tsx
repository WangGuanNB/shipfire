"use client";

import {
  RiAddLine,
  RiAppsLine,
  RiArticleLine,
  RiBankCardLine,
  RiBookLine,
  RiCheckLine,
  RiCloudLine,
  RiCopperCoinLine,
  RiCpuLine,
  RiDashboardLine,
  RiDiscordFill,
  RiDiscordLine,
  RiDownloadLine,
  RiEditLine,
  RiEmotionSadFill,
  RiEyeLine,
  RiFileCopy2Line,
  RiFileTextLine,
  RiFingerprintLine,
  RiFlashlightFill,
  RiFlashlightLine,
  RiFundsLine,
  RiGiftLine,
  RiGithubFill,
  RiGithubLine,
  RiHdLine,
  RiHeartLine,
  RiHomeLine,
  RiImageAddLine,
  RiImageLine,
  RiKey2Line,
  RiLayoutLine,
  RiLightbulbLine,
  RiLoader4Line,
  RiMagicLine,
  RiMailLine,
  RiMessage2Line,
  RiMoneyCnyCircleFill,
  RiMoneyDollarBoxLine,
  RiOrderPlayLine,
  RiPaletteLine,
  RiPencilLine,
  RiPinterestLine,
  RiRedditLine,
  RiSearchEyeLine,
  RiSearchLine,
  RiSettings3Line,
  RiSettingsLine,
  RiShareLine,
  RiShoppingBagLine,
  RiSparklingLine,
  RiSpeedLine,
  RiStackLine,
  RiStarLine,
  RiStarSLine,
  RiTelegramLine,
  RiThumbUpLine,
  RiTwitterLine,
  RiTwitterXFill,
  RiUserLine,
} from "react-icons/ri";

/** Explicit map so unused Remix icons stay out of the client bundle. */
const icons = {
  RiAddLine,
  RiAppsLine,
  RiArticleLine,
  RiBankCardLine,
  RiBookLine,
  RiCheckLine,
  RiCloudLine,
  RiCopperCoinLine,
  RiCopy2Line: RiFileCopy2Line,
  RiCpuLine,
  RiDashboardLine,
  RiDiscordFill,
  RiDiscordLine,
  RiDownloadLine,
  RiEditLine,
  RiEmotionSadFill,
  RiEyeLine,
  RiFileTextLine,
  RiFingerprintLine,
  RiFlashlightFill,
  RiFundsLine,
  RiGiftLine,
  RiGithubFill,
  RiGithubLine,
  RiHdLine,
  RiHeartLine,
  RiHomeLine,
  RiImageAddLine,
  RiImageLine,
  RiKey2Line,
  RiLayersLine: RiStackLine,
  RiLayoutLine,
  RiLightbulbLine,
  RiLoader4Line,
  RiMagicLine,
  RiMailLine,
  RiMessage2Line,
  RiMoneyCnyCircleFill,
  RiMoneyDollarBoxLine,
  RiOrderPlayLine,
  RiPaletteLine,
  RiPencilLine,
  RiPinterestLine,
  RiRedditLine,
  RiSearchEyeLine,
  RiSearchLine,
  RiSettings3Line,
  RiSettingsLine,
  RiShareLine,
  RiShoppingBagLine,
  RiSparklingLine,
  RiSpeedLine,
  RiStarLine,
  RiStarSLine,
  RiTelegramLine,
  RiThumbUpLine,
  RiTwitterLine,
  RiTwitterXFill,
  RiUserLine,
  RiZapLine: RiFlashlightLine,
} as const;

export default function Icon({
  name,
  className,
  onClick,
}: {
  name: string;
  className?: string;
  onClick?: () => void;
}) {
  const IconComponent = icons[name as keyof typeof icons] as
    | React.ElementType
    | undefined;

  if (!IconComponent) return null;

  return (
    <IconComponent
      className={`${className ?? ""} ${onClick ? "cursor-pointer" : ""}`.trim()}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    />
  );
}

export type IconName = keyof typeof icons;
