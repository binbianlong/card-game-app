import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import type { GameRuleSettings } from "schema";
import { ArrowLeft, BookOpen, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { localRuleOptions } from "@/features/local-rules/local-rule-options";
import {
  BattleStatus,
  FinishedGameResults,
  PlayerArea,
  TableArea,
} from "@/features/play-room/play-room-sections";
import { usePlayRoomGame } from "@/features/play-room/use-play-room-game";
import { getRoomConnectionToken } from "@/features/rooms/connection-token";

function PlayRoomPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/rooms/play" });
  const playerCount = search.players;
  const cpuCount = search.cpu;
  const roomId = search.roomId ?? "";
  const playerId = search.playerId ?? "";
  const connectionToken =
    roomId.length === 0 || playerId.length === 0
      ? ""
      : getRoomConnectionToken({ playerId, roomId });
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const localRules = useMemo(
    () => ({
      eightCut: search.eightCut,
      elevenBack: search.elevenBack,
      revolution: search.revolution,
      sequence: search.sequence,
      suitLock: search.suitLock,
    }),
    [search.eightCut, search.elevenBack, search.revolution, search.sequence, search.suitLock],
  );
  const {
    availableActions,
    canStartRematch,
    clearSelection,
    errorMessage,
    finalResults,
    leaveRoom,
    opponents,
    passTurn,
    playerHand,
    playerMetas,
    playerRank,
    playerView,
    playSelectedCards,
    selectedCardIdSet,
    selectedCards,
    startRematch,
    toggleCard,
  } = usePlayRoomGame({ connectionToken, cpuCount, playerCount, playerId, roomId });

  function exitRoom() {
    leaveRoom();
    void navigate({ to: "/" });
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[430px] flex-col px-4 pt-[max(14px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))] sm:min-h-[min(820px,100svh)] sm:px-5 sm:pt-5 sm:pb-7">
      <header className="flex min-h-11 items-center justify-between gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="待機画面に戻る">
          <Link
            to="/rooms/waiting"
            search={{ players: playerCount, cpu: cpuCount, roomId, playerId }}
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="text-sm font-bold">対戦中</div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="採用中のローカルルールを確認"
          aria-expanded={isRulesOpen}
          onClick={() => setIsRulesOpen((currentValue) => !currentValue)}
        >
          <BookOpen className="size-5" aria-hidden="true" />
        </Button>
      </header>

      {isRulesOpen ? (
        <ActiveLocalRulesModal rules={localRules} onClose={() => setIsRulesOpen(false)} />
      ) : null}

      {errorMessage !== null ? (
        <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-center text-[13px] leading-5 font-bold text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {playerView.phase === "finished" ? (
        <FinishedGameResults
          canStartRematch={canStartRematch}
          finalResults={finalResults}
          onLeaveRoom={exitRoom}
          onStartRematch={startRematch}
          playerId={playerId}
        />
      ) : (
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
      )}
    </main>
  );
}

function ActiveLocalRulesModal({
  onClose,
  rules,
}: {
  onClose: () => void;
  rules: GameRuleSettings;
}) {
  const enabledRules = localRuleOptions.filter((rule) => rules[rule.key]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-local-rules-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="採用中のローカルルールを閉じる"
        onClick={onClose}
      />
      <Card className="relative w-full max-w-[390px] py-0 shadow-lg">
        <CardContent className="grid gap-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] leading-none font-extrabold text-primary uppercase">
                <BookOpen className="size-3.5" aria-hidden="true" />
                Local rules
              </div>
              <h2 id="active-local-rules-title" className="mt-1.5 text-lg leading-tight font-bold">
                採用中のルール
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="採用中のローカルルールを閉じる"
              onClick={onClose}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="grid gap-2">
            {enabledRules.length > 0 ? (
              enabledRules.map((rule) => {
                const Icon = rule.Icon;

                return (
                  <div
                    key={rule.key}
                    className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 rounded-lg border bg-card p-3"
                  >
                    <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm leading-snug font-bold">{rule.label}</div>
                      <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                        {rule.description}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg bg-muted/60 p-3 text-sm font-bold text-muted-foreground">
                採用中のローカルルールはありません。
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { PlayRoomPage };
