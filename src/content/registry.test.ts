import { describe, expect, it } from "vitest";
import { contentPacks } from "./contentPacks";
import {
  allContentRecords,
  fourPicsContentRecords,
  quizContentRecords,
} from "./registry";
import { CONTENT_SCHEMA_VERSION } from "./types";
import { validateContentRecords } from "./validators";

describe("KJVenture content registry", () => {
  it("preserves the full legacy library with stable unique IDs", () => {
    expect(quizContentRecords).toHaveLength(100);
    expect(fourPicsContentRecords).toHaveLength(30);
    expect(allContentRecords).toHaveLength(130);
    expect(new Set(allContentRecords.map((record) => record.id))).toHaveLength(130);
  });

  it("keeps visible references and marks migrated records", () => {
    for (const record of allContentRecords) {
      expect(record.schemaVersion).toBe(CONTENT_SCHEMA_VERSION);
      expect(record.referenceText).toBe(record.reference);
      expect(record.validation.status).toBe("legacy-imported");
    }
  });

  it("passes structural integrity validation", () => {
    expect(validateContentRecords(allContentRecords)).toEqual([]);
    expect(contentPacks[0].recordIds).toHaveLength(130);
  });
});
