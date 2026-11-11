/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { SettingsService } from 'app/settings/settings.service';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { M3IconComponent } from '../m3-ui/m3-icon/m3-icon.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { UiThemeService } from '../ui-theme/ui-theme.service';

@Component({
  selector: 'mifosx-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIconButton,
    MatTooltip,
    M3IconComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThemeToggleComponent implements OnInit, OnChanges {
  private settingsService = inject(SettingsService);
  private uiThemeService = inject(UiThemeService);

  darkModeOn: boolean;

  /** Translation key describing the theme the toggle will switch to. */
  get themeToggleLabel(): string {
    return this.darkModeOn ? 'tooltips.Switch to light theme' : 'tooltips.Switch to dark theme';
  }

  ngOnInit(): void {
    this.darkModeOn = !!this.settingsService.themeDarkEnabled;
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.darkModeOn = !!this.settingsService.themeDarkEnabled;
  }

  /**
   * Toggle between light and dark themes
   * This method handles the complete theme switching process:
   * 1. Toggles the local state
   * 2. Applies Obsidian or the default Magma Soft palette, which also persists
   *    the dark-mode flag in settings
   */
  toggleTheme() {
    this.darkModeOn = !this.darkModeOn;
    this.uiThemeService.setDark(this.darkModeOn);
  }
}
