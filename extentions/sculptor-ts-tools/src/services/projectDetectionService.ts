import type { Disposable, ExtensionContext, StatusBarItem } from "vscode";
import { StatusBarAlignment, commands, window, workspace } from "vscode";

export class ProjectDetectionService implements Disposable {
  private readonly statusBarItem: StatusBarItem;
  private readonly watchers: Disposable[] = [];
  private isProject = false;

  constructor(private readonly context: ExtensionContext) {
    this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100);
    this.statusBarItem.command = "sculptor.openDocumentation";
    this.statusBarItem.tooltip = "Open SculptorTS documentation";
    this.statusBarItem.text = "⚒ SculptorTS";
  }

  async initialize(): Promise<void> {
    this.watchers.push(
      workspace.createFileSystemWatcher("**/sculptor.json"),
      workspace.onDidChangeWorkspaceFolders(() => {
        void this.refresh();
      }),
      workspace.onDidOpenTextDocument(() => {
        void this.refresh();
      })
    );

    await this.refresh();
  }

  async refresh(): Promise<void> {
    const files = await workspace.findFiles("**/sculptor.json", "**/node_modules/**", 1);
    const nextState = files.length > 0;
    this.isProject = nextState;
    await commands.executeCommand("setContext", "sculptor.isProject", this.isProject);

    if (this.isProject) {
      this.statusBarItem.text = "⚒ SculptorTS Project";
      this.statusBarItem.show();
      return;
    }

    this.statusBarItem.hide();
  }

  dispose(): void {
    this.statusBarItem.dispose();
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
  }
}
