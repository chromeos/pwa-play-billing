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

import { LitElement, html } from 'lit-element';
import { PREMIUM_SUB } from '../lib/utils';

import '@material/mwc-button';

/**
 * SkuHolder holds a sku and purchasing options for that sku. This is a class that was useful when doing generic testing with the app.
 *
 * @class SkuHolder
 * @extends {LitElement}
 */
class SkuHolder extends LitElement {
  /**
   *
   *
   * @readonly
   * @static
   * @memberof SkuHolder
   */
  static get properties() {
    return {
      details: { type: Object, reflect: true }, // We may just want pass this in directly.
      price: { type: String },
      purchase: { type: Function },
      consume: { type: Function },
      type: { type: String },
    };
  }

  /**
   * Creates an instance of SkuHolder.
   * @memberof SkuHolder
   */
  constructor() {
    super();
    this.details = {
      itemId: 'testId',
      purchaseType: 'onetime',
      title: 'testTitle',
      price: {
        currency: 'USD',
        value: '0.99000',
      },
      description: 'Worlds best pizza',
    };
    this.price = '$0.99';
    this.purchase = () => {
      console.log('Purchase function not set');
    };

    this.consume = () => {
      console.log('Consume funcition not set.');
    };
    this.type = 'sku';
  }

  /**
   * hasConsumeBtn validates whether or not this item is a consumable item or not. Then it indicates to the render function whether to render the HTML.
   *
   * @param {string} purchaseType
   * @return {TemplateResult}
   * @memberof SkuHolder
   */
  hasConsumeBtn(purchaseType) {
    if (purchaseType == 'onetime') {
      return html`<mwc-button
        ?disabled="${this.consume === null}"
        raised
        label="Consume ${this.details.itemId}"
        @click="${this.consume}"
      ></mwc-button>`;
    }
    return html``;
  }

  /**
   *
   *
   * @return {TemplateResult}
   * @memberof SkuHolder
   */
  render() {
    return html`
      <div id="purchase_box__${this.details.itemId}">
        ${this.type === 'coin'
          ? html`<p style="font-weight: bold;">${this.details.title}</p>`
          : html`<h1>${this.details.title}</h1>`}
        <p>${this.details.description}</p>
        ${this.type === 'coin'
          ? html``
          : html`<p>You currently ${this.purchase === null ? '' : `don't`} own this item.</p>`}
        <mwc-button
          ?disabled="${this.purchase === null}"
          raised
          label="${this.details.itemId === PREMIUM_SUB ? 'Upgrade ' : 'Purchase '} for ${this
            .price}"
          @click="${this.purchase}"
        ></mwc-button>
        ${this.hasConsumeBtn(this.details.purchaseType)}
      </div>
    `;
  }
}

customElements.define('sku-holder', SkuHolder);
