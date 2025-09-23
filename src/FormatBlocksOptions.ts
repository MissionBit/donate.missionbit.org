import type * as S from "@effect/schema/Schema";
import type { Transaction } from "src/givebutter/transaction";
import type { Campaign } from "src/givebutter/campaign";
import type { Plan } from "src/givebutter/plan";
import type { Ticket } from "src/givebutter/ticket";
import type { Contact } from "./givebutter/contact";

export interface FormatBlocksOptions {
  readonly transaction: S.Schema.Type<typeof Transaction>;
  readonly campaign: S.Schema.Type<typeof Campaign> | null;
  readonly plan: S.Schema.Type<typeof Plan> | null;
  readonly tickets: readonly S.Schema.Type<typeof Ticket>[];
  readonly contact: S.Schema.Type<typeof Contact> | null;
}
