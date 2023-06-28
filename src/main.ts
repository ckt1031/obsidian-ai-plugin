import { addIcon, Notice, Plugin } from 'obsidian';

import { runPrompts } from './generate';
import AiIcon from './icons/ai';
import { log } from './logging';
import { deobfuscateConfig, obfuscateConfig } from './obfuscate-config';
import { PROMPTS } from './prompts';
import { SettingTab } from './settings-tab';
import {
	type ObfuscatedPluginSettings,
	ObfuscatedPluginSettingsSchema,
	type PluginSettings,
} from './types';

const DEFAULT_SETTINGS: PluginSettings = {
	openAiApiKey: '',
	openAiBaseUrl: 'https://api.openai.com',
	openAiModel: 'gpt-3.5-turbo',
	maxTokens: 2000,
	temperature: 0.5,
	presencePenalty: 0,
	frequencyPenalty: 0,
	debugMode: false,
};

export default class AiPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		addIcon('openai', AiIcon);

		for (const prompt of PROMPTS) {
			// slugify and remove spaces
			const iconName = prompt.name.toLowerCase().replaceAll(/\s/g, '-');
			// Add icon if it exists
			if (prompt.icon) addIcon(iconName, prompt.icon);

			this.addCommand({
				id: prompt.name,
				name: prompt.name,
				icon: prompt.icon ? iconName : AiIcon,
				editorCallback: async editor => {
					try {
						await runPrompts(editor, this.settings, prompt.name);
					} catch (error) {
						if (error instanceof Error) {
							log(this.settings, error.message);
						}
						new Notice('Error generating text.');
					}
				},
			});
		}

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));

		log(this.settings, 'Loaded plugin.');
	}

	onunload() {
		// This is called when the plugin is deactivated
	}

	async resetSettings() {
		this.settings = DEFAULT_SETTINGS;
		await this.saveSettings();
	}

	async loadSettings() {
		const localData: ObfuscatedPluginSettings = await this.loadData();

		const { success } = await ObfuscatedPluginSettingsSchema.safeParseAsync(localData);

		if (!success) {
			this.settings = DEFAULT_SETTINGS;
			console.log('Failed to parse settings, using defaults.');
			return;
		}

		this.settings = Object.assign({}, DEFAULT_SETTINGS, deobfuscateConfig(localData));
	}

	async saveSettings() {
		await this.saveData(obfuscateConfig(this.settings));
	}
}
