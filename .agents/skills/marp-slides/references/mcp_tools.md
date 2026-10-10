# `marp-slide-mcp` Tools Reference

The `marp-slide-mcp` MCP server exposes 7 specialized tools to manage the end-to-end lifecycle of Marp slide decks.

---

## 1. `generate_slide_deck`

Generates a complete slide deck from structured JSON data, saving the master JSON and compiling Markdown, HTML, and high-fidelity PDF.

### Schema & Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `titleSlide` | `object` | **Yes** | Metadata for page 1 (see TitleSlide object below) |
| `normalSlides` | `array` | **Yes** | Array of slide objects (page 2 onwards) |
| `size` | `string` | No | Slide aspect ratio (`'4:3'` or `'16:9'`). Default: `'4:3'` |
| `themeColor` | `string` | No | Primary theme color in HEX or CSS format (e.g. `'#1f497d'`, `'#2e7d32'`) |
| `logoPath` | `string` | No | Common header logo image path (e.g. `'../slides/N-Y-Public_Logo.jpg'`) |
| `filenamePrefix` | `string` | No | File prefix for output artifacts (e.g. `'dx_strategy'`) |

#### `titleSlide` Object
- `mainTitle` (string, required): Main presentation title (36pt)
- `subTitle` (string, required): Subtitle (20pt)
- `bookNo` (string, required): Document / Reference ID (e.g. `'DOC-2026-001'`)
- `author` (string, required): Department, author, or presenter name
- `date` (string, optional): Creation or presentation date
- `copyright` (string, optional): Default `'© 2026 N-Y-Public'`
- `confidentiality` (string, optional): Default `'CONFIDENTIAL'`

#### `normalSlides[]` Item Object
- `pageTitle` (string, required, max 60): Slide title in top-left
- `claim` (string, optional, max 250): Slide core claim in upper gray band (can use bullets)
- `chartTitle` (string, optional, max 60): Section / figure title above body
- `bodyContent` (string, optional, max 1500): Raw Markdown body (text, bullets, tables, Mermaid, code)
- `twoColumns` (object, optional): Structured 2-column content: `{ "leftContent": string, "rightContent": string }`
- `imageGrid` (array, optional): Structured image grid: `[{ "imagePath": string, "caption"?: string, "alt"?: string }]`
- `source` (string, optional): Source citation or footnote
- `classes` (string[], optional): CSS helper classes (e.g. `['wide-content', 'mermaid-sm']`)
- `copyright` (string, optional): Default `'© 2026 N-Y-Public'`
- `confidentiality` (string, optional): Default `'CONFIDENTIAL'`

---

## 2. `get_slide_deck`

Retrieves the structured composition of an existing slide deck by its `fileId`.

### Parameters
- `fileId` (string, required): Slide deck ID (e.g. `'slide-a1b2c3d4'`)

### Returns
JSON object containing:
- `slideId`: string
- `size`: `'4:3'` | `'16:9'`
- `logoPath`, `banner`, `themeColor`
- `totalPages`: number
- `titleSlide`: TitleSlide object
- `pages`: Array of slide objects with 1-based page numbers (`pageNumber: 2`, `pageTitle`, `claim`, `chartTitle`, `classes`, `bodyContent`, `twoColumns`, `imageGrid`)

---

## 3. `insert_slide`

Inserts a single new slide immediately after a specified page number, then regenerates Markdown, HTML, and PDF.

### Parameters
- `fileId` (string, required): Target slide deck ID
- `insertAfterPage` (number, required): Page number after which the new slide will be inserted (`1` to insert directly after title slide)
- `newSlide` (NormalSlide object, required): The slide data to insert

---

## 4. `update_slide`

Updates the content of an existing slide (page 2 or later) and rebuilds the PDF.

### Parameters
- `fileId` (string, required): Target slide deck ID
- `targetPageNumber` (number, required): 1-based page number to edit (`targetPageNumber >= 2`)
- `updatedSlide` (NormalSlide object, required): Replacement slide data

---

## 5. `delete_slide`

Deletes a specific slide from the deck (page 2 or later) and rebuilds the PDF.

### Parameters
- `fileId` (string, required): Target slide deck ID
- `targetPageNumber` (number, required): 1-based page number to delete (`targetPageNumber >= 2`)

---

## 6. `update_deck_settings`

Updates deck-wide configuration (size, logo, banner, theme color, title slide) and recompiles all artifacts.

### Parameters
- `fileId` (string, required): Target slide deck ID
- `size` (string, optional): `'4:3'` or `'16:9'`
- `logoPath` (string, optional): Path to header logo
- `banner` (string, optional): Banner image path, URL, Base64 URI, or `'none'`
- `themeColor` (string, optional): HEX / CSS color
- `titleSlide` (TitleSlide object, optional): Updated title slide metadata

---

## 7. `export_to_pdf`

Compiles a standalone Markdown file or existing slide ID directly to PDF and HTML using Marp CLI and Puppeteer.

### Parameters
- `fileId` (string, optional): Slide ID in `output/`
- `markdownPath` (string, optional): Relative or absolute path to a `.md` file

---

## 8. Client Configuration & Registration

To register this MCP server in external MCP clients (e.g. Claude Desktop, Cursor, or global Antigravity):

### Build Server
Before running the MCP server, ensure TypeScript is compiled:
```bash
npm run build
```

### Configuration Snippet (`claude_desktop_config.json` or `mcp_config.json`)
```json
{
  "mcpServers": {
    "marp-slide-mcp": {
      "command": "node",
      "args": ["<path-to-repo>/build/index.js"]
    }
  }
}
```

Or via Docker:
```json
{
  "mcpServers": {
    "marp-slide-mcp": {
      "command": "docker",
      "args": ["exec", "-i", "-u", "node", "-w", "/workspaces/Marp", "<container_id>", "node", "build/index.js"]
    }
  }
}
```
