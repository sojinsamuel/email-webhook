import express from "express";
import { unless } from "express-unless";
import bodyParser from "body-parser";
import fs from "fs";

const app = express();

const json_parser = bodyParser.json();

json_parser.unless = unless;

app.use(json_parser.unless({ path: ["/incoming"] }));

const PORT = 3001;

const PROCESSED_EVENTS_FILE = "processed_events.json";

const isEventProcessed = (sg_event_id) => {
  if (!fs.existsSync(PROCESSED_EVENTS_FILE)) {
    return false;
  }
  const processedEvents = JSON.parse(fs.readFileSync(PROCESSED_EVENTS_FILE));
  return processedEvents.includes(sg_event_id);
};

const markEventAsProcessed = (sg_event_id) => {
  let processedEvents = [];
  if (fs.existsSync(PROCESSED_EVENTS_FILE)) {
    processedEvents = JSON.parse(fs.readFileSync(PROCESSED_EVENTS_FILE));
  }
  processedEvents.push(sg_event_id);
  fs.writeFileSync(PROCESSED_EVENTS_FILE, JSON.stringify(processedEvents));
};

const callExternalService = async (endpoint, body) => {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // const result = await response.json();

    // console.log(result);
    // return result;
  } catch (error) {
    console.error("Error calling external service:", error);
    return error;
  }
};

app.post(
  "/incoming",
  bodyParser.raw({ type: "application/json" }),
  async (req, resp) => {
    try {
      // requestBody is an array
      const requestBody = JSON.parse(req.body.toString());
      const { sg_event_id } = requestBody[0];

      if (isEventProcessed(sg_event_id)) {
        console.log("Event already processed");
        return resp.status(200).send("OK");
      }

      const serviceResult = await callExternalService(
        "https://reversecontact.vercel.app/api/incoming",
        { ...requestBody }
      );

      console.log({ serviceResult });

      markEventAsProcessed(sg_event_id);

      resp.status(200).send("OK");
    } catch (error) {
      resp.status(500).send(error);
    }
  }
);

app.get("/", (req, res) => {
  res.send("Hello Email!!");
});

app.listen(PORT, () => {
  console.log("Express server listening on port: ", PORT);
});
