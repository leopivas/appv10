import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { handleStripeWebhook } from "./routes/stripe";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors());

// Media files are now served via Object Storage (GCS) through the /api/media/files route in media.ts.

// Stripe webhook MUST be registered before express.json() — needs raw body
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Seed DB defaults on startup (non-blocking)
import("./lib/plans-store").then(({ seedDefaultPlans }) => seedDefaultPlans()).catch((err) => {
  logger.error({ err }, "Failed to seed default plans");
});

// Migrate legacy disk media to Object Storage on first boot (non-blocking, idempotent)
import("./routes/media").then(({ runLegacyMediaMigration }) => runLegacyMediaMigration()).catch((err) => {
  logger.error({ err }, "Legacy media migration failed");
});

export default app;
