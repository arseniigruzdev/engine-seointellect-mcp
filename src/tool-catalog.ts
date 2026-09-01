import * as z from "zod/v4";

const text = z.string().min(1);
const textList = z.array(text).min(1);
const id = z.union([z.string().min(1), z.number().int().nonnegative()]);
const positiveIntLike = z.union([z.string().regex(/^\d+$/), z.number().int().positive()]);
const ngramCount = z.union([
  z.string().regex(/^(?:[2-9]|[1-9]\d+)$/),
  z.number().int().min(2),
]);
const region = z.union([z.string().min(1), z.number().int().nonnegative()]);

const controls = {
  wait_for_result: z
    .boolean()
    .optional()
    .default(true)
    .describe("Wait for the final result instead of returning only task_id"),
  poll_interval_ms: z
    .number()
    .int()
    .min(500)
    .max(30_000)
    .optional()
    .describe("Polling interval; default is configured by the server"),
  timeout_ms: z
    .number()
    .int()
    .min(1_000)
    .max(900_000)
    .optional()
    .describe("Maximum wait time; a pending task_id is returned on timeout"),
};

const resumeSchema = z.object({
  task_id: id.describe("Existing Engine SEO Intellect task to continue waiting for"),
  ...controls,
});

function taskInput<T extends z.ZodRawShape>(shape: T) {
  return z.union([z.object({ ...shape, ...controls }), resumeSchema]);
}

export interface ToolSpec {
  name: string;
  apiTool: string;
  title: string;
  description: string;
  inputSchema: z.ZodType;
}

export const toolCatalog: ToolSpec[] = [
  {
    name: "lsi",
    apiTool: "lsi",
    title: "LSI words",
    description: "Collect LSI unigrams and bigrams from search results.",
    inputSchema: taskInput({
      keywords: textList,
      se: text.describe("Search engine, for example yandex"),
      region,
      depth: positiveIntLike,
      stoplist: textList.optional(),
    }),
  },
  {
    name: "seo_text",
    apiTool: "seo-text",
    title: "SEO text analysis",
    description: "Measure competitor text sizes and collect page text from the SERP.",
    inputSchema: taskInput({
      keywords: textList,
      se: text,
      region,
      se_type: text.optional().describe("desktop, mobile, or another API-supported type"),
      depth: positiveIntLike,
      stoplist: textList.optional(),
    }),
  },
  {
    name: "site_age",
    apiTool: "site-age",
    title: "Site or page age",
    description: "Find the first known indexing date for URLs.",
    inputSchema: taskInput({ urls: textList }),
  },
  {
    name: "top_10",
    apiTool: "top-10",
    title: "Search TOP results",
    description: "Export search results for the supplied keywords.",
    inputSchema: taskInput({
      keywords: textList,
      se: text,
      region,
      depth: positiveIntLike,
      se_type: text.optional(),
      main_pages_count: z.boolean().optional(),
    }),
  },
  {
    name: "page_index",
    apiTool: "pageindex",
    title: "Page indexing",
    description: "Check whether URLs are indexed in Yandex and Google.",
    inputSchema: taskInput({
      urls: textList,
      index_yandex: z.boolean().optional().default(true),
      index_google: z.boolean().optional().default(true),
    }),
  },
  {
    name: "clustering",
    apiTool: "clustering",
    title: "Keyword clustering",
    description: "Cluster a semantic core using search-result overlap.",
    inputSchema: taskInput({
      keywords: textList,
      stoplist: textList.optional(),
      positions: z.boolean().optional(),
      relpage: z.boolean().optional(),
      hide_main_pages: z.boolean().optional(),
      ws_base: z.boolean().optional(),
      ws_strict: z.boolean().optional(),
      ws_middle: z.boolean().optional(),
      main_pages_count: z.boolean().optional(),
      type: text.optional().describe("Clustering mode, for example hard"),
      count: positiveIntLike.optional(),
      depth: positiveIntLike.optional(),
      se: text.optional(),
      region: region.optional(),
      url: text.optional(),
      depth_positions: positiveIntLike.optional(),
    }),
  },
  {
    name: "lemma",
    apiTool: "lemma",
    title: "Lemmatizer",
    description: "Lemmatize text and optionally build n-grams.",
    inputSchema: taskInput({ text, ngrammes: ngramCount.optional() }),
  },
  {
    name: "positions_multi",
    apiTool: "positions-multi",
    title: "Multi-domain positions",
    description: "Check keyword positions for several sites or pages.",
    inputSchema: taskInput({
      keywords: textList,
      moreurls: textList,
      is_strict_url: z.boolean().optional(),
      is_secondhost: z.boolean().optional(),
      se: text,
      depth: positiveIntLike,
      se_type: text.optional(),
      region,
      ws_base: z.boolean().optional(),
      ws_middle: z.boolean().optional(),
      ws_strict: z.boolean().optional(),
      ws_order: z.boolean().optional(),
    }),
  },
  {
    name: "headers",
    apiTool: "headers",
    title: "H1-H6 parser",
    description: "Collect page headings from SERP competitors.",
    inputSchema: taskInput({
      variant: text.optional().describe("Request variant, for example queries"),
      keywords: textList,
      se: text,
      region,
      se_type: text.optional(),
      depth: positiveIntLike,
      stoplist: textList.optional(),
    }),
  },
  {
    name: "competitors",
    apiTool: "competitors",
    title: "Competitor search",
    description: "Find organic-search competitors for a keyword set.",
    inputSchema: taskInput({
      keywords: textList,
      stoplist: textList.optional(),
      se: text,
      region,
      se_type: text.optional(),
      depth: positiveIntLike,
    }),
  },
  {
    name: "suggest",
    apiTool: "suggest",
    title: "Search suggestions",
    description: "Collect Yandex or Google search suggestions.",
    inputSchema: taskInput({
      keywords: textList,
      se: text,
      region,
      depth: positiveIntLike.optional(),
      stoplist: textList.optional(),
      suggest_nrm: text.optional(),
      suggest_spc: text.optional(),
      suggest_lat: text.optional(),
      suggest_cyr: text.optional(),
      suggest_dig: text.optional(),
    }),
  },
  {
    name: "sqi",
    apiTool: "sqi",
    title: "Yandex SQI",
    description: "Fetch Yandex site quality index and related public site signals.",
    inputSchema: taskInput({ urls: textList }),
  },
  {
    name: "keywords_checker",
    apiTool: "keywords-checker",
    title: "Copywriter brief checker",
    description: "Check strict, lemmatized, and additional keyword occurrences in text.",
    inputSchema: taskInput({
      text,
      strict_words: textList.optional(),
      strict_count: positiveIntLike.optional(),
      lemma_words: textList.optional(),
      lemma_count: positiveIntLike.optional(),
      add_words: textList.optional(),
      add_count: positiveIntLike.optional(),
    }),
  },
  {
    name: "overoptimization_filter",
    apiTool: "filter",
    title: "Overoptimization filter",
    description: "Estimate possible Yandex text-filter or overoptimization risk.",
    inputSchema: taskInput({ keywords: textList, url: text, region }),
  },
  {
    name: "positions",
    apiTool: "positions",
    title: "Keyword positions",
    description: "Check a site's positions and optional Wordstat/SERP signals.",
    inputSchema: taskInput({
      keywords: textList,
      url: text,
      is_strict_url: z.boolean().optional(),
      is_secondhost: z.boolean().optional(),
      se: text,
      depth: positiveIntLike,
      se_type: text.optional(),
      region,
      ws_base: z.boolean().optional(),
      ws_middle: z.boolean().optional(),
      ws_strict: z.boolean().optional(),
      ws_order: z.boolean().optional(),
      relpage: z.boolean().optional(),
      main_pages_count: z.boolean().optional(),
      is_moreurls: z.boolean().optional(),
      moreurls: textList.optional(),
    }),
  },
  {
    name: "link_checker",
    apiTool: "linkchecker",
    title: "Backlink checker",
    description: "Check donor pages for links to acceptor URLs and optional indexation.",
    inputSchema: taskInput({
      variant: text.optional().describe("Link matching mode, for example strict"),
      donors: textList,
      actseptors: textList.describe("Acceptor URLs; field name follows the upstream API"),
      index_yandex: z.boolean().optional(),
      index_link_yandex: z.boolean().optional(),
      index_google: z.boolean().optional(),
      index_link_google: z.boolean().optional(),
    }),
  },
  {
    name: "relevant_pages",
    apiTool: "relevant",
    title: "Relevant pages",
    description: "Find the most relevant site page for each keyword.",
    inputSchema: taskInput({
      keywords: textList,
      url: text,
      se: text,
      region,
      se_type: text.optional(),
    }),
  },
  {
    name: "wordstat",
    apiTool: "wordstat",
    title: "Yandex Wordstat",
    description: "Collect supported Wordstat frequencies for keywords.",
    inputSchema: taskInput({
      variant: text.optional().describe("Wordstat request variant, for example ws"),
      keywords: textList,
      device: text.optional(),
      ws_year: z.boolean().optional(),
      ws_middle: z.boolean().optional(),
      ws_strict: z.boolean().optional(),
      ws_order: z.boolean().optional(),
      region,
      is_clear: z.boolean().optional(),
    }),
  },
  {
    name: "semantic",
    apiTool: "semantic",
    title: "Competitor semantics",
    description: "Analyze a domain's visible keyword semantics.",
    inputSchema: taskInput({ variant: text.optional(), url: text, region }),
  },
  {
    name: "site_scanner",
    apiTool: "site-scanner",
    title: "Site scanner",
    description: "Crawl a website and return technical SEO findings.",
    inputSchema: taskInput({
      url: text,
      threads: z.number().int().min(1).max(50).optional(),
      level: z.number().int().min(1).max(20).optional(),
      limit: z.number().int().min(1).max(1_000_000).optional(),
    }),
  },
  {
    name: "copywriter_brief",
    apiTool: "copyrighters",
    title: "Copywriter brief",
    description: "Build a content brief from SERP competitors and keyword signals.",
    inputSchema: taskInput({
      task_variant: text.optional(),
      keywords: textList,
      stoplist: textList.optional(),
      se: text,
      region,
      url: text.optional(),
      is_stopwords: z.boolean().optional(),
      stopwords: textList.optional(),
      lsi: z.boolean().optional(),
      highlighted: z.boolean().optional(),
      variant: text.optional(),
    }),
  },
  {
    name: "text_analyze",
    apiTool: "text-analyze",
    title: "Text analyzer",
    description: "Analyze text or competitor pages against a keyword set.",
    inputSchema: taskInput({
      keywords: textList,
      task_variant: text,
      competitors: textList.optional(),
      url: text.optional(),
      variant: text.optional(),
      mode: text.optional(),
      text: z.string().optional(),
    }),
  },
];

export const toolNames = toolCatalog.map((tool) => tool.name);
