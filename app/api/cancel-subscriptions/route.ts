import getStripe from "src/getStripe";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const stripe = getStripe();

interface PostBody {
  id: string;
}

function parseBody(body: unknown): PostBody | undefined {
  if (typeof body !== "object") {
    return undefined;
  }
  const { id } = body as { [k: string]: unknown };
  return typeof id === "string" ? { id } : undefined;
}

export async function POST(req: Request) {
  const body = parseBody(await req.json());
  if (body === undefined) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    const subscription = await stripe.subscriptions.cancel(body.id);
    return Response.json({ subscription });
  } catch (err) {
    console.error(err);
    return Response.json(
      { statusCode: 500, message: (err as Error).message },
      { status: 500 },
    );
  }
}
