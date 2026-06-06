declare module "vscode" {
  export type Thenable<T> = Promise<T>;

  export interface Disposable {
    dispose(): void;
  }

  export type Event<T> = (listener: (e: T) => unknown, thisArgs?: unknown, disposables?: Disposable[]) => Disposable;

  export class EventEmitter<T> {
    readonly event: Event<T>;
    fire(data: T): void;
    dispose(): void;
  }

  export class Uri {
    readonly fsPath: string;
    static file(path: string): Uri;
    static joinPath(base: Uri, ...paths: string[]): Uri;
    toString(): string;
  }

  export class MarkdownString {
    constructor(value?: string);
    value: string;
    isTrusted?: boolean;
    appendMarkdown(value: string): MarkdownString;
  }

  export enum TreeItemCollapsibleState {
    None = 0,
    Collapsed = 1,
    Expanded = 2
  }

  export enum StatusBarAlignment {
    Left = 1,
    Right = 2
  }

  export enum ViewColumn {
    One = 1
  }

  export enum ProgressLocation {
    Notification = 15
  }

  export class ThemeIcon {
    constructor(id: string);
  }

  export interface Command {
    command: string;
    title: string;
    arguments?: unknown[];
  }

  export interface TreeItemLabel {
    label: string;
    highlights?: [number, number][];
  }

  export class TreeItem {
    constructor(label: string | TreeItemLabel, collapsibleState?: TreeItemCollapsibleState);
    label: string | TreeItemLabel;
    description?: string;
    tooltip?: string | MarkdownString;
    collapsibleState: TreeItemCollapsibleState;
    command?: Command;
    iconPath?: Uri | ThemeIcon;
    contextValue?: string;
  }

  export interface TreeDataProvider<T> {
    onDidChangeTreeData?: Event<T | undefined | null> | undefined;
    getTreeItem(element: T): TreeItem;
    getChildren(element?: T): ProviderResult<T[]>;
  }

  export type ProviderResult<T> = T | undefined | null | Thenable<T | undefined | null>;

  export interface Webview {
    html: string;
    options?: { enableScripts?: boolean; retainContextWhenHidden?: boolean };
  }

  export class WebviewPanel {
    readonly webview: Webview;
    readonly viewType: string;
    readonly title: string;
    reveal(column?: ViewColumn): void;
    dispose(): void;
  }

  export interface StatusBarItem extends Disposable {
    text: string;
    tooltip?: string;
    command?: string | Command;
    show(): void;
    hide(): void;
  }

  export interface TextDocument {
    readonly uri: Uri;
    readonly fileName: string;
    getText(): string;
  }

  export interface TextEditor {
    readonly document: TextDocument;
  }

  export interface WorkspaceFolder {
    readonly uri: Uri;
    readonly name: string;
    readonly index: number;
  }

  export interface FileSystemWatcher extends Disposable {
    readonly onDidCreate: Event<Uri>;
    readonly onDidChange: Event<Uri>;
    readonly onDidDelete: Event<Uri>;
  }

  export interface ExtensionContext {
    readonly extensionUri: Uri;
    readonly subscriptions: Disposable[];
  }

  export interface TreeView<_T> extends Disposable {
    readonly title: string;
    readonly description?: string;
    readonly message?: string;
    readonly onDidChangeSelection: Event<unknown>;
  }

  export interface WindowApi {
    activeTextEditor?: TextEditor;
    createStatusBarItem(alignment: StatusBarAlignment, priority?: number): StatusBarItem;
    createWebviewPanel(viewType: string, title: string, column: ViewColumn, options?: { enableScripts?: boolean; retainContextWhenHidden?: boolean }): WebviewPanel;
    registerTreeDataProvider<T>(viewId: string, provider: TreeDataProvider<T>): Disposable;
    showInformationMessage(message: string, ...items: string[]): Thenable<string | undefined>;
    showWarningMessage(message: string, ...items: string[]): Thenable<string | undefined>;
    showErrorMessage(message: string, ...items: string[]): Thenable<string | undefined>;
  }

  export interface WorkspaceApi {
    workspaceFolders?: WorkspaceFolder[];
    findFiles(include: string, exclude?: string, maxResults?: number): Thenable<Uri[]>;
    createFileSystemWatcher(globPattern: string): FileSystemWatcher;
    onDidChangeWorkspaceFolders: Event<unknown>;
    onDidOpenTextDocument: Event<TextDocument>;
    onDidChangeTextDocument: Event<unknown>;
  }

  export interface CommandsApi {
    registerCommand(command: string, callback: (...args: unknown[]) => unknown): Disposable;
    executeCommand<_T = unknown>(command: string, ...args: unknown[]): Thenable<_T | undefined>;
  }

  export interface EnvApi {
    openExternal(target: Uri): Thenable<boolean>;
  }

  export const window: WindowApi;
  export const workspace: WorkspaceApi;
  export const commands: CommandsApi;
  export const env: EnvApi;
}
