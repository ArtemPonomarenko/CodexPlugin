import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pluginRoot = join(root, 'plugins/azure-devops');
const readJson = path => JSON.parse(readFileSync(join(root, path), 'utf8'));

const codexPlugin = readJson('plugins/azure-devops/plugin.json');
const claudePlugin = readJson('plugins/azure-devops/.claude-plugin/plugin.json');
const codexMarketplace = readJson('.agents/plugins/marketplace.json');
const claudeMarketplace = readJson('.claude-plugin/marketplace.json');

test('Codex and Claude Code plugin manifests describe the same release', () => {
  for (const field of ['name', 'version', 'description', 'license', 'keywords']) {
    assert.deepEqual(claudePlugin[field], codexPlugin[field], field);
  }
});

test('Codex and Claude Code marketplaces publish the same plugin directory', () => {
  assert.equal(claudeMarketplace.name, codexMarketplace.name);
  const codexEntry = codexMarketplace.plugins.find(({ name }) => name === codexPlugin.name);
  const claudeEntry = claudeMarketplace.plugins.find(({ name }) => name === claudePlugin.name);
  assert.ok(codexEntry && claudeEntry);
  assert.equal(resolve(root, claudeEntry.source), resolve(root, codexEntry.source.path));
  assert.equal(resolve(root, claudeEntry.source), pluginRoot);
  assert.equal(claudeEntry.version, claudePlugin.version);
  assert.equal(claudeEntry.description, claudePlugin.description);
});

test('each skill has matching front matter and links that stay inside the plugin', () => {
  const skillsRoot = join(pluginRoot, 'skills');
  const skills = readdirSync(skillsRoot, { withFileTypes: true }).filter(entry => entry.isDirectory());
  assert.ok(skills.length > 0);
  for (const { name } of skills) {
    const file = join(skillsRoot, name, 'SKILL.md');
    const text = readFileSync(file, 'utf8');
    const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1];
    assert.ok(frontMatter, name + ' front matter');
    assert.match(frontMatter, new RegExp('^name: ' + name + '$', 'm'), name + ' name');
    assert.match(frontMatter, /^description: \S.+$/m, name + ' description');
  }

  const markdown = [];
  const walk = dir => readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith('.md')) markdown.push(path);
  });
  walk(skillsRoot);
  for (const file of markdown) {
    for (const [, target] of readFileSync(file, 'utf8').matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
      if (/^[a-z]+:/i.test(target)) continue;
      const linked = resolve(dirname(file), target);
      assert.ok(!relative(pluginRoot, linked).startsWith('..'), relative(root, file) + ' links outside the plugin: ' + target);
      assert.ok(existsSync(linked), relative(root, file) + ' has a broken link: ' + target);
    }
  }
});
