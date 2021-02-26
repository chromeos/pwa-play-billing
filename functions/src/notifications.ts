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
 * Types related to Realtime Developer Notifications
 *
 * See: https://developer.android.com/google/play/billing/getting-ready#configure-rtdn
 * JSON spec: https://developer.android.com/google/play/billing/realtime_developer_notifications.html#json_specification
 * Notification types: https://developer.android.com/google/play/billing/realtime_developer_notifications.html#notification_types
 *
 * Adapted from https://github.com/android/play-billing-samples/tree/master/ClassyTaxiServer
 */
export interface DeveloperNotification {
  version: string;
  packageName: string;
  eventTimeMillis: number;
  subscriptionNotification?: SubscriptionNotification;
  testNotification?: TestNotification;
}

export interface SubscriptionNotification {
  version: string;
  notificationType: NotificationType;
  purchaseToken: string;
  subscriptionId: string;
}

export interface TestNotification {
  version: string;
}

export enum NotificationType {
  SUBSCRIPTION_UNDEFINED = -1,
  SUBSCRIPTION_RECOVERED = 1,
  SUBSCRIPTION_RENEWED = 2,
  SUBSCRIPTION_CANCELED = 3,
  SUBSCRIPTION_PURCHASED = 4,
  SUBSCRIPTION_ON_HOLD = 5,
  SUBSCRIPTION_IN_GRACE_PERIOD = 6,
  SUBSCRIPTION_RESTARTED = 7,
  SUBSCRIPTION_PRICE_CHANGE_CONFIRMED = 8,
  SUBSCRIPTION_DEFERRED = 9,
  SUBSCRIPTION_PAUSED = 10,
  SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED = 11,
  SUBSCRIPTION_REVOKED = 12,
  SUBSCRIPTION_EXPIRED = 13,
}
