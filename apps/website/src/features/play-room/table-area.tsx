import type { Play, PlayerId } from "game";
import { Crown } from "lucide-react";
import { PlayingCard } from "@/components/playing-card/playing-card";
import { describePlay, getPlayerMeta, type PlayerMeta } from "./play-room-view-model";

function TableArea({
  playerMetas,
  tablePlay,
  tablePlayedBy,
}: {
  playerMetas: readonly PlayerMeta[];
  tablePlay: Play | null;
  tablePlayedBy: PlayerId | null;
}) {
  const tableCards = tablePlay?.cards ?? [];
  const playedByName =
    tablePlayedBy === null ? null : getPlayerMeta(playerMetas, tablePlayedBy).name;

  return (
    <section
      className="grid min-h-0 content-center rounded-xl border bg-card/80 p-4 shadow-sm"
      aria-label="場のカード"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] leading-none font-extrabold text-primary uppercase">
            <Crown className="size-3.5 fill-current" aria-hidden="true" />
            Current trick
          </div>
          <h2 className="mt-1.5 text-lg leading-tight font-extrabold">
            {tablePlay === null ? "場は空です" : describePlay(tablePlay)}
          </h2>
        </div>
      </div>

      <div className="mt-5 grid justify-items-center gap-3">
        <div className="flex justify-center pl-5">
          {tableCards.length > 0 ? (
            tableCards.map((card, index) => (
              <PlayingCard
                key={card.id}
                rank={card.rank}
                suit={card.suit}
                size="md"
                tabIndex={-1}
                className="shadow-md"
                style={{ marginLeft: index === 0 ? 0 : -20, zIndex: index + 1 }}
              />
            ))
          ) : (
            <div className="grid h-36 w-24 place-items-center rounded-lg border border-dashed bg-muted/40 text-center text-xs leading-5 font-bold text-muted-foreground">
              空
            </div>
          )}
        </div>
        <p className="text-center text-[13px] leading-5 text-muted-foreground">
          {playedByName === null
            ? "最初のカードを待っています。"
            : `最後に出した人: ${playedByName}`}
        </p>
      </div>
    </section>
  );
}

export { TableArea };
