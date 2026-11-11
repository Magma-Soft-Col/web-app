/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';

import { SettingsService } from 'app/settings/settings.service';
import { ThemingService } from '../theme-toggle/theming.service';
import { UiThemeService } from './ui-theme.service';

describe('UiThemeService', () => {
  let service: UiThemeService;
  let theming: { setDarkMode: jest.Mock };
  let settings: { themeDarkEnabled: boolean; setThemeDarkEnabled: jest.Mock };

  beforeEach(() => {
    // setup-jest replaces localStorage with jest mocks.
    (localStorage.getItem as jest.Mock).mockReset();
    (localStorage.setItem as jest.Mock).mockReset();
    document.documentElement.removeAttribute('data-ui-theme');
    theming = { setDarkMode: jest.fn() };
    settings = { themeDarkEnabled: false, setThemeDarkEnabled: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ThemingService, useValue: theming },
        { provide: SettingsService, useValue: settings }
      ]
    });
    service = TestBed.inject(UiThemeService);
  });

  it('marks the document with a light palette and keeps Material in light mode', () => {
    service.select('emerald');

    expect(document.documentElement.getAttribute('data-ui-theme')).toBe('emerald');
    expect(theming.setDarkMode).toHaveBeenLastCalledWith(false);
    expect(service.current()).toBe('emerald');
    expect(localStorage.setItem).toHaveBeenCalledWith('msUiTheme', 'emerald');
  });

  it('switches to the dark surfaces for Obsidian without a palette attribute', () => {
    service.select('emerald');
    service.select('obsidian');

    expect(document.documentElement.hasAttribute('data-ui-theme')).toBe(false);
    expect(theming.setDarkMode).toHaveBeenLastCalledWith(true);
    expect(settings.setThemeDarkEnabled).toHaveBeenLastCalledWith(true);
  });

  it('restores the stored palette', () => {
    (localStorage.getItem as jest.Mock).mockImplementation((key: string) => (key === 'msUiTheme' ? 'ocean' : null));

    service.restore();

    expect(service.current()).toBe('ocean');
    expect(document.documentElement.getAttribute('data-ui-theme')).toBe('ocean');
  });

  it('falls back to the legacy dark-mode flag when nothing is stored', () => {
    settings.themeDarkEnabled = true;

    service.restore();

    expect(service.current()).toBe('obsidian');
  });

  it('ignores an unknown stored palette', () => {
    (localStorage.getItem as jest.Mock).mockImplementation((key: string) => (key === 'msUiTheme' ? 'neon' : null));

    service.restore();

    expect(service.current()).toBe('magma');
  });

  it('defaults to the Magma Soft palette', () => {
    service.restore();

    expect(service.current()).toBe('magma');
    expect(document.documentElement.getAttribute('data-ui-theme')).toBe('magma');
    expect(theming.setDarkMode).toHaveBeenLastCalledWith(false);
  });

  it('toggles between Magma Soft and Obsidian', () => {
    service.setDark(true);
    expect(service.current()).toBe('obsidian');

    service.setDark(false);
    expect(service.current()).toBe('magma');
  });
});
