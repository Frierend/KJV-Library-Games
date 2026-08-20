import { allContentRecords } from "./registry";
import { CONTENT_VERSION, type ContentPack } from "./types";

export const coreContentPack: ContentPack = {
  id: "kjventure-core",
  title: "KJVenture Core Library",
  description: "100 quiz questions, 30 Four Pics puzzles, and 20 KJV verses.",
  version: CONTENT_VERSION,
  builtIn: true,
  recordIds: allContentRecords.map((record) => record.id),
};

export const contentPacks = [coreContentPack] as const;
