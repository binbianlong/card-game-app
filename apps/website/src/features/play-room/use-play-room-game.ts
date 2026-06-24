import { createClientEvent } from "schema";
import { useRoomSocket } from "@/features/room-socket/use-room-socket";
import { usePlayRoomViewModel } from "./play-room-view-model";
import { usePlayerCardSelection } from "./use-player-card-selection";

function usePlayRoomGame({
  connectionToken,
  playerId,
  roomId,
}: {
  connectionToken: string;
  playerId: string;
  roomId: string;
}) {
  const { errorMessage, isReconnectRequired, room, sendEvent } = useRoomSocket({
    connectionToken,
    invalidMessage: "ゲーム状態を読み取れませんでした。",
    playerId,
    roomId,
  });
  const viewModel = usePlayRoomViewModel({ playerId, room });
  const selection = usePlayerCardSelection({
    gameState: viewModel.gameState,
    playerHand: viewModel.playerHand,
  });

  function playSelectedCards() {
    sendEvent(
      createClientEvent.playCards({
        roomId,
        playerId,
        cardIds: selection.selectedCardIds,
      }),
    );
    selection.clearSelection();
  }

  function passTurn() {
    sendEvent(createClientEvent.pass({ roomId, playerId }));
    selection.clearSelection();
  }

  function startRematch() {
    sendEvent(createClientEvent.rematch({ roomId, playerId }));
    selection.clearSelection();
  }

  function toggleReady() {
    sendEvent(
      createClientEvent.setReady({
        roomId,
        playerId,
        ready: !viewModel.isCurrentPlayerReady,
      }),
    );
  }

  function leaveRoom() {
    sendEvent(createClientEvent.leaveRoom({ roomId, playerId }));
  }

  return {
    availableActions: selection.availableActions,
    canStartRematch: viewModel.canStartRematch,
    clearSelection: selection.clearSelection,
    errorMessage,
    finalResults: viewModel.finalResults,
    isCurrentPlayerReady: viewModel.isCurrentPlayerReady,
    isReconnectRequired,
    isReadyToStartRematch: viewModel.isReadyToStartRematch,
    leaveRoom,
    opponents: viewModel.opponents,
    passTurn,
    playerHand: viewModel.playerHand,
    playableCardIdSet: selection.playableCardIdSet,
    playerMetas: viewModel.playerMetas,
    playerRank: viewModel.playerRank,
    playerView: viewModel.playerView,
    playSelectedCards,
    selectedCardIdSet: selection.selectedCardIdSet,
    selectedCards: selection.selectedCards,
    startRematch,
    toggleCard: selection.toggleCard,
    toggleReady,
  };
}

export { usePlayRoomGame };
