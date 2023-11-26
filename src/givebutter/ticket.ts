import * as S from "@effect/schema/Schema";
import { PaginatedResponse } from "./pagination";

export const Ticket = S.struct({
  id: S.string,
  id_suffix: S.string,
  transaction_id: S.string,
  name: S.string,
  first_name: S.string,
  last_name: S.string,
  email: S.string,
  phone: S.nullable(S.string),
  title: S.string,
  description: S.nullable(S.string),
  price: S.number,
  pdf: S.string,
  checked_in_at: S.nullable(S.string),
  created_at: S.string,
});

export const TicketsResponse = PaginatedResponse(Ticket);

export function getTicketsUrl() {
  return ["https://api.givebutter.com/v1/tickets", Ticket] as const;
}

export const EXAMPLE_TICKETS_RESPONSE: S.Schema.To<typeof TicketsResponse> = {
  data: [
    // Example tickets censored for privacy
    {
      id: "81347746A0020",
      id_suffix: "A0020",
      transaction_id: "YLdFHoavm2jSiNN3",
      name: "Brooke Richards",
      first_name: "Brooke",
      last_name: "Richards",
      email: "arichards@missionbit.org",
      phone: null,
      title: "General Admission",
      description: null,
      price: 25,
      pdf: "https://givebutter.s3.amazonaws.com/documents/12c2b212de38c18f1e67c90cf1b877b3.pdf?X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIARTZG2UEJ6WQG5QO7%2F20231124%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20231124T205912Z&X-Amz-SignedHeaders=host&X-Amz-Expires=86400&X-Amz-Signature=a0655b6871ed63e01092aab4e251eadea6922ff0aa84f94094dc24c7b76c2df6",
      checked_in_at: null,
      created_at: "2023-11-18T04:31:32+00:00",
    },
    {
      id: "80270576A0019",
      id_suffix: "A0019",
      transaction_id: "XSxwZhmqU84DGBKY",
      name: "Brent Gannetta",
      first_name: "Brent",
      last_name: "Gannetta",
      email: "bgannetta@missionbit.org",
      phone: null,
      title: "General Admission",
      description: null,
      price: 25,
      pdf: "https://givebutter.s3.amazonaws.com/documents/bfb0d491d2845070104f91b969c9987e.pdf?X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIARTZG2UEJ6WQG5QO7%2F20231124%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20231124T205912Z&X-Amz-SignedHeaders=host&X-Amz-Expires=86400&X-Amz-Signature=9fd44eb01c3f56770c964d0671c327a555ae4f9c4cf2317ea9823a804537d944",
      checked_in_at: null,
      created_at: "2023-11-18T04:30:49+00:00",
    },
  ],
  links: {
    first: "https://api.givebutter.com/v1/tickets?page=1",
    last: "https://api.givebutter.com/v1/tickets?page=2",
    prev: null,
    next: "https://api.givebutter.com/v1/tickets?page=2",
  },
  meta: {
    current_page: 1,
    from: 1,
    last_page: 2,
    links: [
      {
        url: null,
        label: "&laquo; Previous",
        active: false,
      },
      {
        url: "https://api.givebutter.com/v1/tickets?page=1",
        label: "1",
        active: true,
      },
      {
        url: "https://api.givebutter.com/v1/tickets?page=2",
        label: "2",
        active: false,
      },
      {
        url: "https://api.givebutter.com/v1/tickets?page=2",
        label: "Next &raquo;",
        active: false,
      },
    ],
    path: "https://api.givebutter.com/v1/tickets",
    per_page: 20,
    to: 20,
    total: 31,
  },
};
