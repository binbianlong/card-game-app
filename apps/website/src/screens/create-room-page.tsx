import { useNavigate } from "@tanstack/react-router";
import { Bot, Minus, Plus, Users, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { SettingField } from "@/components/form/setting-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, PageIntro, PageShell } from "@/components/page-layout";
import { useNickname } from "@/features/auth/nickname";
import { defaultLocalRuleSettings } from "@/features/local-rules/local-rule-options";
import { saveRoomConnectionToken } from "@/features/rooms/connection-token";
import { createRoom as createRoomRequest } from "@/features/rooms/room-api";

const minPlayers = 3;
const maxPlayers = 6;

function CreateRoomPage() {
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState(4);
  const [cpuCount, setCpuCount] = useState(1);
  const [status, setStatus] = useState<"idle" | "creating" | "error">("idle");

  const humanCount = playerCount - cpuCount;
  const maxCpuCount = playerCount - 1;
  const { displayName: playerName } = useNickname();

  const roomSummary = useMemo(
    () => [
      { label: "対戦人数", value: `${playerCount}人` },
      { label: "CPU", value: `${cpuCount}人` },
      { label: "参加枠", value: `${humanCount}人` },
    ],
    [cpuCount, humanCount, playerCount],
  );

  function updatePlayerCount(nextValue: number) {
    const nextPlayerCount = clamp(nextValue, minPlayers, maxPlayers);

    setPlayerCount(nextPlayerCount);
    setCpuCount((currentCpuCount) => clamp(currentCpuCount, 0, nextPlayerCount - 1));
  }

  function updateCpuCount(nextValue: number) {
    setCpuCount(clamp(nextValue, 0, maxCpuCount));
  }

  async function createRoom() {
    setStatus("creating");

    try {
      const data = await createRoomRequest({
        playerName,
        playerCount,
        cpuCount,
        rules: defaultLocalRuleSettings,
      });
      saveRoomConnectionToken({
        cpuCount: data.room.participants.filter((participant) => participant.kind === "cpu").length,
        connectionToken: data.connectionToken,
        isHost: true,
        playerId: data.room.hostPlayerId,
        playerCount: data.room.playerCount,
        roomId: data.room.id,
      });

      await navigate({
        to: "/rooms/waiting",
        search: {
          roomId: data.room.id,
          playerId: data.room.hostPlayerId,
        },
      });
    } catch {
      setStatus("error");
    }
  }

  return (
    <PageShell>
      <PageHeader backLabel="ホームに戻る" backTo="/" title="ルーム作成" />
      <PageIntro
        description="対戦人数とCPUの人数を決めて、新しい対戦ルームを準備します。"
        eyebrow="Create room"
        title="ルームを作成"
        titleId="create-room-title"
      />

      <form className="grid flex-1 content-start gap-4" aria-label="ルーム作成フォーム">
        <Card>
          <CardHeader className="px-4 pt-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-primary" aria-hidden="true" />
              対戦設定
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 px-4 pb-4">
            <NumberSetting
              description={`${minPlayers}人から${maxPlayers}人まで選べます。`}
              Icon={Users}
              label="対戦人数"
              max={maxPlayers}
              min={minPlayers}
              onChange={updatePlayerCount}
              value={playerCount}
            />
            <NumberSetting
              description="最低1人はプレイヤー参加枠として残します。"
              Icon={Bot}
              label="CPUにする人数"
              max={maxCpuCount}
              min={0}
              onChange={updateCpuCount}
              value={cpuCount}
            />
          </CardContent>
        </Card>

        <Card className="border-primary/25 bg-primary/5 shadow-none">
          <CardContent className="grid gap-3 px-4 py-4">
            <div className="grid grid-cols-3 gap-2">
              {roomSummary.map((item) => (
                <div key={item.label} className="rounded-lg bg-card p-3 text-center shadow-xs">
                  <div className="text-[11px] leading-none font-bold text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="mt-2 text-lg leading-none font-extrabold">{item.value}</div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              size="lg"
              className="h-12 w-full text-base font-bold"
              disabled={status === "creating"}
              onClick={createRoom}
            >
              {status === "creating" ? "作成中" : "作成する"}
            </Button>
            {status === "error" ? (
              <p className="text-center text-[13px] leading-5 font-bold text-destructive">
                ルームを作成できませんでした。
              </p>
            ) : null}
          </CardContent>
        </Card>
      </form>
    </PageShell>
  );
}

function NumberSetting({
  description,
  Icon,
  label,
  max,
  min,
  onChange,
  value,
}: {
  description: string;
  Icon: LucideIcon;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  const inputId = `${label}-input`;

  return (
    <SettingField description={description} Icon={Icon} inputId={inputId} label={label}>
      <div className="mt-3 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`${label}を減らす`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus className="size-4" aria-hidden="true" />
        </Button>
        <Input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
          className="h-11 bg-background text-center text-lg font-extrabold md:text-lg"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`${label}を増やす`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </SettingField>
  );
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

export { CreateRoomPage };
