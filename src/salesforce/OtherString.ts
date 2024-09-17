import { Schema as S, AST } from "@effect/schema";
export class OtherString extends S.make<string & Record<never, never>>(
  AST.stringKeyword,
) {}
