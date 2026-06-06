import fs from "node:fs";
import path from "node:path";

import type { ExtensionContext } from "vscode";
import { ViewColumn, window } from "vscode";

import { getDocumentationEntry, type DocumentationId } from "./documentationCatalog.js";
import { renderMarkdownToHtml } from "./markdownRenderer.js";

export class DocumentationService {
  constructor(private readonly context: ExtensionContext) {}

  private resolveDocPath(id: DocumentationId): string {
    return path.join(this.context.extensionUri.fsPath, "docs", getDocumentationEntry(id).filePath);
  }

  readMarkdown(id: DocumentationId): string {
    return fs.readFileSync(this.resolveDocPath(id), "utf8");
  }

  openMarkdownWebview(id: DocumentationId): void {
    const entry = getDocumentationEntry(id);
    const panel = window.createWebviewPanel(
      "sculptor.documentation",
      entry.label,
      ViewColumn.One,
      { enableScripts: false, retainContextWhenHidden: true }
    );

    panel.webview.html = renderMarkdownToHtml(entry.label, this.readMarkdown(id));
  }

  openOverview(): void {
    this.openMarkdownWebview("getting-started");
  }

  openCli(): void {
    this.openMarkdownWebview("cli");
  }

  openCore(): void {
    this.openMarkdownWebview("core");
  }

  openRouter(): void {
    this.openMarkdownWebview("router");
  }

  openConfig(): void {
    this.openMarkdownWebview("config");
  }

  openRuntimeConfig(): void {
    this.openMarkdownWebview("runtime-config");
  }

  openPaws(): void {
    this.openMarkdownWebview("paws");
  }

  openSupportIssues(): void {
    this.openMarkdownWebview("support-issues");
  }

  openSupportDiscussions(): void {
    this.openMarkdownWebview("support-discussions");
  }

  openSupportDiscord(): void {
    this.openMarkdownWebview("support-discord");
  }

  openDocumentationById(id: DocumentationId): void {
    this.openMarkdownWebview(id);
  }

  explainCurrentFile(): void {
    const editor = window.activeTextEditor;

    if (!editor) {
      void window.showInformationMessage("Open a Sculptor file first to explain it.");
      return;
    }

    const fileName = path.basename(editor.document.fileName);
    const text = editor.document.getText();

    if (fileName === "sculptor.json") {
      this.openConfig();
      return;
    }

    if (fileName === "props.json") {
      this.openRuntimeConfig();
      return;
    }

    if (text.includes("@Package(")) {
      this.openCore();
      return;
    }

    if (
      text.includes("@Controller") ||
      text.includes("@Get") ||
      text.includes("@Post") ||
      text.includes("@Put") ||
      text.includes("@Delete") ||
      text.includes("FunctionalRouter(")
    ) {
      this.openRouter();
      return;
    }

    this.openOverview();
  }
}
