import { useNavigate, useSearch } from "@tanstack/react-router";
import type { GameRuleSettings } from "schema";
import { BookOpen } from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LocalRuleContent } from "@/features/local-rules/local-rule-content";
import { localRuleOptions } from "@/features/local-rules/local-rule-options";
import {
  BattleStatus,
  FinishedGameResults,
  PlayerArea,
  TableArea,
} from "@/features/play-room/play-room-sections";
import { usePlayRoomGame } from "@/features/play-room/use-play-room-game";
import { resolveRoomConnection } from "@/features/rooms/connection-token";
import { ReconnectRequiredPage } from "./reconnect-required-page";

function PlayRoomPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/rooms/play" });
  const { connectionToken, hasConnectionToken, playerId, roomId } = resolveRoomConnection(search);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const {
    availableActions,
    canStartRematch,
    clearSelection,
    errorMessage,
    finalResults,
    isReconnectRequired,
    leaveRoom,
    opponents,
    passTurn,
    playerHand,
    playableCardIdSet,
    playerMetas,
    playerRank,
    playerView,
    playSelectedCards,
    selectedCardIdSet,
    selectedCards,
    startRematch,
    toggleCard,
  } = usePlayRoomGame({ connectionToken, playerId, roomId });
  const localRules = playerView.rules;

  function exitRoom() {
    leaveRoom();
    void navigate({ to: "/" });
  }

  return (
    <PageShell className="pb-[max(20px,env(safe-area-inset-bottom))]">
      <header className="flex min-h-11 items-center justify-between gap-3">
        <div className="size-9" aria-hidden="true" />
        <div className="text-sm font-bold">対戦中</div>
        <div>
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
        </div>
      </header>

      <ActiveLocalRulesModal open={isRulesOpen} rules={localRules} onOpenChange={setIsRulesOpen} />

      {hasConnectionToken && !isReconnectRequired && errorMessage !== null ? (
        <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-center text-[13px] leading-5 font-bold text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {!hasConnectionToken || isReconnectRequired ? (
        <ReconnectRequiredPage />
      ) : playerView.phase === "finished" ? (
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
            playableCardIdSet={playableCardIdSet}
            playerRank={playerRank}
            selectedCards={selectedCards}
            selectedCardIdSet={selectedCardIdSet}
          />
        </section>
      )}
    </PageShell>
  );
}

function ActiveLocalRulesModal({
  onOpenChange,
  open,
  rules,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  rules: GameRuleSettings;
}) {
  const enabledRules = localRuleOptions.filter((rule) => rules[rule.key]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[390px]">
        <DialogHeader className="pr-8 text-left">
          <div className="flex items-center gap-2 text-[11px] leading-none font-extrabold text-primary uppercase">
            <BookOpen className="size-3.5" aria-hidden="true" />
            Local rules
          </div>
          <DialogTitle className="text-lg leading-tight font-bold">採用中のルール</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          {enabledRules.length > 0 ? (
            enabledRules.map((rule) => {
              const Icon = rule.Icon;

              return (
                <div
                  key={rule.key}
                  className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 rounded-lg border bg-card p-3"
                >
                  <LocalRuleContent
                    description={rule.description}
                    Icon={Icon}
                    label={rule.label}
                    variant="compact"
                  />
                </div>
              );
            })
          ) : (
            <div className="rounded-lg bg-muted/60 p-3 text-sm font-bold text-muted-foreground">
              採用中のローカルルールはありません。
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { PlayRoomPage };
