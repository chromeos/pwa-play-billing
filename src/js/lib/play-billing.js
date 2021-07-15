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
    const skuMatch = this.skus.find((sku) => sku.itemId === purchase.itemId);
    const purchaseType = skuMatch ? skuMatch.purchaseType : 'onetime';
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
   * @return {PurchaseDetails[]} Also includes the purchase's purchase type
   */
  async getPurchases() {
    if (!this.skus) {
      await this.init();
    }
    let purchases = (await this.service.listPurchases()).map((p) =>
      Object.assign(p, { purchaseType: this._getPurchaseType(p) }),
    );

    // Acknowledge any un-acknowledged purchases.
    let acknowledged = false;
    for (const purchase of purchases) {
      if (purchase.purchaseState == 'purchased' && !purchase.acknowledged) {
        await this.acknowledge(purchase.purchaseToken, purchase);
        acknowledged = true;
      }
    }

    // Update purchases again after acknowledging un-acknowledged purchases
    if (acknowledged) {
      purchases = (await this.service.listPurchases()).map((p) =>
        Object.assign(p, { purchaseType: this._getPurchaseType(p) }),
      );
    }

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
   * Apps should acknowledge the purchase after confirming that the purchase token
   * has been associated with a user. This app only acknowledges purchases after
   * successfully receiving the subscription data back from the server.
   *
   * Developers can choose to acknowledge purchases from a server using the
   * Google Play Developer API. The server has direct access to the user database,
   * so using the Google Play Developer API for acknowledgement might be more reliable.
   *
   * If the purchase token is not acknowledged within 3 days,
   * then Google Play will automatically refund and revoke the purchase.
   * This behavior helps ensure that users are not charged for subscriptions unless the
   * user has successfully received access to the content.
   * This eliminates a category of issues where users complain to developers
   * that they paid for something that the app is not giving to them.
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
   * @param {PurchaseDetails} oldPurchase - The previous subscription purchase to be replaced
   * @param {string} subType - The type of subscription purchase (upgrade, downgrade, or normal purchase)
   */
  async purchase(purchaseSku, oldPurchase, subType) {
    if (!this.service || !this.skus) await this.init();

    const sku =
      typeof purchaseSku === 'string'
        ? this.skus.find((s) => s.itemId === purchaseSku)
        : purchaseSku;

    /* 
    Set appropriate proration mode based on scenario. 
    See https://developer.android.com/google/play/billing/subscriptions#proration-recommendations
    for more information about the different proration modes and recommendations.
    */
    let prorationMode = 'deferred';
    if (subType === 'upgrade') {
      prorationMode = 'immediateAndChargeProratedPrice';
    }
    // Build payment request
    const paymentMethod = [
      {
        supportedMethods: this.serviceURL,
        data: {
          sku: sku.itemId,
          oldSku: oldPurchase?.itemId,
          purchaseToken: oldPurchase?.purchaseToken,
          prorationMode: prorationMode,
        },
      },
    ];

    const payment = new PaymentRequest(paymentMethod);
    const response = await payment.show();
    const { purchaseToken } = response.details;

    // Call backend to validate the purchase
    const valid = await this.validatePurchaseOnBackend(sku, purchaseToken);
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
