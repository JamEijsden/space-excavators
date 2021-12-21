import express from "express";
import startup from "./lib/startup";
import api from "./api/index";
import middleware from "./middleware/index";
import logger from "./lib/logger";
import websockets from './websockets';

startup()
  .then(() => {
    const app = express();
    const port = process.env.PORT || 8001;

    middleware(app);
    api(app);

    const server = app.listen(port, () => {
      if (process.send) {
        process.send(`Server running at http://localhost:${port}\n\n`);
      }
    });

    websockets(server);

    process.on("message", (message) => {
      console.log(message);
    });
  })
  .catch((error) => {
    logger.error(error);
  });
