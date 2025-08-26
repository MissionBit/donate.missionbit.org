export type GivebutterObj = Readonly<{
  id: string | number;
  created_at: string;
  updated_at?: string;
}>;

export function urlPrefix(firstUrl: string) {
  const url = new URL(firstUrl);
  url.search = "";
  return url.toString();
}

export function toSupabaseRow(prefix: string) {
  const objPrefix = urlPrefix(prefix);
  return <T extends GivebutterObj>(obj: T) => ({
    id: `${objPrefix}/${obj.id}`,
    created_at: obj.created_at,
    updated_at: obj.updated_at ?? obj.created_at,
    data: obj,
  });
}
