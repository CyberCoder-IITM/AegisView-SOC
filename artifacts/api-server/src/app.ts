import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { registerPacketHook } from "./lib/simulator.js";
import { processPacket as fingerprintPacket } from "./lib/fingerprinter.js";
import { addPacket as chainPacket } from "./lib/integrityChain.js";
import { startAgent } from "./lib/socAgent.js";
import { startForecaster } from "./lib/forecaster.js";
import { startSigmaGenerator } from "./lib/sigmaGenerator.js";
import { startCorrelator } from "./lib/darkwebCorrelator.js";
import { startRecorder } from "./lib/sessionRecorder.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Register packet hooks — fingerprinter + integrity chain get every packet
registerPacketHook(fingerprintPacket);
registerPacketHook(chainPacket);

// Start background services
startAgent();
startForecaster();
startSigmaGenerator();
startCorrelator();
startRecorder();

export default app;
