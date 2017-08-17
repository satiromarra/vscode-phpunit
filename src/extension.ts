'use strict'
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { PHPUnit } from './phpunit'
import { ExtensionContext, workspace, TextDocument, window } from 'vscode'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-phpunit" is now active!')

    const output = window.createOutputChannel('phpunit')
    const phpunit = new PHPUnit()

    // const disposable = workspace.onWillSaveTextDocument(async (e: TextDocumentWillSaveEvent) => {
    //     const messages = await phpunit.run(e.document.fileName, output);
    //     console.log(messages);
    // });
    // context.subscriptions.push(disposable);

    const exec = async function(textDocument: TextDocument) {
        const messages = await phpunit.run(textDocument.fileName, output)

        console.log(messages)
    }

    const disposable2 = workspace.onDidOpenTextDocument((textDocument: TextDocument) => {
        exec(textDocument)
    })
    context.subscriptions.push(disposable2)

    const disposable3 = workspace.onDidSaveTextDocument((textDocument: TextDocument) => {
        exec(textDocument)
    })
    context.subscriptions.push(disposable3)
}

// this method is called when your extension is deactivated
export function deactivate() {}
