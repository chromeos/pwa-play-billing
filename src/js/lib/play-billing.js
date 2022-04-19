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
    this.skus = [];
    this.service = null;
    this._init();
  }

  /**
   * Runs async initialization code
   * @private
   */
  async _init() {
    if (!('getDigitalGoodsService' in window)) {
      this.service = false;
      return;
    }
    try {
      if (this.service === null) {
        // Get Play Billing service
        this.service = Object.freeze(await window.getDigitalGoodsService(this.serviceURL)) || false;
      }
      if (this.service === false) {
        // DGAPI 1.0
        // Play Billing is not available.
      }
    } catch (error) {
      // DGAPI 2.0
      // Play Billing is not available.
      this.service = false;
    }
  }

  /**
   * Returns whether the DG service for Play Billing is available
   * @return {Promise<boolean>}
   */
  async isAvailable() {
    if (this.service === null) {
      await this._init();
    }

    return this.service !== false;
  }

  /**
   * Returns the purchase type for the provided purchase
   * @param {PurchaseDetails} purchase - Purchase to check type for
   * @return {PurchaseType}
   */
  getPurchaseType(purchase) {
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
    if (!(await this.isAvailable())) {
      throw new Error('DGAPI Play Billing is not available.');
    }

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
   * List existing entitlements that haven't been consumed yet or are on-going subscriptions.
   * Also, check with the backend server that user has been granted the entitlement
   * and that purchases are acknowledged.
   * @param {User} user
   * @return {PurchaseDetails[]} Also includes the purchase's purchase type
   */
  async getPurchases(user) {
    if (!(await this.isAvailable())) {
      throw new Error('DGAPI Play Billing is not available.');
    }

    if (this.skus.length == 0) {
      await this.updateSkus();
    }

    let purchases = (await this.service.listPurchases()).map((p) =>
      Object.assign(p, { purchaseType: this.getPurchaseType(p) }),
    );

    for (const purchase of purchases) {
      // Grant entitlement for all returned purchases (backend prevents double entitlements)
      await user.grantEntitlementAndAcknowledge(purchase, purchase.purchaseToken);
      // For any repeatable purchases, here we should consume them
      if (purchase.purchaseType === 'repeatable') {
        await this.consume(purchase.purchaseToken);
      }
    }

    // Update purchases again after backend request response is received
    purchases = (await this.service.listPurchases()).map((p) =>
      Object.assign(p, { purchaseType: this.getPurchaseType(p) }),
    );

    return Object.freeze(purchases);
  }

  /**
   * List most recent purchase for each item, even if they are no longer entitlements (e.g. has been consumed, cancelled, or expired).
   * @return {PurchaseDetails[]} Also includes the purchase's purchase type
   */
  async getPurchaseHistory() {
    if (!(await this.isAvailable())) {
      throw new Error('DGAPI Play Billing is not available.');
    }

    if (this.skus.length == 0) {
      await this.updateSkus();
    }

    let purchaseHistory = [];

    if ('listPurchaseHistory' in this.service) {
      // DGAPI 2.1
      purchaseHistory = await this.service.listPurchaseHistory();
    }

    return Object.freeze(purchaseHistory);
  }

  /**
   * List available SKUs
   * @return {Promise<PlayBillingServiceSku[]>}
   */
  async getSkus() {
    if (this.skus.length == 0) {
      await this.updateSkus();
    }

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

  /*
   * In the Digital Goods API v2.0, coming in M96 to Chrome, the client-side
   * acknowledge() method in the API has been removed.
   *
   * Instead, you can acknowledge purchases from a backend server using the Google Play
   * Developer API. The server has direct access to the user database, so using
   * the Google Play Developer API for acknowledgement is more reliable and less
   * vulnerable to fraud than acknowledging purchaes client-side.
   *
   * You should grant entitlements then acknowledge the purchase together in your
   * backend server. Therefore, we have removed the acknowledge() method in
   * this file, play-billing.js. Instead, we have a method grantEntitlementAndAcknowledge()
   * in src/js/lib/user.js that will send a POST request to our backend server
   * to verify the purchase, grant the entitlement, then call the appropriate Google Play
   * Developer API endpoint to acknowledge the purchase.
   *
   */

  /**
   * Forces a purchase token to be consumed.
   * Purchases are coerced into a 'repeatable' type as that's the only type that will trigger consumption in Play
   * @param {string} token - Purchase token
   */
  async consume(token) {
    if (!(await this.isAvailable())) {
      throw new Error('DGAPI Play Billing is not available.');
    }

    if ('acknowledge' in this.service) {
      // DGAPI 1.0
      return await this.service.acknowledge(token, 'repeatable');
    } else {
      // DGAPI 2.0
      return await this.service.consume(token);
    }
  }

  /**
   * Request that the provided SKU is purchased. Will acknowledge purchase on success
   * @param {PlayBillingServiceSku|string} purchaseSku - Either the SKU ID to purchase, or the actual SKU
   * @param {PurchaseDetails} oldPurchase - The previous subscription purchase to be replaced
   * @param {string} subType - The type of subscription purchase (upgrade, downgrade, or normal purchase)
   */
  async purchase(purchaseSku, oldPurchase, subType) {
    const skus = await this.getSkus();
    const sku =
      typeof purchaseSku === 'string' ? skus.find((s) => s.itemId === purchaseSku) : purchaseSku;

    /* 
    Set appropriate proration mode based on scenario. 
    See https://developer.android.com/google/play/billing/subscriptions#proration-recommendations
    for more information about the different proration modes and recommendations.
    */
    let prorationMode;
    switch (subType) {
      case 'upgrade':
        prorationMode = 'immediateAndChargeProratedPrice';
        break;
      case 'downgrade':
        prorationMode = 'deferred';
        break;
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
   * Call the backend to validate purchase
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
