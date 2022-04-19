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
import { BASIC_SUB, PREMIUM_SUB } from '../lib/utils';

/**
 * SkuList holds a list of skus.
 *
 * @class SkuList
 * @extends {LitElement}
 */
class SkuList extends LitElement {
  /**
   * @readonly
   * @static
   */
  static get properties() {
    return {
      skus: { type: Array },
      purchases: { type: Array },
      service: { type: Object }, // Instance of PlayBillingService, see 'src/js/lib/play-billing.js'
      locale: { type: String },
      type: { type: String }, // Either photo, sku, or coin
    };
  }

  /**
   * Constructor
   */
  constructor() {
    super();
    this.skus = [];
    this.purchases = [];
    this.service = {};
    this.locale = 'en-US';
    this.type = 'sku';
  }

  /**
   * @typedef {Object} SkuTypeAndReplacedSKu
   * @property {string} skuType - sku type
   * @property {PurchaseDetails|undefined} purchaseDetails - purchase details for the replaced sku if upgrade or downgrade
   */

  /**
   *
   * @param {PurchaseDetails[]} basicSubPurchases
   * @param {PurchaseDetails[]} premiumSubPurchases
   * @param {string} itemId
   * @return {SkuTypeAndReplacedSKu}
   */
  skuType(basicSubPurchases, premiumSubPurchases, itemId) {
    let subNum = 0;
    if (itemId.startsWith(BASIC_SUB)) {
      subNum = itemId.slice(BASIC_SUB.length);
    } else if (itemId.startsWith(PREMIUM_SUB)) {
      subNum = itemId.slice(PREMIUM_SUB.length);
    }

    const matchingBasicSubPurchase = basicSubPurchases.find((basicSubPurchase) =>
      subNum.length == 0
        ? basicSubPurchase.itemId === BASIC_SUB
        : basicSubPurchase.itemId.endsWith(subNum),
    );
    const matchingPremiumSubPurchase = premiumSubPurchases.find((premiumSubPurchase) =>
      subNum.length == 0
        ? premiumSubPurchase.itemId === PREMIUM_SUB
        : premiumSubPurchase.itemId.endsWith(subNum),
    );
    if (itemId.startsWith(BASIC_SUB) && matchingPremiumSubPurchase) {
      return { skuType: 'downgrade', oldPurchase: matchingPremiumSubPurchase };
    } else if (itemId.startsWith(PREMIUM_SUB) && matchingBasicSubPurchase) {
      return { skuType: 'upgrade', oldPurchase: matchingBasicSubPurchase };
    } else {
      return { skuType: this.type };
    }
  }

  /**
   * @return {TemplateResult}
   */
  render() {
    const basicSubPurchases = this.purchases.filter((purchase) =>
      purchase.itemId.startsWith(BASIC_SUB),
    );
    const premiumSubPurchases = this.purchases.filter((purchase) =>
      purchase.itemId.startsWith(PREMIUM_SUB),
    );
    return html`${this.skus.map((sku) => {
      // Find if there's a purchase with the same itemId as the SKU
      const purchase = this.purchases.find((purchase) => purchase.itemId === sku.itemId);
      const { skuType, oldPurchase } = this.skuType(
        basicSubPurchases,
        premiumSubPurchases,
        sku.itemId,
      );
      return html` <sku-holder
        .type="${skuType}"
        .details=${sku}
        price="${this.service.getSkuPrice(sku, this.locale)}"
        .purchase=${purchase
          ? null
          : async function () {
              let purchaseMade;
              switch (skuType) {
                case 'downgrade':
                  // downgrade from premium to basic subscription
                  purchaseMade = await this.service.purchase(sku.itemId, oldPurchase, skuType);
                  break;
                case 'upgrade':
                  // upgrade from basic to premium subscription
                  purchaseMade = await this.service.purchase(sku.itemId, oldPurchase, skuType);
                  break;
                default:
                  // make a normal purchase
                  purchaseMade = await this.service.purchase(sku.itemId);
              }
              const { response, valid } = purchaseMade;
              const e = new CustomEvent('sku-purchase', {
                detail: {
                  sku,
                  response,
                  valid,
                },
                bubbles: true,
                composed: true,
              });
              this.dispatchEvent(e);
            }.bind(this)}
        .consume=${purchase
          ? async function () {
              await this.service.consume(purchase.purchaseToken);
              const e = new CustomEvent('sku-consume', {
                detail: {
                  purchase,
                },
                bubbles: true,
                composed: true,
              });
              this.dispatchEvent(e);
            }.bind(this)
          : null}
      ></sku-holder>`;
    })}`;
  }
}

customElements.define('sku-list', SkuList);
