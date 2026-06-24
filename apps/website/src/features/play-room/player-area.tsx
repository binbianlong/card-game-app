import type { AvailableGameActions, Card as GameCard } from "game";
import { BookOpen, Check, CircleSlash, Hand, Send } from "lucide-react";
import { PlayingCard } from "@/components/playing-card/playing-card";
import { Button } from "@/components/ui/button";

function PlayerArea({
  availableActions,
  isRulesOpen,
  onClearSelection,
  onOpenRules,
  onPass,
  onPlaySelectedCards,
  onToggleCard,
  playerHand,
  playableCardIdSet,
  playerRank,
  selectedCards,
  selectedCardIdSet,
}: {
  availableActions: AvailableGameActions;
  isRulesOpen?: boolean;
  onClearSelection: () => void;
  onOpenRules?: () => void;
  onPass: () => void;
  onPlaySelectedCards: () => void;
  onToggleCard: (cardId: string) => void;
  playerHand: readonly GameCard[];
  playableCardIdSet: ReadonlySet<string>;
  playerRank: number | null;
  selectedCards: readonly GameCard[];
  selectedCardIdSet: ReadonlySet<string>;
}) {
  const hasSelection = selectedCards.length > 0;
  const hasFinished = playerHand.length === 0 && playerRank !== null;

  return (
    <section className="grid gap-3" aria-label="あなたの手札">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Hand className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <h2 className="text-base leading-tight font-extrabold">あなたの手札</h2>
              {onOpenRules === undefined ? null : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="採用中のローカルルールを確認"
                  aria-expanded={isRulesOpen}
                  onClick={onOpenRules}
                >
                  <BookOpen className="size-4" aria-hidden="true" />
                </Button>
              )}
            </div>
            <p className="text-[13px] leading-5 text-muted-foreground">
              {hasFinished
                ? `${playerRank}位で上がり`
                : `${playerHand.length}枚中 ${selectedCards.length}枚選択`}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!hasSelection}
          onClick={onClearSelection}
        >
          解除
        </Button>
      </div>

      <div className="overflow-x-auto pt-2 pb-1">
        <div className="flex min-w-max items-end pl-1 pr-4">
          {playerHand.length > 0 ? (
            playerHand.map((card, index) => (
              <PlayingCard
                key={card.id}
                rank={card.rank}
                suit={card.suit}
                selected={selectedCardIdSet.has(card.id)}
                size="sm"
                disabled={!playableCardIdSet.has(card.id)}
                onClick={() => onToggleCard(card.id)}
                className="shadow-md"
                style={{ marginLeft: index === 0 ? 0 : -12, zIndex: index + 1 }}
              />
            ))
          ) : (
            <div className="grid h-28 w-20 place-items-center rounded-md border border-dashed bg-muted/40 text-center text-xs leading-5 font-bold text-muted-foreground">
              手札なし
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1.2fr] gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 text-base font-bold"
          disabled={!availableActions.canPass}
          onClick={onPass}
        >
          <CircleSlash className="size-4" aria-hidden="true" />
          パス
        </Button>
        <Button
          type="button"
          size="lg"
          className="h-12 text-base font-bold"
          disabled={!availableActions.canPlaySelectedCards}
          onClick={onPlaySelectedCards}
        >
          {hasSelection ? (
            <Send className="size-4" aria-hidden="true" />
          ) : (
            <Check className="size-4" aria-hidden="true" />
          )}
          出す
        </Button>
      </div>
    </section>
  );
}

export { PlayerArea };
