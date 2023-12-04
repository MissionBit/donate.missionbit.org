import getBatch from "src/getBatch";

export const dynamic = "force-dynamic";
export const runtime = "edge";

function parseCreated(
  created: string | string[] | undefined,
): number | undefined {
  if (typeof created !== "string") {
    return undefined;
  }
  return parseInt(created, 10);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const created = parseCreated(searchParams.get("created") ?? undefined);
  if (created === undefined) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    const data = await getBatch(created);
    return Response.json(data);
  } catch (err) {
    console.error(err);
    return Response.json(
      { statusCode: 500, message: (err as Error).message },
      { status: 500 },
    );
  }
}
