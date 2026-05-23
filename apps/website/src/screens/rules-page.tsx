import { Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Handshake, Layers3, RotateCcw, Scissors, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const localRules = [
  {
    key: "eightCut",
    title: "8切り",
    summary: "8を含む手を出すと場が流れ、出したプレイヤーから続行します。",
    icon: Scissors,
  },
  {
    key: "revolution",
    title: "革命",
    summary: "4枚以上の同じ数字のカードを出すと、カードの強さが反転します。",
    icon: RotateCcw,
  },
  {
    key: "sequence",
    title: "階段",
    summary: "同じマークのカード3枚以上の連番をまとめて出せます。2は階段に使えません。",
    icon: Layers3,
  },
  {
    key: "suitLock",
    title: "縛り",
    summary: "同じマークのカード構成が続くと、その場が流れるまで同じ構成しか出せません。",
    icon: Shield,
  },
  {
    key: "cardExchange",
    title: "カード交換",
    summary:
      "次の対戦の前に、大貧民は手札で一番強いカードを大富豪に渡します。大富豪は手札からいらないカードを1枚選んで返します。",
    icon: Handshake,
  },
] as const;

function RulesPage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[430px] flex-col px-4 pt-[max(14px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))] sm:min-h-[min(820px,100svh)] sm:px-5 sm:pt-5 sm:pb-7">
      <header className="flex min-h-11 items-center justify-between gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="ホームに戻る">
          <Link to="/">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="text-sm font-bold">ルール</div>
        <div className="size-9" aria-hidden="true" />
      </header>

      <section className="pt-8 pb-5" aria-labelledby="rules-title">
        <p className="mb-2 text-xs font-extrabold text-primary uppercase">Game rules</p>
        <h1 id="rules-title" className="text-3xl leading-tight font-extrabold">
          ルールを確認
        </h1>
        <p className="mt-3 max-w-[24em] text-[15px] leading-7 text-muted-foreground">
          大富豪の基本ルールと、ルームごとに選べるローカルルールを確認できます。
        </p>
      </section>

      <section className="grid gap-3" aria-label="基本ルール">
        <Card>
          <CardHeader className="px-4 pt-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4 text-primary" aria-hidden="true" />
              基本ルール
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 px-4 pb-4">
            <RulePoint
              title="カードの強さ"
              text="通常時は 3 が最弱、2 が最強です。JOKER はさらに強いカードとして扱います。"
            />
            <RulePoint title="勝利条件" text="手札をすべて出した順に順位が決まります。" />
            <RulePoint
              title="順位の呼び方"
              text="1位の人を大富豪、最下位の人を大貧民と呼びます。"
            />
            <RulePoint
              title="出せる条件"
              text="前の手と同じ枚数で、前の手より強いカードを出します。"
            />
            <RulePoint
              title="パス"
              text="前の手に勝てるカードを出せない、または出したくない場合はパスできます。"
            />
            <RulePoint
              title="場が流れる条件"
              text="全員がパスすると場が流れ、最後にカードを出した人から始まります。"
            />
          </CardContent>
        </Card>
      </section>

      <section className="mt-5" aria-labelledby="local-rules-title">
        <Card>
          <CardHeader className="px-4 pt-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span id="local-rules-title">ローカルルール</span>
            </CardTitle>
            <p className="text-[13px] leading-5 text-muted-foreground">
              ルーム作成時に採用するか選べる追加ルールです。
            </p>
          </CardHeader>

          <CardContent className="grid gap-2.5 px-4 pb-4">
            {localRules.map((rule) => {
              const Icon = rule.icon;

              return (
                <Card key={rule.key} className="border-primary/15 bg-card/90 shadow-none">
                  <CardContent className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 p-3.5">
                    <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base leading-snug font-bold">{rule.title}</h3>
                      <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
                        {rule.summary}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function RulePoint({ text, title }: { text: string; title: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <div className="text-sm font-bold">{title}</div>
      <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

export { RulesPage };
