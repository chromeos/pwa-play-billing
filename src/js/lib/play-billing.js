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

/**
 * @typedef {Object} PlayBillingLookupItem
 * @property {string} itemId - ID of the item
 * @property {PurchaseType} purchaseType - Type of purchase
 */

/**
 * Play Billing Service
 *
 * Creates an instance of Play Billing Service that can be used to make purchases from Play from within a PWA installed from Play using the Digital Goods API
 */
export class PlayBillingService {
  /**
   * @param {PlayBillingLookupItem[]} lookups - Array of lookup items (itemId, purchaseType)
   */
  constructor(lookups) {
    this.lookups = Object.freeze(lookups);
    this.serviceURL = 'https://play.google.com/billing';
    this.init();
  }

  /**
   * Runs async initialization code
   * @private
   */
  async init() {
    // Get service
    if (!this.service) {
      this.service = Object.freeze(await window.getDigitalGoodsService(this.serviceURL));
    }

    // Get item details
    if (!this.skus) {
      await this.updateSkus();
    }
  }

  /**
   * Returns the purchase type for the provided purchase
   * @private
   * @param {PurchaseDetails} purchase - Purchase to check type for
   * @return {PurchaseType}
   */
  _getPurchaseType(purchase) {
    const purchaseType = this.skus.find((sku) => sku.itemId === purchase.itemId)
      ? purchase.purchaseType
      : 'onetime';
    return purchaseType;
  }

  /**
   * Updates service's SKUs with the latest info from Play.
   * Optionally can update the available SKUs for this service, too
   * @param {PlayBillingLookupItem[]} lookups - Array of lookup items (itemId, purchaseType)
   */
  async updateSkus(lookups) {
    if (lookups) {
      this.lookups = Object.freeze(lookups);
    }

    const details = await this.service.getDetails(this.lookups.map((sku) => sku.itemId));
    this.skus = Object.freeze(
      details.map((d) =>
        Object.assign(
          d,
          this.lookups.find((s) => s.itemId === d.itemId),
        ),
      ),
    );
  }

  /**
   * List existing entitlements that haven't been consumed yet or are on-going subscriptions
   * @return {PurchaseDetails[]} Also includes the purchase's purchase typ
   */
  async getPurchases() {
    if (!this.skus) {
      await this.init();
    }
    const purchases = (await this.service.listPurchases()).map((p) =>
      Object.assign(p, { purchaseType: this._getPurchaseType(p) }),
    );

    return Object.freeze(purchases);
  }

  /**
   * List available SKUs
   * @return {PlayBillingServiceSku[]}
   */
  async getSkus() {
    if (!this.skus) await this.init();

    return this.skus;
  }

  /**
   * Get the SKU's price in the provided currency
   * @param {PlayBillingServiceSku} sku - SKU to determine price for
   * @param {string} locale - Locale to convert price into
   * @return {string}
   */
  getSkuPrice(sku, locale) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: sku.price.currency,
    }).format(Number(sku.price.value));
  }

  /**
   *
   * @param {string} token - Purchase token
   * @param {PurchaseDetailsWithType|PlayBillingServiceSku} item - SKU or purchase to acknowledge
   */
  async acknowledge(token, item) {
    if (!this.service) {
      await this.init();
    }

    // Subscriptions need to be acknowledges as 'onetime'
    const type = item.purchaseType === 'subscription' ? 'onetime' : item.purchaseType;

    return await this.service.acknowledge(token, type);
  }

  /**
   * Forces a purchase token to be consumed.
   * Purchases are coerced into a 'repeatable' type as that's the only type that will trigger consumption in Play
   * @param {string} token - Purchase token
   */
  async consume(token) {
    return await this.acknowledge(token, { purchaseType: 'repeatable' });
  }

  /**
   * Request that the provided SKU is purchased. Will acknowledge purchase on success
   * @param {PlayBillingServiceSku|string} purchaseSku - Either the SKU ID to purchase, or the actual SKU
   */
  async purchase(purchaseSku) {
    if (!this.service || !this.skus) await this.init();

    const sku =
      typeof purchaseSku === 'string'
        ? this.skus.find((s) => s.itemId === purchaseSku)
        : purchaseSku;

    // Build payment request
    const paymentMethod = [
      {
        supportedMethods: this.serviceURL,
        data: {
          sku: sku.itemId,
        },
      },
    ];

    const payment = new PaymentRequest(paymentMethod);
    const response = await payment.show();
    const { token } = response.details;

    // Call backend to validate the purchase
    const valid = await this.validatePurchaseOnBackend(sku, token);
    if (valid) {
      // Tell PaymentRequest API validation was successful.
      // The user-agent may show a "payment successul" message to the user.
      await response.complete('success');
    } else {
      // Tell PaymentRequest API validation failed.
      // The user-agent may show a message to the user.
      await response.complete('fail');
    }

    return { response, valid };
  }

  /**
   *
   * @param {PlayBillingServiceSku} sku
   * @param {string} token
   */
  async validatePurchaseOnBackend(sku, token) {
    let request = '';

    if (sku.purchaseType === 'subscription') {
      request = '/api/validateSubPurchase';
    } else {
      request = '/api/validatePurchase';
    }

    try {
      const response = await (
        await fetch(request, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sku: sku.itemId,
            token,
          }),
        })
      ).json();

      if (!('error' in response)) {
        return response.status;
      } else {
        return false;
      }
    } catch (error) {
      throw new Error(`Failed to verify purchase token: ${error.message}`);
    }
  }
}
