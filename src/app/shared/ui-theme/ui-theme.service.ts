/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject, signal } from '@angular/core';

import { SettingsService } from 'app/settings/settings.service';
import { ThemingService } from '../theme-toggle/theming.service';

/** A predesigned palette of the Design System (see `_ms-tokens.scss`). */
export interface UiTheme {
  id: string;
  /** Translation key of the theme name. */
  label: string;
  /** Whether the theme uses the dark surfaces (Material dark theme on). */
  dark: boolean;
  /** Sidebar, primary and page background, for the picker swatch. */
  swatch: [
    string,
    string,
    string
  ];
}

export const UI_THEMES: UiTheme[] = [
  {
    id: 'magma',
    label: 'labels.themes.Magma',
    dark: false,
    swatch: [
      '#0a111a',
      '#ce5800',
      '#f6f6f5'
    ]
  },
  {
    id: 'midnight',
    label: 'labels.themes.Midnight',
    dark: false,
    swatch: [
      '#14243a',
      '#315e9e',
      '#f5f7fa'
    ]
  },
  {
    id: 'obsidian',
    label: 'labels.themes.Obsidian',
    dark: true,
    swatch: [
      '#0a111a',
      '#f08a3c',
      '#0f1620'
    ]
  },
  {
    id: 'ivory',
    label: 'labels.themes.Ivory',
    dark: false,
    swatch: [
      '#2b3440',
      '#315e9e',
      '#f7f5f0'
    ]
  },
  {
    id: 'emerald',
    label: 'labels.themes.Emerald',
    dark: false,
    swatch: [
      '#0f2a20',
      '#18794e',
      '#f4f7f5'
    ]
  },
  {
    id: 'ocean',
    label: 'labels.themes.Ocean',
    dark: false,
    swatch: [
      '#0b2a2a',
      '#0f766e',
      '#f3f7f7'
    ]
  },
  {
    id: 'indigo',
    label: 'labels.themes.Indigo',
    dark: false,
    swatch: [
      '#1e1b4b',
      '#4338ca',
      '#f5f5fa'
    ]
  },
  {
    id: 'graphite',
    label: 'labels.themes.Graphite',
    dark: false,
    swatch: [
      '#1f2329',
      '#3f5872',
      '#f4f5f7'
    ]
  }
];

/**
 * Applies the predesigned palette the user picked. The choice is a per-browser
 * preference: it is stored locally and does not change the tenant branding.
 * Magma Soft is the default palette; Midnight keeps the tenant's configured
 * brand colour.
 */
@Injectable({ providedIn: 'root' })
export class UiThemeService {
  private themingService = inject(ThemingService);
  private settingsService = inject(SettingsService);

  /** Renamed with the Magma Soft default so earlier picks do not hide it. */
  private readonly storageKey = 'msUiTheme';

  readonly themes = UI_THEMES;
  /** Id of the active palette. */
  readonly current = signal<string>('magma');

  /** Re-applies the stored palette; falls back to the legacy dark-mode flag. */
  restore(): void {
    const stored = this.read();
    const fallback = this.settingsService.themeDarkEnabled ? 'obsidian' : 'magma';
    this.apply(this.themes.some((theme) => theme.id === stored) ? stored : fallback);
  }

  /** Switches between the default light palette and Obsidian (light/dark toggle). */
  setDark(dark: boolean): void {
    this.select(dark ? 'obsidian' : 'magma');
  }

  /** Activates and remembers a palette. */
  select(id: string): void {
    this.apply(id);
    this.write(id);
  }

  private apply(id: string): void {
    const theme = this.themes.find((candidate) => candidate.id === id) ?? this.themes[0];
    const root = document.documentElement;
    if (theme.id === 'midnight' || theme.id === 'obsidian') {
      root.removeAttribute('data-ui-theme');
    } else {
      root.setAttribute('data-ui-theme', theme.id);
    }
    // Settings first: theme subscribers read the flag back from it.
    this.settingsService.setThemeDarkEnabled(theme.dark);
    this.themingService.setDarkMode(theme.dark);
    this.current.set(theme.id);
  }

  private read(): string | null {
    try {
      return localStorage.getItem(this.storageKey);
    } catch {
      return null;
    }
  }

  private write(id: string): void {
    try {
      localStorage.setItem(this.storageKey, id);
    } catch {
      // Best effort: the palette still applies for this session.
    }
  }
}
