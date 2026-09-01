import { describe, expect, it } from "vitest";
import { toolCatalog } from "../src/tool-catalog.js";

function schemaFor(name: string) {
  const tool = toolCatalog.find((item) => item.name === name);
  if (!tool) throw new Error(`Missing tool: ${name}`);
  return tool.inputSchema;
}

describe("live API constraints", () => {
  it("requires at least two keywords for clustering", () => {
    expect(schemaFor("clustering").safeParse({ keywords: ["seo"] }).success).toBe(false);
    expect(
      schemaFor("clustering").safeParse({ keywords: ["seo", "seo продвижение"] }).success,
    ).toBe(true);
  });

  it("requires all keyword groups for keywords_checker", () => {
    expect(
      schemaFor("keywords_checker").safeParse({
        text: "SEO помогает продвигать сайт",
        strict_words: ["SEO"],
        strict_count: 1,
      }).success,
    ).toBe(false);

    expect(
      schemaFor("keywords_checker").safeParse({
        text: "SEO помогает продвигать сайт в поиске",
        strict_words: ["SEO"],
        strict_count: 1,
        lemma_words: ["сайт"],
        lemma_count: 1,
        add_words: ["поиск"],
        add_count: 1,
      }).success,
    ).toBe(true);
  });
});
