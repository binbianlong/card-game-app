import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type StandardSuit = "clubs" | "diamonds" | "hearts" | "spades";
type PlayingCardSuit = StandardSuit | "joker";
type StandardRank = "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";
type PlayingCardRank = StandardRank | "JOKER";
type PlayingCardSize = "xs" | "sm" | "md" | "lg";

type PlayingCardProps = Omit<ComponentPropsWithoutRef<"button">, "children"> & {
  faceDown?: boolean;
  rank?: PlayingCardRank;
  selected?: boolean;
  size?: PlayingCardSize;
  suit?: PlayingCardSuit;
};

const suitMeta = {
  clubs: { label: "クラブ", symbol: "♣", tone: "text-slate-950" },
  diamonds: { label: "ダイヤ", symbol: "♦", tone: "text-rose-600" },
  hearts: { label: "ハート", symbol: "♥", tone: "text-rose-600" },
  spades: { label: "スペード", symbol: "♠", tone: "text-slate-950" },
  joker: { label: "ジョーカー", symbol: "★", tone: "text-teal-700" },
} satisfies Record<PlayingCardSuit, { label: string; symbol: string; tone: string }>;

const sizeClassName = {
  xs: {
    card: "h-20 w-14 rounded-md px-1.5 py-1.5",
    corner: "text-xs leading-3",
    cornerSuit: "text-[11px] leading-3",
    centerRank: "text-xl",
    wideCenterRank: "text-base",
    wideCorner: "text-[10px] leading-3",
    centerSuit: "text-base",
  },
  sm: {
    card: "h-28 w-20 rounded-md px-2 py-2",
    corner: "text-[16px] leading-4",
    cornerSuit: "text-[14px] leading-4",
    centerRank: "text-3xl",
    wideCenterRank: "text-2xl",
    wideCorner: "text-sm leading-4",
    centerSuit: "text-xl",
  },
  md: {
    card: "h-36 w-24 rounded-lg px-2.5 py-2.5",
    corner: "text-lg leading-5",
    cornerSuit: "text-base leading-4",
    centerRank: "text-4xl",
    wideCenterRank: "text-3xl",
    wideCorner: "text-base leading-5",
    centerSuit: "text-2xl",
  },
  lg: {
    card: "h-44 w-30 rounded-lg px-3 py-3",
    corner: "text-xl leading-5",
    cornerSuit: "text-lg leading-5",
    centerRank: "text-5xl",
    wideCenterRank: "text-4xl",
    wideCorner: "text-lg leading-5",
    centerSuit: "text-3xl",
  },
} satisfies Record<
  PlayingCardSize,
  {
    card: string;
    centerRank: string;
    centerSuit: string;
    corner: string;
    cornerSuit: string;
    wideCenterRank: string;
    wideCorner: string;
  }
>;

function PlayingCard({
  "aria-label": ariaLabel,
  className,
  disabled,
  faceDown = false,
  rank = "A",
  selected = false,
  size = "md",
  suit = "spades",
  type = "button",
  ...props
}: PlayingCardProps) {
  const isJoker = rank === "JOKER" || suit === "joker";
  const visibleSuit = isJoker ? "joker" : suit;
  const visibleRank = isJoker ? "JOKER" : rank;
  const cornerRank = isJoker ? "J" : visibleRank;
  const isWideRank = cornerRank.length > 1;
  const meta = suitMeta[visibleSuit];
  const styles = sizeClassName[size];
  const label = faceDown ? "裏向きのカード" : `${meta.label}の${visibleRank}`;

  return (
    <button
      aria-label={ariaLabel ?? label}
      aria-pressed={selected}
      className={cn(
        "group relative isolate grid shrink-0 overflow-hidden border bg-card text-card-foreground shadow-sm outline-none transition",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-45",
        selected && "border-primary shadow-md ring-[3px] ring-primary/20 -translate-y-1",
        !selected && "border-slate-200 hover:-translate-y-0.5 hover:shadow-md",
        faceDown && "border-teal-800 bg-teal-700 text-primary-foreground",
        styles.card,
        className,
      )}
      data-face-down={faceDown}
      data-rank={visibleRank}
      data-selected={selected}
      data-suit={visibleSuit}
      disabled={disabled}
      type={type}
      {...props}
    >
      {faceDown ? (
        <CardBack />
      ) : (
        <CardFace
          cornerRank={cornerRank}
          isJoker={isJoker}
          isWideRank={isWideRank}
          meta={meta}
          rank={visibleRank}
          styles={styles}
        />
      )}
    </button>
  );
}

function CardFace({
  cornerRank,
  isJoker,
  isWideRank,
  meta,
  rank,
  styles,
}: {
  cornerRank: PlayingCardRank | "J";
  isJoker: boolean;
  isWideRank: boolean;
  meta: (typeof suitMeta)[PlayingCardSuit];
  rank: PlayingCardRank;
  styles: (typeof sizeClassName)[PlayingCardSize];
}) {
  return (
    <>
      <span className={cn("absolute top-2 left-2 grid justify-items-center font-black", meta.tone)}>
        <span
          className={cn(
            "whitespace-nowrap tabular-nums",
            isWideRank ? styles.wideCorner : styles.corner,
          )}
        >
          {cornerRank}
        </span>
        <span className={styles.cornerSuit}>{meta.symbol}</span>
      </span>

      <span className={cn("grid place-items-center gap-1 self-center font-black", meta.tone)}>
        <span
          className={cn(
            "whitespace-nowrap leading-none tracking-normal tabular-nums",
            isWideRank ? styles.wideCenterRank : styles.centerRank,
          )}
        >
          {isJoker ? "J" : rank}
        </span>
        <span className={cn("leading-none", styles.centerSuit)}>{meta.symbol}</span>
      </span>

      <span
        className={cn(
          "absolute right-2 bottom-2 grid rotate-180 justify-items-center font-black",
          meta.tone,
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "whitespace-nowrap tabular-nums",
            isWideRank ? styles.wideCorner : styles.corner,
          )}
        >
          {cornerRank}
        </span>
        <span className={styles.cornerSuit}>{meta.symbol}</span>
      </span>
    </>
  );
}

function CardBack() {
  return (
    <span className="absolute inset-1.5 rounded-[inherit] border border-white/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.22)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.22)_50%,rgba(255,255,255,0.22)_75%,transparent_75%,transparent)] bg-[length:14px_14px] shadow-inner">
      <span className="absolute inset-4 rounded-[inherit] border border-white/55" />
    </span>
  );
}

export { PlayingCard };
export type { PlayingCardProps, PlayingCardRank, PlayingCardSize, PlayingCardSuit };
