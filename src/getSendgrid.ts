export interface EmailData {
  name?: string;
  email: string;
}
export interface PersonalizationData {
  to: EmailData[];
  dynamic_template_data?: {
    [key: string]: string | null | undefined | Record<string, string | null>;
  };
}
export interface MailDataRequired {
  from: EmailData;
  personalizations: PersonalizationData[];
  template_id: string;
}

export class MailService {
  readonly apiKey: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  async send(data: MailDataRequired): Promise<[Response, {} | null]> {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(data),
    });
    const body =
      res.headers.get("content-type") === "application/json"
        ? await res.json()
        : null;
    return [res, body];
  }
}

export function getSendGrid(): MailService {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (apiKey === undefined) {
    throw new Error("Missing SENDGRID_API_KEY environment variable");
  }
  return new MailService(apiKey);
}

export default getSendGrid;
