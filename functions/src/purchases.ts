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

import * as billing from './billing';
import { google } from 'googleapis';
import * as myconfig from './config';
import { coinValues, SKU_BASIC_SUB, SKU_PREMIUM_SUB } from './skusValue';
import { getUserData } from './usersdb';
import { addPurchaseToken, addSubscriptionToken } from './tokensdb';
import * as FirebaseFirestore from '@google-cloud/firestore';

// Initialize the Google API Client from service account credentials
const jwtClient = new google.auth.JWT({
  keyFile: myconfig.serviceAccountJsonFilePath,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});

// Connect to the Google Play Developer API with JWT Client
const playApi = google.androidpublisher({
  version: 'v3',
  auth: jwtClient,
});

interface ChangeResult {
  success: boolean;
  userCoinValue: number;
}

/**
 *  Acknowledge an in-app item purchase with Play Developer API.
 *
 * @param {string} sku is the sku that is attempting to be validated
 * @param {string} purchaseToken is the token that was provided with this sku to be validated.
 * @return {(Promise<boolean>)} whether the acknowledgement of the in-app purchase was successful
 */
export async function acknowledgeInAppPurchase(
  sku: string,
  purchaseToken: string,
): Promise<boolean> {
  try {
    const apiResponse = (
      await playApi.purchases.products.acknowledge({
        packageName: myconfig.packageName,
        productId: sku,
        token: purchaseToken,
      })
    )?.data;
    if (JSON.stringify(apiResponse) === `""`) {
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error acknowledging in-app purchase : ${error}`);
    return false;
  }
}

/**
 * Acknowledge a subscription purchase with  Play Developer API.
 * @param {string} sku
 * @param {string} purchaseToken
 * @return {(Promise<boolean>)} whether the acknowledgement of the subscription purchase was successful
 */
export async function acknowledgeSubPurchase(sku: string, purchaseToken: string): Promise<boolean> {
  try {
    const apiResponse = (
      await playApi.purchases.subscriptions.acknowledge({
        packageName: myconfig.packageName,
        subscriptionId: sku,
        token: purchaseToken,
      })
    )?.data;
    if (JSON.stringify(apiResponse) === `""`) {
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error acknowledging subscription purchase : ${error}`);
    return false;
  }
}

/**
 *  Fetch a purchase from the Play Developer API and validate that it has not been consumed already.
 *
 * @param {string} sku is the sku that is attempting to be validated
 * @param {string} purchaseToken is the token that was provided with this sku to be validated.
 */
export async function fetchPurchase(
  sku: string,
  purchaseToken: string,
): Promise<billing.Purchase | null> {
  try {
    const apiResponse = (
      await playApi.purchases.products.get({
        packageName: myconfig.packageName,
        productId: sku,
        token: purchaseToken,
      })
    )?.data;
    console.log(`PlayAPI Response : ${JSON.stringify(apiResponse)}`);
    return billing.Purchase.fromApiResponse(apiResponse, purchaseToken, sku);
  } catch (error) {
    console.error(`Error fetching purchase info : ${error}`);
    return null;
  }
}

/**
 * Fetch full subscription purchase details from Play Developer API.
 * @param {string} sku
 * @param {string} purchaseToken
 */
export async function fetchSubscriptionPurchase(
  sku: string,
  purchaseToken: string,
): Promise<billing.SubscriptionPurchase | null> {
  try {
    const apiResponse = (
      await playApi.purchases.subscriptions.get({
        packageName: myconfig.packageName,
        subscriptionId: sku,
        token: purchaseToken,
      })
    )?.data;
    console.log(`PlayAPI Response : ${JSON.stringify(apiResponse)}`);
    return billing.SubscriptionPurchase.fromApiResponse(apiResponse, purchaseToken);
  } catch (error) {
    console.error(`Error fetching subscription purchase info : ${error}`);
    return null;
  }
}

// TODO update return type to changeResult
/**
 * Add the purchase's corresponding coin value to the user's account.
 * @param {FirebaseFirestore.DocumentReference} userRef
 * @param {billing.Purchase} purchase
 */
export async function addCoins(
  userRef: FirebaseFirestore.DocumentReference,
  purchase: billing.Purchase,
): Promise<boolean> {
  if (!userRef) {
    return false;
  }
  // console.log(`Looking up ${purchase.productId}`);
  const coinValue = coinValues[purchase.productId]; // Simulates reading the number of items from a database.
  // console.log(`coin_value : ${coin_value}`);
  if (coinValue === 0 || coinValue === undefined) {
    return false;
  }

  const userData = await getUserData(userRef);
  if (!userData) {
    return false;
  }

  // console.log(`Attempting to add token`);
  // Add the purchase to the token store.
  const tokenAdded = await addPurchaseToken(userRef, purchase);

  if (!tokenAdded) {
    console.error('Could not add token');
    return false;
  }

  return userRef
    .update({
      numCoins: userData.numCoins + coinValue,
    })
    .then(function (): boolean {
      console.log(`Added ${coinValue} coins`);
      return true;
    })
    .catch(function (error: Error): boolean {
      console.error(`Could not add ${coinValue} to users reference : ${error}`);
      return false;
    });
}

/**
 * Change the user's app theme and subtract the cost from their coins.
 * @param {FirebaseFirestore.DocumentReference} userRef
 * @param {number} numCoins
 * @param {string} themeColor
 */
export async function setTheme(
  userRef: FirebaseFirestore.DocumentReference,
  numCoins: number,
  themeColor: string,
): Promise<ChangeResult> {
  if (!userRef) {
    return { success: false, userCoinValue: 0 };
  }

  const userData = await getUserData(userRef);
  if (!userData) {
    return { success: false, userCoinValue: 0 };
  }

  const newCoinValue = userData.numCoins - numCoins;
  // Fail if not enough coins or requested theme color is the same as current
  if (newCoinValue < 0 || userData.theme === themeColor) {
    return { success: false, userCoinValue: userData.numCoins };
  }

  return userRef
    .update({
      numCoins: newCoinValue,
      theme: themeColor,
    })
    .then(function (): ChangeResult {
      console.log(`Users new coin value is ${newCoinValue}`);
      return { success: true, userCoinValue: newCoinValue };
    })
    .catch(function (error: Error): ChangeResult {
      console.error('Could not create new coin value in database');
      return { success: false, userCoinValue: userData.numCoins };
    });
}

/**
 * Add photo to user's photo entitlements
 * @param {FirebaseFirestore.DocumentReference} userRef
 * @param {billing.Purchase} purchase
 */
export async function addPhoto(
  userRef: FirebaseFirestore.DocumentReference,
  purchase: billing.Purchase,
): Promise<boolean> {
  if (!userRef) {
    return false;
  }

  const userData = await getUserData(userRef);
  if (!userData) {
    return false;
  }

  const existingPhotos = userData.photoEntitlements;
  if (existingPhotos.includes(purchase.productId)) {
    console.error(`User already owns photo ${purchase.productId}`);
    return true;
  } else {
    // Add the purchase to the token store.
    const tokenAdded = await addPurchaseToken(userRef, purchase);
    if (!tokenAdded) {
      console.error('Could not add token');
      return false;
    }

    existingPhotos.push(purchase.productId);
    return userRef
      .update({
        photoEntitlements: existingPhotos,
      })
      .then(function (): boolean {
        console.log(`Added ${purchase.productId} to photo entitlements`);
        return true;
      })
      .catch(function (error: Error): boolean {
        console.error(`Could not add ${purchase.productId} to users reference : ${error}`);
        return false;
      });
  }
}

/**
 * Remove photo from user's photo entitlements
 * @param {FirebaseFirestore.DocumentReference} userRef
 * @param {billing.Purchase} purchase
 */
export async function removePhoto(
  userRef: FirebaseFirestore.DocumentReference,
  purchase: billing.Purchase,
): Promise<boolean> {
  if (!userRef) {
    return false;
  }

  const userData = await getUserData(userRef);
  if (!userData) {
    return false;
  }

  const existingPhotos = userData.photoEntitlements;
  if (existingPhotos.includes(purchase.productId)) {
    const index = existingPhotos.indexOf(purchase.productId);
    existingPhotos.splice(index, 1);
    return userRef
      .update({
        photoEntitlements: existingPhotos,
      })
      .then(function (): boolean {
        console.log(`Removed ${purchase.productId} from photo entitlements`);
        return true;
      })
      .catch(function (error: Error): boolean {
        console.error(`Could not remove ${purchase.productId} from users reference : ${error}`);
        return false;
      });
  }
  return false;
}

/**
 * Grant/remove entitlement for the Basic or Premium subscription
 *
 * @param {FirebaseFirestore.DocumentReference} userRef A valid user document reference
 * @param {billing.SubscriptionPurchase} subPurchase The validated SubscriptionPurchase object
 * @param {string} sku The subscription sku
 * @param {boolean} hasSub Whether to set/remove entitlement
 */
export async function setHasSub(
  userRef: FirebaseFirestore.DocumentReference,
  subPurchase: billing.SubscriptionPurchase,
  sku: string,
  hasSub: boolean,
): Promise<boolean> {
  if (!userRef) {
    return false;
  }
  // Add the subscription to the token store
  // If cancelling sub, do not need to add token
  if (hasSub) {
    // Launch this async call but no need to block on it
    await addSubscriptionToken(userRef, subPurchase)
      .then(function (addedNewToken: boolean) {
        if (addedNewToken) {
          console.log(`Added new ${sku} token.`);
        }
      })
      .catch(function (error: any) {
        console.error(`Failed to add ${sku} token.`, error);
      });
  }

  switch (sku) {
    case SKU_BASIC_SUB:
      return await userRef
        .update({
          hasBasicSub: hasSub,
        })
        .then(function (): boolean {
          console.log(`Set hasBasicSub to: ${hasSub}`);
          return true;
        })
        .catch(function (error: any): boolean {
          console.error('Error setHasSub.', error);
          return false;
        });
    case SKU_PREMIUM_SUB:
      return await userRef
        .update({
          hasPremiumSub: hasSub,
        })
        .then(function (): boolean {
          console.log(`Set hasPremiumSub to: ${hasSub}`);
          return true;
        })
        .catch(function (error: any): boolean {
          console.error('Error setHasSub.', error);
          return false;
        });
    default:
      console.error(`Error: ${sku} is not a valid subscription type.`);
      return false;
  }
}
/**
 * Grant coin benefits for the Basic or Premium subscriptions
 *
 * @param {FirebaseFirestore.DocumentReference} userRef A valid user document reference
 * @param {string} sku The subscription sku
 */
export async function grantSubBenefits(
  userRef: FirebaseFirestore.DocumentReference,
  sku: string,
): Promise<boolean> {
  if (!userRef) {
    return false;
  }

  const userData = await getUserData(userRef);
  if (!userData) {
    return false;
  }

  switch (sku) {
    case SKU_BASIC_SUB:
      return await userRef
        .update({
          numCoins: userData.numCoins + 2000,
        })
        .then(function (): boolean {
          console.log(`Added 2000 coins for ${SKU_BASIC_SUB}`);
          return true;
        })
        .catch(function (error: any): boolean {
          console.error(`Error adding coins for ${SKU_BASIC_SUB}.`, error);
          return false;
        });
    case SKU_PREMIUM_SUB:
      return await userRef
        .update({
          numCoins: userData.numCoins + 5000,
        })
        .then(function (): boolean {
          console.log(`Added 5000 coins for ${SKU_PREMIUM_SUB}`);
          return true;
        })
        .catch(function (error: any): boolean {
          console.error(`Error adding coins for ${SKU_PREMIUM_SUB}.`, error);
          return false;
        });
    default:
      console.error(`Error: ${sku} is not a valid subscription type.`);
      return false;
  }
}
