require("dotenv").config();
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { BASE_PROMPT, getSystemPrompt } from "./prompts";
import { ContentBlock, TextBlock } from "@anthropic-ai/sdk/resources";
import { basePrompt as nodeBasePrompt } from "./defaults/node";
import { basePrompt as reactBasePrompt } from "./defaults/react";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const anthropic = new Anthropic();
const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.get("/", (req, res) => {
  res.json("Hello");
});

app.post("/template", async (req, res) => {
  const prompt = req.body.prompt;
  console.log(prompt);
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `${prompt}`,
    config: {
      maxOutputTokens: 1000,
      systemInstruction:
        "You need to figure out if the user is asking for a nodejs or react application. You only need to return 'nodejs' or 'react' based on the user input. Nothing else.",
    },
  });
  const answer = response.text;

  // const answer = (response.content[0] as TextBlock).text; // react or node
  if (answer == "react") {
    res.json({
      prompts: [
        BASE_PROMPT,
        `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
      ],
      uiPrompts: [reactBasePrompt],
    });
    return;
  }

  if (answer === "node") {
    res.json({
      prompts: [
        `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
      ],
      uiPrompts: [nodeBasePrompt],
    });
    return;
  }

  res.status(403).json({ message: "You cant access this" });
  return;
});

app.post("/chat", async (req, res) => {
  const messages = req.body.messages;
  console.log(messages);
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `${messages}`,
    config: {
      maxOutputTokens: 1000000,
      temperature: 0.0,
      systemInstruction: getSystemPrompt(),
    },
  });

  console.log(response.text);

  res.json({
    response: response.text,
  });
});

app.listen(3000);
