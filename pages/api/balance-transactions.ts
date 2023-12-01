import { NextApiHandler } from "next";

import getBatch from "src/getBatch";

function parseCreated(
  created: string | string[] | undefined,
): number | undefined {
  if (typeof created !== "string") {
    return undefined;
  }
  return parseInt(created, 10);
}

const handler: NextApiHandler = async (req, res) => {
  if (req.method === "GET") {
    const created = parseCreated(req.query.created);
    if (created === undefined) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    try {
      const data = await getBatch(created);
      res.status(200).json(data);
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ statusCode: 500, message: (err as Error).message });
    }
  } else {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method Not Allowed");
  }
};

export const runtime = "edge";
export const config = {
  runtime: "edge",
};

export default handler;
