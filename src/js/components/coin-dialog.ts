/*
 *  Copyright 2021 Google LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { LitElement, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

import '@material/mwc-button';

import './sku-list';
import { Dialog } from '@material/mwc-dialog';

/**
 *
 *
 * @class CoinDialog
 * @extends {LitElement}
 */
@customElement('coin-dialog')
class CoinDialog extends LitElement {
  @property() coinSkus = [];
  @property() service = {};
  @property() locale = 'en-US';

  @query('#coin-dialog') _coinDialog!: Dialog;

  /**
   *
   *
   * @return {*}
   * @memberof CoinDialog
   */
  render() {
    return html`
      <mwc-dialog id="coin-dialog" heading="Purchase coins">
        <slot name="theme"></slot>
        ${this.coinSkus.length == 0
          ? html`<p style="font-weight: bold;">
              Error loading coins for purchase. Digital Goods API not available.
            </p>`
          : html`<sku-list
              type="coin"
              .skus="${this.coinSkus}"
              .service="${this.service}"
            ></sku-list>`}
        <mwc-button slot="primaryAction" dialogAction="close"> Close </mwc-button>
      </mwc-dialog>
    `;
  }

  /**
   *
   *
   * @memberof CoinDialog
   */
  firstUpdated() {
    const dialog = this._coinDialog;
    dialog.addEventListener('closing', () => {
      const e = new CustomEvent('coin-dialog-close', {
        detail: {},
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(e);
    });
  }

  /**
   *
   *
   * @memberof CoinDialog
   */
  show() {
    console.log('show called');
    const dialog = this._coinDialog;
    dialog.show();
  }

  /**
   *
   *
   * @memberof CoinDialog
   */
  close() {
    console.log('close called');
    const dialog = this._coinDialog;
    dialog.close();
  }
}
