import type { Disposable, TreeDataProvider } from "vscode";
import { EventEmitter, ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";

import { getDocumentationEntriesByGroup, type DocumentationEntry } from "../services/documentationCatalog.js";

type DocumentationNode =
  | { kind: "group"; label: string; description: string }
  | { kind: "doc"; entry: DocumentationEntry };

export class DocumentationTreeProvider implements TreeDataProvider<DocumentationNode>, Disposable {
  private readonly emitter = new EventEmitter<DocumentationNode | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;

  refresh(): void {
    this.emitter.fire(undefined);
  }

  getTreeItem(element: DocumentationNode): TreeItem {
    if (element.kind === "group") {
      const item = new TreeItem(element.label, TreeItemCollapsibleState.Expanded);
      item.description = element.description;
      item.iconPath = new ThemeIcon("folder");
      item.contextValue = "sculptor-doc-group";
      return item;
    }

    const item = new TreeItem(element.entry.label, TreeItemCollapsibleState.None);
    item.description = element.entry.description;
    item.command = {
      command: "sculptor.openDocumentation",
      title: element.entry.label,
      arguments: [element.entry.id]
    };
    item.iconPath = new ThemeIcon("book");
    item.contextValue = `sculptor-doc-${element.entry.group}`;
    return item;
  }

  getChildren(element?: DocumentationNode): DocumentationNode[] {
    if (!element) {
      return [
        { kind: "group", label: "Documentation", description: "Framework and CLI docs" },
        { kind: "group", label: "Support", description: "Community support links" }
      ];
    }

    if (element.kind === "group" && element.label === "Documentation") {
      return getDocumentationEntriesByGroup("documentation").map((entry) => ({ kind: "doc", entry }));
    }

    if (element.kind === "group" && element.label === "Support") {
      return getDocumentationEntriesByGroup("support").map((entry) => ({ kind: "doc", entry }));
    }

    return [];
  }

  dispose(): void {
    this.emitter.dispose();
  }
}
