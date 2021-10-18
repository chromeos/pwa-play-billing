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

import { NotificationType } from './notifications';
/**
 * Functions for interacting with the Google Play Developer API
 *
 * Adapted from https://github.com/android/play-billing-samples/tree/master/ClassyTaxiServer
 */
// Representing type of a purchase / product.
// https://developer.android.com/reference/com/android/billingclient/api/BillingClient.SkuType.html
export enum SkuType {
  ONE_TIME = 'inapp',
  SUBS = 'subs',
}
// See: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions#SubscriptionPurchase
export enum PurchaseType {
  NORMAL = -1,
  TEST = 0,
  PROMO = 1,
}
// See: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products#ProductPurchase
export enum PurchaseState {
  NONE = -1,
  PAYMENT_PURCHASED = 0,
  PAYMENT_CANCELLED = 1,
  PENDING = 2,
}
// See: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions#SubscriptionPurchase
export enum PaymentState {
  NONE = -1,
  PAYMENT_PENDING = 0,
  PAYMENT_RECEIVED = 1,
  FREE_TRIAL = 2,
  PAYMENT_DEFERRED = 3,
}
// See: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions#SubscriptionPurchase
export enum CancelReason {
  NONE = -1,
  USER = 0,
  SYSTEM = 1,
  REPLACED = 2,
  DEVELOPER = 3,
}
// See: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions#SubscriptionPurchase
export enum PromotionType {
  NONE = -1,
  ONE_TIME_CODE = 0,
  VANITY_CODE = 1,
}
/*
 * Class to hold Purchase values from JSON response to REST API
 * See: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions#SubscriptionPurchase
 */
/**
 * Purchase is a convience class that converts the API response to a purchase object that can be interacted with and upon.
 *
 * @export
 * @class Purchase
 */
export class Purchase {
  kind = '';
  purchaseTimeMillis = 0; // In API this is a string
  purchaseState: PurchaseState = PurchaseState.NONE;
  consumptionState = false; // Will map 0 = unconsumed, 1 = consumed
  developerPayload = '';
  orderId = '';
  purchaseType: PurchaseType = PurchaseType.NORMAL;
  acknowledgementState = false; // Will map 0 = unacknowledged, 1 = acknowledged
  purchaseToken = '';
  productId = '';
  quantity = 0;
  obfuscatedExternalAccountId = '';
  obfuscatedExternalProfileId = '';
  // Convenience utilities

  /**
   * wasPurchased specifies whether the item was purchased but does not indicate whether or not the item was consumed.
   *
   * @memberof Purchase
   * @return {boolean}
   */
  wasPurchased(): boolean {
    return this.purchaseState === PurchaseState.PAYMENT_PURCHASED;
  }

  /**
   * wasConsumed specifies whether the purchase was consumed.
   *
   * @memberof Purchase
   * @return {boolean}
   */
  wasConsumed(): boolean {
    return this.consumptionState;
  }

  /**
   * wasAcknowledged specifies whether the purchase was acknowledged.
   *
   * @memberof Purchase
   * @return {boolean}
   */
  wasAcknowledged(): boolean {
    return this.acknowledgementState;
  }

  /**
   * toString converts the purchase to a string object.
   *
   * @memberof Purchase
   * @return {string}
   */
  toString(): string {
    return (
      'Purchase response: kind of purchase? ' +
      this.kind +
      ', Purchase time? ' +
      this.purchaseTimeMillis +
      ', Purchase state? ' +
      this.purchaseState +
      ', Consumed? ' +
      this.consumptionState +
      ', ID : ' +
      this.productId
    );
  }
  // Convert REST response from Play Developer API
  // Note: purchaseToken unused here for one-time purchases but needed for subscriptions
  // TODO: Wait for b/171264855 to be fixed.
  /**
   * fromApiResponse converts the response from the Google Play Developer API into a human readable class.
   *
   * @static
   * @memberof Purchase
   * @param {*} apiResponse
   * @param {string} purchaseToken
   * @param {string} productId
   * @return {Purchase}
   */
  static fromApiResponse(apiResponse: any, purchaseToken: string, productId: string): Purchase {
    const purchase = new Purchase();
    // Field names correspond so can leverage auto-mapping
    Object.assign(purchase, apiResponse);
    purchase.purchaseToken = purchaseToken;
    purchase.productId = productId;
    // Fix string to number type corrections
    if (purchase.purchaseTimeMillis)
      purchase.purchaseTimeMillis = Number(purchase.purchaseTimeMillis);
    return purchase;
  }
}
/*
 * Class to hold Subscription values from JSON response to REST API
 * See: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions#SubscriptionPurchase
 */
/**
 *SubscriptionPurchase is a convience class for subscription that provide utilities for a user to work with.
 *
 * @export
 * @class SubscriptionPurchase
 * @extends {Purchase}
 */
export class SubscriptionPurchase extends Purchase {
  startTimeMillis = 0; // In API this is a string
  expiryTimeMillis = 0; // In API this is a string
  autoResumeTimeMillis = 0; // In API this is a string
  autoRenewing = false;
  priceCurrencyCode = '';
  priceAmountMicros = 0; // In API this is a string
  countryCode = '';
  developerPayload = '';
  paymentState: PaymentState = PaymentState.NONE;
  cancelReason: CancelReason = CancelReason.NONE;
  userCancellationTimeMillis = 0; // In API this is a string
  orderId = '';
  linkedPurchaseToken = '';
  latestNotificationType: NotificationType = NotificationType.SUBSCRIPTION_UNDEFINED; // Last RTDN notification
  externalAccountId = '';
  promotionType: PromotionType = PromotionType.NONE;
  promotionCode = '';
  obfuscatedExternalAccountId = '';
  obfuscatedExternalProfileId = '';
  replacedByAnotherPurchase = false;
  // Convenience utilities
  /**
   * isEntitlementActive indicates whether the current entitlement is activated.
   *
   * @memberof SubscriptionPurchase
   * @return {boolean}
   */
  isEntitlementActive(): boolean {
    const now = Date.now();
    return now <= this.expiryTimeMillis && !this.replacedByAnotherPurchase;
  }
  /**
   * willRenew indicates whether this account will automatically renew a subscription or not.
   *
   * @memberof SubscriptionPurchase
   * @return {boolean}
   */
  willRenew(): boolean {
    return this.autoRenewing;
  }
  /**
   * isTestPurchase indicates whether this type of purchase was made with a test entitlement user.
   *
   * @memberof SubscriptionPurchase
   * @return {boolean}
   */
  isTestPurchase(): boolean {
    return this.purchaseType === PurchaseType.TEST;
  }
  /**
   * isPromo returns whether this is a promotional type of subscription.
   *
   * @memberof SubscriptionPurchase
   * @return {boolean}
   */
  isPromo(): boolean {
    return this.purchaseType === PurchaseType.PROMO;
  }
  /**
   * isFreeTrial indicates that the account is in a free trial currently.
   *
   * @memberof SubscriptionPurchase
   * @return {boolean}
   */
  isFreeTrial(): boolean {
    return this.paymentState === PaymentState.FREE_TRIAL;
  }
  // See https://developer.android.com/google/play/billing/subs#lifecycle
  /**
   * isGracePeriod means that the account has entered into a grace period where a payment is pending but not complete.
   *
   * @memberof SubscriptionPurchase
   * @return {boolean}
   */
  isGracePeriod(): boolean {
    const now = Date.now();
    return (
      this.paymentState === PaymentState.PAYMENT_PENDING && // payment hasn't been received
      now <= this.expiryTimeMillis && // and the subscription hasn't expired
      this.autoRenewing === true
    ); // and it's renewing
    // One can also check if (this.latestNotificationType === NotificationType.SUBSCRIPTION_IN_GRACE_PERIOD)
    // Either way is fine. We decide to rely on Subscriptions:get API response because it works even when realtime dev notification delivery is delayed
  }
  /**
   * isAccountHold shows if the account is on a hold, which means that the subscription has either expired or is pending.
   *
   * @memberof SubscriptionPurchase
   * @return {boolean}
   */
  isAccountHold(): boolean {
    const now = Date.now();
    return (
      now > this.expiryTimeMillis && // the subscription has expired
      this.autoRenewing === true && // but Google Play still try to renew it
      this.paymentState > PaymentState.PAYMENT_PENDING
    ); // payment is pending
    // One can also check if (this.latestNotificationType === NotificationType.SUBSCRIPTION_ON_HOLD)
    // Either way is fine. We decide to rely on Subscriptions:get API response because it works even when realtime dev notification delivery is delayed
  }
  /**
   * activeUntilDate shows the date that the subscription is active until.
   *
   * @memberof SubscriptionPurchase
   * @return {Date}
   */
  activeUntilDate(): Date {
    return new Date(this.expiryTimeMillis);
  }
  // Convert REST response from Play Developer API
  /**
   * fromApiResponse converts the response from the Google Play Developer API into a human readable class.
   *
   * @static
   * @memberof SubscriptionPurchase
   * @param {*} apiResponse
   * @param {string} purchaseToken
   * @return {SubscriptionPurchase}
   */
  static fromApiResponse(apiResponse: any, purchaseToken: string): SubscriptionPurchase {
    const subPurchase = new SubscriptionPurchase();
    // Field names correspond so can leverage auto-mapping
    Object.assign(subPurchase, apiResponse);
    // For some reason the REST response for subscriptions does not include the purchase token
    subPurchase.purchaseToken = purchaseToken;
    // Fix string to number type corrections
    if (subPurchase.purchaseTimeMillis)
      subPurchase.purchaseTimeMillis = Number(subPurchase.purchaseTimeMillis);
    if (subPurchase.startTimeMillis)
      subPurchase.startTimeMillis = Number(subPurchase.startTimeMillis);
    if (subPurchase.expiryTimeMillis)
      subPurchase.expiryTimeMillis = Number(subPurchase.expiryTimeMillis);
    if (subPurchase.autoResumeTimeMillis)
      subPurchase.autoResumeTimeMillis = Number(subPurchase.autoResumeTimeMillis);
    if (subPurchase.priceAmountMicros)
      subPurchase.priceAmountMicros = Number(subPurchase.priceAmountMicros);
    if (subPurchase.userCancellationTimeMillis)
      subPurchase.userCancellationTimeMillis = Number(subPurchase.userCancellationTimeMillis);
    if (subPurchase.purchaseTimeMillis)
      subPurchase.purchaseTimeMillis = Number(subPurchase.purchaseTimeMillis);
    return subPurchase;
  }
}
