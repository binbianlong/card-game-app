import { useNavigate } from "@tanstack/react-router";
import { LogIn, Ticket, User } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, PageIntro, PageShell } from "@/components/page-layout";
import { authClient } from "@/features/auth/auth-client";
import { LoginButton } from "@/features/auth/login-button";
import { getStoredNickname } from "@/features/auth/nickname";
import { saveRoomConnectionToken } from "@/features/rooms/connection-token";
import { joinRoom as joinRoomRequest } from "@/features/rooms/room-api";

function JoinRoomPage() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const [inviteCode, setInviteCode] = useState("");
  const [playerName, setPlayerName] = useState(() => getStoredNickname() ?? "");
  const [status, setStatus] = useState<"idle" | "joining" | "error">("idle");
  const isLoggedOut = !session.isPending && (session.data === null || session.data === undefined);

  const normalizedInviteCode = useMemo(
    () => inviteCode.trim().replace(/\s|-/g, "").toUpperCase(),
    [inviteCode],
  );
  const canSubmit = status !== "joining" && normalizedInviteCode.length > 0;

  async function joinRoom() {
    if (!canSubmit) {
      return;
    }

    setStatus("joining");

    try {
      const data = await joinRoomRequest({
        inviteCode: normalizedInviteCode,
        playerName: playerName.trim(),
      });
      saveRoomConnectionToken({
        connectionToken: data.connectionToken,
        playerId: data.playerId,
        roomId: data.room.id,
      });

      await navigate({
        to: "/rooms/waiting",
        search: {
          players: data.room.playerCount,
          cpu: data.room.participants.filter((participant) => participant.kind === "cpu").length,
          roomId: data.room.id,
          playerId: data.playerId,
        },
      });
    } catch {
      setStatus("error");
    }
  }

  return (
    <PageShell>
      <PageHeader backLabel="ホームに戻る" backTo="/" title="ルーム参加" />
      <PageIntro
        description="ホストから共有されたコードを入力して、待機中のルームに入室します。"
        eyebrow="Join room"
        title="招待コードで参加"
        titleId="join-room-title"
      />

      <form
        className="grid flex-1 content-start gap-4"
        aria-label="ルーム参加フォーム"
        onSubmit={(event) => {
          event.preventDefault();
          void joinRoom();
        }}
      >
        <Card>
          <CardHeader className="px-4 pt-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <LogIn className="size-4 text-primary" aria-hidden="true" />
              参加情報
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 px-4 pb-4">
            <TextSetting
              description="英数字の招待コードを入力します。"
              icon={<Ticket className="size-5" aria-hidden="true" />}
              label="招待コード"
              onChange={(value) => {
                setInviteCode(value);
                setStatus("idle");
              }}
              placeholder="例: 8QJ4"
              value={inviteCode}
            />
            <TextSetting
              description="待機室に表示する名前です。"
              icon={<User className="size-5" aria-hidden="true" />}
              label="プレイヤー名"
              onChange={(value) => {
                setPlayerName(value);
                setStatus("idle");
              }}
              placeholder="未設定"
              value={playerName}
            />
          </CardContent>
        </Card>

        {isLoggedOut ? (
          <Card className="border-destructive/30 bg-destructive/5 shadow-none">
            <CardContent className="grid gap-3 px-4 py-4">
              <p className="text-center text-[13px] leading-5 font-bold text-destructive">
                未ログインだと、再参加ができません。
              </p>
              <LoginButton
                className="h-12 w-full text-base font-bold"
                isPending={session.isPending}
                size="lg"
              />
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-3">
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full text-base font-bold"
            disabled={!canSubmit}
          >
            {status === "joining" ? "参加中" : "参加する"}
          </Button>
          {status === "error" ? (
            <p className="text-center text-[13px] leading-5 font-bold text-destructive">
              ルームに参加できませんでした。
            </p>
          ) : null}
        </div>
      </form>
    </PageShell>
  );
}

function TextSetting({
  description,
  icon,
  label,
  onChange,
  placeholder,
  value,
}: {
  description: string;
  icon: ReactNode;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const inputId = `${label}-input`;

  return (
    <div className="rounded-lg border bg-card p-3.5">
      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <label htmlFor={inputId} className="text-base leading-snug font-bold">
            {label}
          </label>
          <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <Input
        id={inputId}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="mt-3 h-11 bg-background text-base font-bold md:text-base"
      />
    </div>
  );
}

export { JoinRoomPage };
