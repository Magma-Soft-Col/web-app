/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Magma Soft launch screen (index.html `#ms-cargador`): the rocket rises and
 * floats while the app boots, then takes off, the same animation as the
 * magmasoft landing page and Magma Contable. It stays up at least as long as on
 * the landing page so the take-off is never cut short.
 */

const SPLASH_ID = 'ms-cargador';
const MIN_VISIBLE_MS = 1200;

let shownAt = 0;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

function splash(): HTMLElement | null {
  return document.getElementById(SPLASH_ID);
}

/** Lets the rocket take off once it has been visible for the minimum time. */
export function hideSplash(): void {
  const element = splash();
  if (!element || element.classList.contains('despegue')) {
    return;
  }
  clearTimeout(hideTimer);
  const elapsed = performance.now() - shownAt;
  hideTimer = setTimeout(
    () => {
      element.classList.add('despegue');
      element.setAttribute('aria-hidden', 'true');
    },
    Math.max(0, MIN_VISIBLE_MS - elapsed)
  );
}

/** Plays the launch again, e.g. while the home page opens after signing in. */
export function launchSplash(): void {
  const element = splash();
  if (!element) {
    return;
  }
  clearTimeout(hideTimer);
  element.classList.remove('despegue');
  element.removeAttribute('aria-hidden');
  // Restart the CSS animations from the first frame.
  const logo = element.querySelector<HTMLElement>('.cargador-logo');
  if (logo) {
    logo.style.animation = 'none';
    void logo.offsetWidth;
    logo.style.animation = '';
  }
  shownAt = performance.now();
  hideTimer = setTimeout(hideSplash, 0);
}
