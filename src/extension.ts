import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');
const wxTags = ['movable-view', 'cover-image', 'cover-view', 'movable-area', 'scroll-view', 'swiper', 'swiper-item', 'view', 'icon', 'progress', 'rich-text', 'text', 'button', 'checkbox', 'checkbox-group', 'editor', 'form', 'input', 'label', 'picker', 'picker-view', 'picker-view-column', 'radio', 'radio-group', 'slider', 'switch', 'textarea', 'functional-page-navigator', 'navigator', 'audio', 'camera', 'image', 'live-player', 'live-pusher', 'video', 'map', 'canvas', 'ad', 'official-account', 'open-data', 'web-view'];
const appFile = 'app.json';
let rootPath = '';

function lastLevelDir (path: string): string {
  return path.substring(0, path.lastIndexOf('/'));
}

function findRootPath (path: string): string {
  const dir = lastLevelDir(path);
  const files = fs.readdirSync(dir);
  if (files.includes(appFile)) {
    return dir;
  } else {
    return findRootPath(dir);
  }
}

function resolveAbsoluteCompPaths (rootPath: string, compPath: string): string[] {
  compPath = lastLevelDir(compPath);
  const files = fs.readdirSync(rootPath + compPath);
  return files.map((file: string) => `${rootPath}/${compPath}/${file}`);
}

function resolveRelativeCompPaths (currentFilePath: string, compPath: string): string[] {
  compPath = lastLevelDir(compPath);
  currentFilePath = lastLevelDir(currentFilePath);
  const dirPath = path.resolve(currentFilePath, compPath);
  const files = fs.readdirSync(dirPath);
  return files.map((file: string) => `${dirPath}/${file}`);
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.languages.registerDefinitionProvider([
    {scheme: 'file', language: 'html', pattern: '**/*.wxml'}
  ], {
    provideDefinition (doc: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
      const lineText = doc.lineAt(position).text;
      const tag = (lineText.match(/(?<=<)[\w|\-]+\b/) || [])[0];
      if (!tag) {
        return;
      }
      if (wxTags.includes(tag)) {
        return [];
      }
      let paths = [];
      const filePath = doc.fileName;
      let jsonFile = filePath.replace('.wxml', '.json');
      if (!rootPath) {
        rootPath = findRootPath(filePath);
      }
      let config = JSON.parse(fs.readFileSync(jsonFile));
      let compPath = config.usingComponents[tag];

      // 页面或者组件没有定义，查找一下全局配置
      if (!compPath) {
        jsonFile = rootPath + '/' + appFile;
        config = JSON.parse(fs.readFileSync(jsonFile));
        compPath = config.usingComponents[tag];
      }

      if (/^\//.test(compPath)) {
        paths = resolveAbsoluteCompPaths(rootPath, compPath);
      } else {
        paths = resolveRelativeCompPaths(jsonFile, compPath);
      }

      return paths.map(path => 
        new vscode.Location(vscode.Uri.file(path), new vscode.Position(0, 0))
      );
    }
  }));
}
