import { WebClient } from "@slack/web-api";

const token = process.env.SLACK_TOKEN;
export const slack = new WebClient(token);
export default slack;
