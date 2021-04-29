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

import { LitElement, html, HTMLTemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '@material/mwc-button';

export interface PurchaseDetails {
  itemId: string,
  purchaseType: string,
  title: string,
  price: {
    currency: string,
    value: string,
  },
  description: string,
}

/**
 * SkuHolder holds a sku and purchasing options for that sku. This is a class that was useful when doing generic testing with the app.
 *
 * @class SkuHolder
 * @extends {LitElement}
 */
@customElement('sku-holder')
export class SkuHolder extends LitElement {
  @property({ type: Object, reflect: true }) details: PurchaseDetails = {
                                            itemId: 'testId',
                                            purchaseType: 'onetime',
                                            title: 'testTitle',
                                            price: {
                                              currency: 'USD',
                                              value: '0.99000',
                                            },
                                            description: 'Worlds best pizza',
                                          };
  @property({ type: String }) price: string = '$0.99';
  @property({ type: String }) type: string = 'sku';
  @property({ type: Function }) consume: Function = () => {
    console.log('Consume funcition not set.');
  };
  @property({ type: Function }) purchase: Function = () => {
    console.log('Purchase function not set');
  };

  /**
   * hasConsumeBtn validates whether or not this item is a consumable item or not. Then it indicates to the render function whether to render the HTML.
   *
   * @param {string} purchaseType
   * @return {TemplateResult}
   * @memberof SkuHolder
   */
  hasConsumeBtn(purchaseType: string): HTMLTemplateResult {
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
   * purchaseBtn determines whether this item is a subscription downgrade or upgrade, or a regular purchase. Then it renders the HTML for it.
   *
   * @return {TemplateResult}
   * @memberof SkuHolder
   */
  purchaseBtn(): HTMLTemplateResult {
    let purchaseVerb;
    switch (this.type) {
      case 'upgrade':
        purchaseVerb = 'Upgrade';
        break;
      case 'downgrade':
        purchaseVerb = 'Downgrade';
        break;
      default:
        purchaseVerb = 'Purchase';
    }
    return html`<mwc-button
      ?disabled="${this.purchase === null}"
      raised
      label="${purchaseVerb} for ${this.price}"
      @click="${this.purchase}"
    ></mwc-button>`;
  }

  /**
   *
   *
   * @return {TemplateResult}
   * @memberof SkuHolder
   */
  render(): HTMLTemplateResult {
    return html`
      <div id="purchase_box__${this.details.itemId}">
        ${this.type === 'coin'
          ? html`<p style="font-weight: bold;">${this.details.title}</p>`
          : html`<h1>${this.details.title}</h1>`}
        <p>${this.details.description}</p>
        ${this.type === 'coin'
          ? html``
          : html`<p>You currently ${this.purchase === null ? '' : `don't`} own this item.</p>`}
        ${this.purchaseBtn()} ${this.hasConsumeBtn(this.details.purchaseType)}
      </div>
    `;
  }
}
