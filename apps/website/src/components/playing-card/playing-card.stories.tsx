import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlayingCard } from "./playing-card";
import type { PlayingCardRank, PlayingCardSuit } from "./playing-card";

const ranks = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"] as const;
const suits = ["spades", "hearts", "diamonds", "clubs"] as const;

const meta = {
  title: "Components/PlayingCard",
  component: PlayingCard,
  args: {
    rank: "A",
    suit: "spades",
    size: "md",
  },
  argTypes: {
    rank: {
      control: "select",
      options: [...ranks, "JOKER"],
    },
    size: {
      control: "inline-radio",
      options: ["sm", "md", "lg"],
    },
    suit: {
      control: "select",
      options: [...suits, "joker"],
    },
  },
} satisfies Meta<typeof PlayingCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FaceDown: Story = {
  args: {
    faceDown: true,
  },
};

export const Selected: Story = {
  args: {
    selected: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const AllCards: Story = {
  render: () => (
    <div className="grid max-w-[760px] gap-4">
      {suits.map((suit) => (
        <div key={suit} className="flex flex-wrap gap-2">
          {ranks.map((rank) => (
            <PlayingCard key={`${suit}-${rank}`} rank={rank} size="sm" suit={suit} />
          ))}
        </div>
      ))}
      <PlayingCard rank="JOKER" size="sm" suit="joker" />
    </div>
  ),
};

export const Hand: Story = {
  render: () => {
    const hand: Array<{ rank: PlayingCardRank; selected?: boolean; suit: PlayingCardSuit }> = [
      { rank: "3", suit: "diamonds" },
      { rank: "8", selected: true, suit: "hearts" },
      { rank: "8", selected: true, suit: "spades" },
      { rank: "J", suit: "clubs" },
      { rank: "A", suit: "spades" },
      { rank: "2", suit: "hearts" },
      { rank: "JOKER", suit: "joker" },
    ];

    return (
      <div className="flex items-end px-8 py-6">
        {hand.map((card, index) => (
          <PlayingCard
            key={`${card.suit}-${card.rank}-${index}`}
            className={index === 0 ? "" : "-ml-10"}
            rank={card.rank}
            selected={card.selected}
            size="md"
            suit={card.suit}
            style={{ zIndex: index }}
          />
        ))}
      </div>
    );
  },
};
