import { Effect } from "effect";
import * as S from "@effect/schema/Schema";
import { describe, expect, it } from "vitest";
import { GetPlansResponse } from "./plan";

const EXAMPLE_PLANS_RESPONSE: S.Schema.To<typeof GetPlansResponse> = {
  data: [
    {
      id: "VV2WktbU5v9bkzIH",
      first_name: "Robert",
      last_name: "Ippolito",
      email: "bob@redivi.com",
      phone: "+14155551212",
      frequency: "monthly",
      status: "active",
      method: "paypal",
      amount: 10,
      fee_covered: "0.61",
      created_at: "2023-11-24 18:30:47",
      start_at: "2023-11-24 18:30:47",
      next_bill_date: "2023-12-24 00:00:00",
    },
  ],
  links: {
    first: "https://api.givebutter.com/v1/plans?page=1",
    last: "https://api.givebutter.com/v1/plans?page=1",
    prev: null,
    next: null,
  },
  meta: {
    current_page: 1,
    from: 1,
    last_page: 1,
    links: [
      {
        url: null,
        label: "&laquo; Previous",
        active: false,
      },
      {
        url: "https://api.givebutter.com/v1/plans?page=1",
        label: "1",
        active: true,
      },
      {
        url: null,
        label: "Next &raquo;",
        active: false,
      },
    ],
    path: "https://api.givebutter.com/v1/plans",
    per_page: 20,
    to: 1,
    total: 1,
  },
};

describe("GetPlansResponse", () => {
  it("parses EXAMPLE_PLANS_RESPONSE", async () => {
    expect(
      await Effect.runPromise(
        S.parse(GetPlansResponse)(EXAMPLE_PLANS_RESPONSE),
      ),
    ).toEqual(EXAMPLE_PLANS_RESPONSE);
  });
});
