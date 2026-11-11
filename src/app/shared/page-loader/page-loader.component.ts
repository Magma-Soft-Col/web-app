/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'mifosx-page-loader',
  template: `
    <div class="page-loader" role="status">
      <div class="magma-spinner" aria-hidden="true"></div>
      <span class="page-loader-text">{{ message }}</span>
    </div>
  `,
  styleUrls: ['./page-loader.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageLoaderComponent {
  @Input({ required: true }) message!: string;
}
