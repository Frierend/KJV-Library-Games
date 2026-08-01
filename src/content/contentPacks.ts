import { allContentRecords } from "./registry";
import { CONTENT_VERSION, type ContentPack } from "./types";

export const coreContentPack: ContentPack = {
  id: "kjventure-core",
  title: "KJVenture Core Library",
  description: "The original 100 quiz questions and 30 Four Pics puzzles.",
  version: CONTENT_VERSION,
  builtIn: true,
  recordIds: allContentRecords.map((record) => record.id),
};

export const contentPacks = [coreContentPack] as const;
