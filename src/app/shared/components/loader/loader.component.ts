/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'mifosx-loader',
  template: `
    <div class="mifosx-loader-container">
      <div class="magma-spinner" role="status" aria-label="Loading"></div>
    </div>
  `,
  styles: [
    `
      .mifosx-loader-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        width: 100%;
        background-color: transparent;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoaderComponent {}
