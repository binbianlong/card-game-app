import type { GameRuleSettings, RoomClientState } from "schema";
import type { LocalRuleKey } from "@/features/local-rules/local-rule-options";
import { LocalRuleSettings } from "./local-rule-settings";
import { ParticipantList } from "./participant-list";
import type { ConnectionStatus } from "./use-waiting-room-socket";
import { WaitingRoomActions } from "./waiting-room-actions";
import { WaitingRoomSummary } from "./waiting-room-summary";

type WaitingRoomViewProps = {
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
  isConnected: boolean;
  isReadyToStart: boolean;
  localRules: GameRuleSettings;
  onToggleReady: () => void;
  onStartGame: () => void;
  onToggleLocalRule: (ruleKey: LocalRuleKey) => void;
  playerId: string;
  room: RoomClientState | null;
};

function WaitingRoomView({
  connectionStatus,
  errorMessage,
  isConnected,
  isReadyToStart,
  localRules,
  onStartGame,
  onToggleReady,
  onToggleLocalRule,
  playerId,
  room,
}: WaitingRoomViewProps) {
  const participants = room?.participants ?? [];
  const playerCount = room?.playerCount ?? 0;
  const waitingCount = Math.max(playerCount - participants.length, 0);
  const currentParticipant = participants.find((participant) => participant.id === playerId);
  const isHost = room?.hostPlayerId === playerId;
  const isCurrentPlayerReady = currentParticipant?.ready === true;
  const canToggleReady =
    isConnected && currentParticipant !== undefined && room?.status === "waiting";

  return (
    <section className="grid flex-1 content-start gap-4" aria-label="ルーム待機画面">
      <WaitingRoomSummary
        connectionStatus={connectionStatus}
        errorMessage={errorMessage}
        participantCount={participants.length}
        playerCount={playerCount}
        room={room}
        waitingCount={waitingCount}
      />
      <LocalRuleSettings
        disabled={!isHost || !isConnected || room?.status !== "waiting"}
        isHost={isHost}
        localRules={localRules}
        onToggleLocalRule={onToggleLocalRule}
      />
      <ParticipantList participants={participants} />
      <WaitingRoomActions
        canToggleReady={canToggleReady}
        isCurrentPlayerReady={isCurrentPlayerReady}
        isHost={isHost}
        isReadyToStart={isReadyToStart}
        onStartGame={onStartGame}
        onToggleReady={onToggleReady}
        waitingCount={waitingCount}
      />
    </section>
  );
}

export { WaitingRoomView };
