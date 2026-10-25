import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

// Cloud Run (and most platforms) tell the app which port to use via PORT.
const port = Number(process.env.PORT ?? 3000);

serve({ fetch: createApp().fetch, port }, (info) => {
  console.log(`listening on http://localhost:${info.port}`);
});