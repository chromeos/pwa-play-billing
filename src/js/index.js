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

  // Check to see if the Digital Goods API is available
  if ('getDigitalGoodsService' in window) {
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
  }

  authenticated.subscribe(async (auth) => {
    if (auth) {
      // Gets the user's profile and sets the number of coins a user has
      user = new User(await firebase.getApiHeader(), log);
      await refreshPurchases(service, user);
    } else {
      user = null;
      profile.set({});
      purchases.set([]);
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
      refreshPurchases(service, user);
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

  // Check to see if the Digital Goods API is available
  if (service) {
    try {
      // Attach the service to skuList
      skuList.service = service;
      coinDialog.service = service;

      availableItems.set((await service.getSkus()) || []);

      await refreshPurchases(service, user);

      document.addEventListener('sku-consume', async (e) => {
        log(`Sku ${e.detail.purchase.itemId} was consumed`);
        await refreshPurchases(service, user);
      });

      document.addEventListener('sku-purchase', async (e) => {
        if (e.detail.valid) {
          log(`Sku ${e.detail.sku.itemId} was purchased`);
          const sku = e.detail.sku;
          const token = e.detail.response.details.token;
          await user.grantEntitlement(sku, token);
          /*
           * Note that for the purposes of this sample to use Digital Goods API,
           * purchases are acknowledged in the client app but we recommend acknowledging
           * purchases in your backend server via the Google Play Developer API,
           * to be more secure. In this sample app, we only acknowledge purchases
           * after successfully validating the purchasetoken and purchase state in our server.
           */
          await service.acknowledge(token, sku);
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
});
