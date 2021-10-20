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

// Importing this module registers <mwc-button> as an element that you
// can use in this page.

import './components';

import { Firebase } from './lib/firebase';
import { User } from './lib/user';
import { authenticated, profile, purchases, availableItems } from './lib/application-store';
import { changeTheme, Log, refreshPurchases, VALID_THEME_NAMES, Notifier } from './lib/utils';

window.addEventListener('DOMContentLoaded', async (event) => {
  const appBar = document.getElementById('app-bar');
  const logBox = document.getElementById('log-box');
  const coinDialog = document.getElementById('coin-dialog');
  const themePicker = document.getElementById('theme-picker');
  const notifications = document.getElementById('notification');

  const log = new Log(logBox);
  const notify = new Notifier(notifications);

  // Launch debug logs
  document.getElementById('debug-btn').onclick = () => {
    document.getElementById('debug-box').show();
  };
  // Setup Firebase and authentication
  const firebase = new Firebase(appBar, log);

  let user = null;
  let service = null;

  // Get SKUs from back-end
  try {
    let { skus } = await (await fetch('/api/getSkus')).json();
    // Convert to PlayBillingSkuConfig style for Play Billing Service class
    skus = skus.map((sku) => ({
      itemId: sku.sku,
      purchaseType: sku.type,
    }));

    // Set up an instance of Play Billing Service
    const { PlayBillingService } = await import('./lib/play-billing');
    service = new PlayBillingService(skus);
  } catch (e) {
    log(e);
  }

  authenticated.subscribe(async (auth) => {
    if (auth) {
      // Gets the user's profile and sets the number of coins a user has
      user = new User(await firebase.getApiHeader(), log);
      if (service) {
        await marketSetup();
      }
    } else {
      user = null;
      profile.set({});
      purchases.set([]);
      availableItems.set([]);
    }
  });

  profile.subscribe((p) => {
    appBar.coinAmt = p.numCoins || 0;
    if (p.theme == null) {
      changeTheme('orange_you_glad_I_didnt_say_banana_orange');
    } else {
      changeTheme(p.theme);
      themePicker.purchasedTheme = p.theme;
      themePicker.resetPickerSelection();
    }
  });

  const skuList = document.querySelector('#items-to-buy');

  purchases.subscribe((updatedPurchases) => {
    if (updatedPurchases.length > 0) {
      log(`listPurchases returned ${JSON.stringify(updatedPurchases)}`);
    }
    skuList.purchases = updatedPurchases;
  });

  availableItems.subscribe((updatedAvailableItems) => {
    skuList.skus = [];
    coinDialog.coinSkus = [];
    updatedAvailableItems.forEach((sku) => {
      if (sku.itemId.startsWith('coins')) {
        coinDialog.coinSkus.push(sku);
      } else {
        skuList.skus.push(sku);
      }
    });
  });

  themePicker.themes = Object.keys(VALID_THEME_NAMES);

  themePicker.addEventListener('color-selected', (e) => {
    changeTheme(e.detail.selectedColor);
  });

  themePicker.addEventListener('color-purchased', async (e) => {
    const purchasedColor = e.detail.selectedColor;
    if (await user.setTheme(purchasedColor)) {
      // Need to catch errors
      notify(`Color ${purchasedColor} successfully purchased`);
      await refreshPurchases(service, user);
    } else {
      notify(`Purchase failed`);
    }
  });

  appBar.addEventListener('show-coin-menu', () => {
    log('load the coin menu');
    coinDialog.show();
  });

  coinDialog.addEventListener('coin-dialog-close', () => {
    changeTheme(themePicker.purchasedTheme);
    themePicker.resetPickerSelection();
  });

  /**
   * Sets up the available skus to be displayed in the app for purchase and consumption
   */
  async function marketSetup() {
    // Check to see if the Digital Goods API is available
    if (await service.isAvailable()) {
      log('Digital Goods Service is available!');
      try {
        // Attach the service to skuList
        skuList.service = service;
        coinDialog.service = service;

        const skus = await service.getSkus();
        log(`getDetails returned ${JSON.stringify(skus)}`);
        availableItems.set(skus || []);

        await refreshPurchases(service, user);

        document.addEventListener('sku-consume', async (e) => {
          const purchase = e.detail.purchase;
          log(`Sku ${purchase.itemId} was consumed`);
          await user.removeEntitlement(purchase);
          await refreshPurchases(service, user);
          notify(`${purchase.itemId} Consumed!`);
        });

        document.addEventListener('sku-purchase', async (e) => {
          if (e.detail.valid) {
            const sku = e.detail.sku;
            log(`Sku ${sku.itemId} was purchased`);
            const token = e.detail.response.details.token;
            await user.grantEntitlementAndAcknowledge(sku, token);
            /*
             * Note that we have moved purchase acknowledgement to the backend
             * server via the Google Play Developer API to be more secure.
             * Granting entitlements and acknowledging the purchase now
             * happen in the same call on the backend.
             *
             * Please see functions/src/index.ts for the implementation.
             */
            // If purchase is repeatable, consume it immediately
            if (service.getPurchaseType(sku) === 'repeatable') {
              await service.consume(token);
            }
            // Refreshes the profiles entitlements and the purchased items.
            await refreshPurchases(service, user);
            notify(`${sku.title} Purchased!`);
          }
        });
      } catch (e) {
        log(e);
      }
    } else {
      log('The Digital Goods API is required for this demo!');
    }
  }
});
