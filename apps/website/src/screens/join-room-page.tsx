import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogIn, Ticket, User } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStoredNickname } from "@/features/auth/nickname";
import { joinRoom as joinRoomRequest } from "@/features/rooms/room-api";

function JoinRoomPage() {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");
  const [playerName, setPlayerName] = useState(() => getStoredNickname() ?? "");
  const [status, setStatus] = useState<"idle" | "joining" | "error">("idle");

  const normalizedInviteCode = useMemo(
    () => inviteCode.trim().replace(/\s|-/g, "").toUpperCase(),
    [inviteCode],
  );
  const canSubmit =
    status !== "joining" && normalizedInviteCode.length > 0 && playerName.trim().length > 0;

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
    <main className="mx-auto flex min-h-svh w-full max-w-[430px] flex-col px-4 pt-[max(14px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))] sm:min-h-[min(820px,100svh)] sm:px-5 sm:pt-5 sm:pb-7">
      <header className="flex min-h-11 items-center justify-between gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="ホームに戻る">
          <Link to="/">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="text-sm font-bold">ルーム参加</div>
        <div className="size-9" aria-hidden="true" />
      </header>

      <section className="pt-8 pb-5" aria-labelledby="join-room-title">
        <p className="mb-2 text-xs font-extrabold text-primary uppercase">Join room</p>
        <h1 id="join-room-title" className="text-3xl leading-tight font-extrabold">
          招待コードで参加
        </h1>
        <p className="mt-3 max-w-[24em] text-[15px] leading-7 text-muted-foreground">
          ホストから共有されたコードを入力して、待機中のルームに入室します。
        </p>
      </section>

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
              placeholder="あなたの名前"
              value={playerName}
            />
          </CardContent>
        </Card>

        <Card className="border-primary/25 bg-primary/5 shadow-none">
          <CardContent className="grid gap-3 px-4 py-4">
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
          </CardContent>
        </Card>
      </form>
    </main>
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
      <input
        id={inputId}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="mt-3 h-11 w-full rounded-md border bg-background px-3 text-base font-bold outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
    </div>
  );
}

export { JoinRoomPage };
