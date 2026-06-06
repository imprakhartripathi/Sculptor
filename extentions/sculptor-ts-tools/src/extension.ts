import type { ExtensionContext } from "vscode";
import { window } from "vscode";

import { registerDocumentationCommands } from "./commands/documentationCommands.js";
import { DocumentationService } from "./services/documentationService.js";
import { ProjectDetectionService } from "./services/projectDetectionService.js";
import { DocumentationTreeProvider } from "./views/documentationTreeProvider.js";

export async function activate(context: ExtensionContext): Promise<void> {
  const documentationService = new DocumentationService(context);
  const projectDetector = new ProjectDetectionService(context);
  const documentationTreeProvider = new DocumentationTreeProvider();

  context.subscriptions.push(
    projectDetector,
    documentationTreeProvider,
    window.registerTreeDataProvider("sculptor.documentation", documentationTreeProvider)
  );

  registerDocumentationCommands(context, documentationService);

  await projectDetector.initialize();
  documentationTreeProvider.refresh();
}

export function deactivate(): void {
  return undefined;
}
