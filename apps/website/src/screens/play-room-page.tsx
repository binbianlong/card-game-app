import { Link, useSearch } from "@tanstack/react-router";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BattleStatus, PlayerArea, TableArea } from "@/features/play-room/play-room-sections";
import { usePlayRoomGame } from "@/features/play-room/use-play-room-game";

function PlayRoomPage() {
  const search = useSearch({ from: "/rooms/play" });
  const playerCount = search.players;
  const cpuCount = search.cpu;
  const {
    availableActions,
    clearSelection,
    opponents,
    passTurn,
    playerHand,
    playerMetas,
    playerRank,
    playerView,
    playSelectedCards,
    selectedCardIdSet,
    selectedCards,
    toggleCard,
  } = usePlayRoomGame({ cpuCount, playerCount });

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[430px] flex-col px-4 pt-[max(14px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))] sm:min-h-[min(820px,100svh)] sm:px-5 sm:pt-5 sm:pb-7">
      <header className="flex min-h-11 items-center justify-between gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="待機画面に戻る">
          <Link to="/rooms/waiting" search={{ players: playerCount, cpu: cpuCount }}>
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="text-sm font-bold">対戦中</div>
        <Button variant="ghost" size="icon" aria-label="メニュー">
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </Button>
      </header>

      <section className="grid flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 pt-3">
        <BattleStatus opponents={opponents} playerMetas={playerMetas} playerView={playerView} />
        <TableArea
          playerMetas={playerMetas}
          tablePlay={playerView.table.play}
          tablePlayedBy={playerView.table.playedBy}
        />
        <PlayerArea
          availableActions={availableActions}
          onClearSelection={clearSelection}
          onPass={passTurn}
          onPlaySelectedCards={playSelectedCards}
          onToggleCard={toggleCard}
          playerHand={playerHand}
          playerRank={playerRank}
          selectedCards={selectedCards}
          selectedCardIdSet={selectedCardIdSet}
        />
      </section>
    </main>
  );
}

export { PlayRoomPage };
