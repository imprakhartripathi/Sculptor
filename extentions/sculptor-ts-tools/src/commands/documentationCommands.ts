import type { ExtensionContext } from "vscode";
import { commands } from "vscode";

import type { DocumentationId } from "../services/documentationCatalog.js";
import { DocumentationService } from "../services/documentationService.js";

export const registerDocumentationCommands = (
  context: ExtensionContext,
  documentationService: DocumentationService
): void => {
  const register = (command: string, callback: (...args: unknown[]) => void): void => {
    context.subscriptions.push(commands.registerCommand(command, callback));
  };

  register("sculptor.openDocumentation", (...args: unknown[]) => {
    const target = args[0] as DocumentationId | undefined;
    if (!target) {
      documentationService.openOverview();
      return;
    }

    documentationService.openDocumentationById(target);
  });

  register("sculptor.openCliDocs", () => documentationService.openCli());
  register("sculptor.openCoreDocs", () => documentationService.openCore());
  register("sculptor.openRouterDocs", () => documentationService.openRouter());
  register("sculptor.openConfigDocs", () => documentationService.openConfig());
  register("sculptor.openPawsDocs", () => documentationService.openPaws());
  register("sculptor.explainCurrentFile", () => documentationService.explainCurrentFile());
  register("sculptor.openSupportIssues", () => documentationService.openSupportIssues());
  register("sculptor.openSupportDiscussions", () => documentationService.openSupportDiscussions());
  register("sculptor.openSupportDiscord", () => documentationService.openSupportDiscord());
};
