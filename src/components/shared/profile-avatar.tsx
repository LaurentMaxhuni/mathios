import { avatarGlyphs, avatarLabels, profileAvatars } from "@/features/profiles/schemas";

export function ProfileAvatar({
  avatar,
  size = "md",
}: {
  avatar: string;
  size?: "sm" | "md" | "lg";
}) {
  const safeAvatar = profileAvatars.includes(avatar as (typeof profileAvatars)[number])
    ? (avatar as (typeof profileAvatars)[number])
    : "orbit";
  const sizeClass =
    size === "lg"
      ? "h-16 w-16 text-2xl"
      : size === "sm"
        ? "h-9 w-9 text-base"
        : "h-12 w-12 text-xl";
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm ${sizeClass}`}
      title={avatarLabels[safeAvatar]}
      aria-label={`${avatarLabels[safeAvatar]} avatar`}
    >
      {avatarGlyphs[safeAvatar]}
    </span>
  );
}
