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
 * Manage user information from the back-end
 */
export class User {
  /**
   *
   * @param {Headers} auth - Authorization headers with a Firebase JWT token
   * @param {function} log - Logging function to use
   */
  constructor(auth, log) {
    this.auth = auth;
    this.log = log;
  }

  /**
   * Get the current user's info from server.
   */
  async getInfo() {
    try {
      const response = await (
        await fetch('/api/getUser', {
          method: 'post',
          headers: this.auth,
        })
      ).json();

      if (!('error' in response)) {
        this.log(JSON.stringify(response));
        return response;
      } else {
        this.log(response.error);
      }
    } catch (error) {
      this.log(error.message);
    }
  }

  /**
   * Fetch request for entitlement for given purchase token and associated sku from server.
   * @param {PlayBillingSkuConfig|PlayBillingServiceSku|PurchaseDetailsWithType} sku - SKU to grant entitlement for
   * @param {string} token - Purchase token
   */
  async grantEntitlementAndAcknowledge(sku, token) {
    let request = '';

    if (sku.purchaseType === 'subscription') {
      request = '/api/setHasSub';
    } else if (sku.purchaseType === 'onetime') {
      request = '/api/addPhoto';
    } else if (sku.itemId.startsWith('coins')) {
      request = '/api/addCoins';
    } else {
      this.log(`Cannot grant entitlement for invalid sku: ${sku.itemId}`);
      return;
    }

    try {
      const response = await (
        await fetch(request, {
          method: 'POST',
          headers: this.auth,
          body: JSON.stringify({
            sku: sku.itemId,
            token,
          }),
        })
      ).json();
      this.log(JSON.stringify(response));
      // TODO: check for error in response
    } catch (error) {
      this.log('Failed to grant entitlement');
      this.log(error.message);
    }
  }

  /**
   *
   * @param {string} color - Color to set the theme
   */
  async setTheme(color) {
    try {
      const response = await (
        await fetch('/api/setTheme', {
          method: 'POST',
          headers: this.auth,
          body: JSON.stringify({
            color,
          }),
        })
      ).json();
      this.log(JSON.stringify(response));
      if (response.error) {
        return false;
      }
      return true;
    } catch (error) {
      this.log('Failed to set theme');
      this.log(error.message);
      return false;
    }
  }
}
