import type {
  KnownBlock,
  MrkdwnElement,
  RichTextList,
  RichTextSection,
} from "@slack/web-api";
import * as S from "@effect/schema/Schema";
import { Effect } from "effect";
import {
  LineItem,
  SubTransaction,
  Transaction,
} from "src/givebutter/transaction";
import slack from "src/slack";
import { getSupabaseClient } from "src/getSupabaseClient";
import { Campaign } from "src/givebutter/campaign";
import { Plan } from "src/givebutter/plan";
import { Ticket } from "src/givebutter/ticket";
import { FormatBlocksOptions } from "../src/FormatBlocksOptions";

function getDashboardContactUrl(contactId: string | number): string {
  return `https://dashboard.givebutter.com/accounts/119606/contacts/${contactId}`;
}

function mrkdwn(text: string): MrkdwnElement {
  return { type: "mrkdwn", text };
}

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "long",
  timeZone: "America/Los_Angeles",
});

function titleCase(s: string): string {
  return s
    .split(" ")
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatLineItem(
  item: S.Schema.Type<typeof LineItem>,
  tickets: readonly S.Schema.Type<typeof Ticket>[],
): RichTextList["elements"] {
  if (item.type === "donation" && item.subtype === "donation") {
    return [
      {
        type: "rich_text_section",
        elements: [
          {
            type: "emoji",
            name: "dollar",
          },
          {
            type: "text",
            text: `  $${item.total}`,
            style: { bold: true },
          },
          { type: "text", text: ` - ${item.description}` },
        ],
      },
    ];
  } else if (item.type === "item" && item.subtype === "ticket") {
    return [
      {
        type: "rich_text_section",
        elements: [
          {
            type: "emoji",
            name: "admission_tickets",
          },
          {
            type: "text",
            text: ` $${item.total}`,
            style: { bold: true },
          },
          {
            type: "text",
            text: ` - ${item.quantity}x $${item.price} ${item.description}`,
          },
          ...tickets.flatMap(formatTicket),
        ],
      },
    ];
  }
  return [];
}

function formatSubTransaction(
  sub: S.Schema.Type<typeof SubTransaction>,
  tickets: readonly S.Schema.Type<typeof Ticket>[],
): RichTextList["elements"] {
  return sub.line_items.flatMap((item) => formatLineItem(item, tickets));
}

function formatTicket(
  ticket: S.Schema.Type<typeof Ticket>,
): RichTextSection["elements"] {
  return [
    { type: "text", text: "\n" },
    {
      type: "text",
      text: ticket.name,
      style: { bold: true },
    },
    {
      type: "text",
      text: ` - ${ticket.email} - ${ticket.title}`,
    },
  ];
}

function formatBlocks({
  transaction: txn,
  campaign,
  plan,
  tickets,
}: FormatBlocksOptions) {
  const isAnonymous = txn.giving_space?.name === "Anonymous";
  const givingSpaceName = txn.giving_space?.name;
  const contactName = [txn.first_name, txn.last_name].filter(Boolean).join(" ");
  const txnName =
    contactName || txn.email || txn.phone || givingSpaceName || "";
  const shortName = txn.first_name || txnName.split(" ")[0];
  const name =
    !isAnonymous && givingSpaceName && givingSpaceName !== txnName
      ? `${txnName} (${givingSpaceName})`
      : txnName;
  const contactInfo = [contactName, txn.email, txn.phone].filter(Boolean);
  const headingLines = [
    `*$${txn.amount}* ${
      plan?.frequency ? `${titleCase(plan.frequency)} ` : ""
    }from <${getDashboardContactUrl(txn.contact_id)}|${name}>`,
  ];
  if (isAnonymous) {
    headingLines.push(
      `\n_*Note:* ${shortName} chose to keep their gift anonymous._`,
    );
  }
  const referenceNum = txn.transactions[0]?.id ?? txn.id;
  const sectionText = headingLines.join("\n");
  const blocks = [
    {
      type: "section",
      text: mrkdwn(sectionText),
    },
    {
      type: "section",
      fields: [
        `*Campaign:*\n${campaign?.title ?? "Unknown"}`,
        `*Reference #:*\n${referenceNum}`,
        `*Frequency:*\n${plan?.frequency ? ":calendar: " : ""}${titleCase(
          plan?.frequency ?? "One-time",
        )}`,
        `*Date:*\n${dateTimeFormat.format(new Date(txn.created_at))}`,
        `*Contact Information:*\n${contactInfo.join("\n")}`,
      ].map(mrkdwn),
    },
    {
      type: "rich_text",
      elements: [
        {
          type: "rich_text_list",
          style: "bullet",
          elements: txn.transactions.flatMap((sub) =>
            formatSubTransaction(sub, tickets),
          ),
        },
      ],
    },
    {
      type: "divider",
    },
  ] satisfies KnownBlock[];
  return { text: sectionText, blocks };
}

async function main() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("givebutter_transactions_pending_slack")
    .select(
      "id, created_at, updated_at, data, plan_data, campaign_data, tickets_data",
    );
  if (error) {
    console.error(error);
    throw error;
  }
  for (const row of data) {
    const info = await Effect.all({
      transaction: S.decodeUnknown(Transaction)(row.data),
      campaign: row.campaign_data
        ? S.decodeUnknown(Campaign)(row.campaign_data)
        : Effect.succeed(null),
      plan: row.plan_data
        ? S.decodeUnknown(Plan)(row.plan_data)
        : Effect.succeed(null),
      tickets: Effect.all(
        (row.tickets_data as unknown[]).map((data) =>
          S.decodeUnknown(Ticket)(data),
        ),
      ),
    }).pipe(Effect.runPromise);
    if (info.transaction.plan_id && !info.plan) {
      throw new Error(
        `Transaction ${info.transaction.id} references Plan ${info.transaction.plan_id} which has not yet been synchronized`,
      );
    }
    await slack.chat.postMessage({
      channel: "#givebutter",
      ...formatBlocks(info),
      unfurl_links: false,
      unfurl_media: false,
    });
    await supabase.from("givebutter_slack").insert({ id: row.id });
  }
}

main();
