import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import serverless from "serverless-http";
import { createServer } from "../../server/index";

const app = createServer();
const handler = serverless(app);

export const api: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  return handler(event, context) as any;
};
