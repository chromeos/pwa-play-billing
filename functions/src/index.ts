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

// Initialize the app once before all other includes
// import { request } from 'express';
// import { auth } from 'firebase';
import * as admin from 'firebase-admin';
admin.initializeApp();

import * as functions from 'firebase-functions';
import * as purchases from './purchases';
import { EXAMPLE_SKUS, IN_APP_COIN_COST, VALID_THEME_NAMES } from './skusValue';
import * as usersdb from './usersdb';
import * as rtdn from './notifications';
import * as tokensdb from './tokensdb';
import { topicID } from './config';

import { HttpsError } from 'firebase-functions/lib/providers/https';

import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';

const app = express();
app.use(cors({ origin: true }));

// Firestore db stuff
const SKUS_COLLECTION = 'SKUS';
const db = admin.firestore();

export interface SkuInfo {
  type: string;
  sku: string;
}

interface RequestWithUser extends functions.Request {
  user?: admin.auth.DecodedIdToken;
}

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

/**
 * writeDbTest - An https call function that does something more interesting
 *
 * Receive a message through the request variable and write it into the test
 * database. Return the id of the new db entry via a string response.
 */
// export const writeDbTest = functions.https.onCall(async (request, context) => {
//     usersdb.verifyAuth(context);
//     functions.logger.info("Logging a message to the database!", {structuredData: true});
//     // Get the message from the request map
//     const message = request.message;
//     // Add a new document with an auto-generated id.
//     const res = await db.collection('test').add({
//         Message: message,
//     });
//     console.log('Added Message with ID: ', res.id); // Firebase log
//     return "Added Message with ID: " + res.id; // Return message
//   });

/**
 * userAuth is middleware that validates that the request contains a valid user token, and appends
 * the token to the request.
 * @param {RequestWithUser} req
 * @param {functions.Response} res
 * @param {any} next
 */
async function appendUser(req: RequestWithUser, res: functions.Response, next: any) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const bearerToken = req.headers.authorization.split(' ').pop();
    functions.logger.warn(req.headers?.authorization.toString());

    try {
      const user = await admin.auth().verifyIdToken(bearerToken!);
      req.user = user;
    } catch (err) {
      functions.logger.warn('Could not validate user: ', err);
    }
  } else {
    functions.logger.warn('No bearer token present, cannot determine user');
  }

  next();
}

app.use(appendUser);
app.use(bodyParser.json());

app.get('/getSkus', async (request: functions.Request, response: functions.Response) => {
  functions.logger.info('SKU request came in', { structuredData: true });
  const skuDocs = await db.collection(SKUS_COLLECTION).listDocuments();
  if (skuDocs.length == 0) {
    functions.logger.warn('Zero length SkuDocs found, adding in missing SKUs');
    for (const exampleSku of EXAMPLE_SKUS) {
      await db
        .collection(SKUS_COLLECTION)
        .add(exampleSku)
        .then((docRef) => {
          skuDocs.push(docRef);
        })
        .catch((error) => {
          functions.logger.warn(`Could not add example sku to collection : ${error}`);
        });
    }
  }
  const skus: any = [];
  for (const skuDoc of skuDocs) {
    const sku = await skuDoc.get();
    skus.push(sku.data());
  }
  functions.logger.info(skus.toString());
  response.json({ skus: skus });
});

// Used for testing but not needed.
// app.post('/createUser', async (request: RequestWithUser, response: functions.Response) => {
//     usersdb.verifyAuth(request);
//     usersdb.authenticateUser(request);
//     response.json({'status': 'Done'});
// });

app.post('/getUser', async (request: RequestWithUser, response: functions.Response) => {
  functions.logger.info('User request came in', { structuredData: true });
  usersdb.verifyAuth(request);
  const authenticatedUserRef = await usersdb.authenticateUser(request);

  if (!authenticatedUserRef) {
    response.status(403).send({
      error: 'user is not found in database',
    });
    return;
  }

  const userData = await usersdb.getUserData(authenticatedUserRef);
  if (userData) {
    response.json({
      status: 'user info found',
      accountName: userData.accountName,
      email: userData.email,
      photoEntitlements: userData.photoEntitlements,
      hasBasicSub: userData.hasBasicSub,
      hasPremiumSub: userData.hasPremiumSub,
      numCoins: userData.numCoins,
      theme: userData.theme,
    });
    return;
  }

  response.json({ error: 'error getting user info.' });
});

app.post('/setTheme', async (request: RequestWithUser, response: functions.Response) => {
  usersdb.verifyAuth(request);
  const authenticatedUserRef = await usersdb.authenticateUser(request);

  if (!authenticatedUserRef) {
    response.status(403).send({
      error: 'user is not found in database',
    });
    return;
  }

  const numCoins = IN_APP_COIN_COST['theme_change']; // Simulates reading from a database
  const themeColor: string = request.body?.color;

  if (themeColor === undefined || !VALID_THEME_NAMES.includes(themeColor)) {
    response.status(400).json({
      error: `Color provided : ${themeColor} was not in the list of valid colors ${VALID_THEME_NAMES.toString()}`,
    });
    return;
  }

  const themeChanged = await purchases.setTheme(authenticatedUserRef, numCoins, themeColor);
  if (themeChanged.success) {
    response.json({
      status: 'theme successfully changed',
      new_coin_amt: themeChanged.userCoinValue,
    });
    return;
  }

  response.json({ error: 'error changing theme.' });
});

app.post('/addCoins', async (request: RequestWithUser, response: functions.Response) => {
  functions.logger.info('Add coins request came in', { structuredData: true });
  usersdb.verifyAuth(request);
  const authenticatedUserRef = await usersdb.authenticateUser(request);

  if (!authenticatedUserRef) {
    response.status(403).send({
      error: 'user is not found in database',
    });
    return;
  }

  // Get parameters passed to the request
  const sku: string = request.body?.sku;
  const purchaseToken: string = request.body?.token;

  if (sku === undefined || purchaseToken === undefined) {
    console.error(`Either sku (${sku}) or purchaseToken (${purchaseToken}) is undefined`);
    response.status(400).json({
      error: `Incorrect propery values sent : Either sku (${sku}) or purchaseToken (${purchaseToken}) is undefined`,
    });
    return;
  }

  functions.logger.info(`${sku} with ${purchaseToken} is received to add coins for user`);

  // Make sure token is in valid purchase state
  const purchase = await purchases.fetchPurchase(sku, purchaseToken);
  if (!purchase || !purchase.wasPurchased()) {
    console.error('Cannot determine if purchase is valid');
    response.status(503).json({ error: 'Error adding coins. Purchase not verified' });
    return;
  }

  // Add the items to the user account
  const addedCoins = await purchases.addCoins(authenticatedUserRef, purchase);
  if (addedCoins) {
    response.json({ status: 'Purchase verified and coins granted' });
    return;
  }

  response.json({ error: 'error granting entitlement.' });
});

app.post('/addPhoto', async (request: RequestWithUser, response: functions.Response) => {
  functions.logger.info('Add photo request came in', { structuredData: true });
  usersdb.verifyAuth(request);
  const authenticatedUserRef = await usersdb.authenticateUser(request);

  if (!authenticatedUserRef) {
    response.status(403).send({
      error: 'user is not found in database',
    });
    return;
  }

  // Get parameters passed to the request
  const sku: string = request.body?.sku;
  const purchaseToken: string = request.body?.token;

  if (sku === undefined || purchaseToken === undefined) {
    console.error(`Either sku (${sku}) or purchaseToken (${purchaseToken}) is undefined`);
    response.status(400).json({
      error: `Incorrect propery values sent : Either sku (${sku}) or purchaseToken (${purchaseToken}) is undefined`,
    });
    return;
  }

  // Make sure token is in valid purchase state
  const purchase = await purchases.fetchPurchase(sku, purchaseToken);
  if (!purchase || !purchase.wasPurchased()) {
    console.error('Cannot determine if purchase is valid');
    response.status(503).json({ error: 'Error adding photo. Purchase not verified' });
    return;
  }

  // Add photo user account's photo entitlements
  const addedPhoto = await purchases.addPhoto(authenticatedUserRef, purchase);
  if (addedPhoto) {
    response.json({ status: 'Purchase verified and photo added' });
    return;
  }

  response.json({ error: 'error granting entitlement.' });
});

app.post('/removePhoto', async (request: RequestWithUser, response: functions.Response) => {
  functions.logger.info('Remove photo request came in', { structuredData: true });
  usersdb.verifyAuth(request);
  const authenticatedUserRef = await usersdb.authenticateUser(request);

  if (!authenticatedUserRef) {
    response.status(403).send({
      error: 'user is not found in database',
    });
    return;
  }

  // Get parameters passed to the request
  const sku: string = request.body?.sku;
  const purchaseToken: string = request.body?.token;

  if (sku === undefined || purchaseToken === undefined) {
    console.error(`Either sku (${sku}) or purchaseToken (${purchaseToken}) is undefined`);
    response.status(400).json({
      error: `Incorrect propery values sent : Either sku (${sku}) or purchaseToken (${purchaseToken}) is undefined`,
    });
    return;
  }

  // Make sure token is in valid purchase state
  const purchase = await purchases.fetchPurchase(sku, purchaseToken);
  if (!purchase || !purchase.wasPurchased()) {
    console.error('Cannot determine if purchase is valid');
    response.status(503).json({ error: 'Error removing photo. Purchase not verified' });
    return;
  }

  // Remove user account's photo entitlements
  const removedPhoto = await purchases.removePhoto(authenticatedUserRef, purchase);
  if (removedPhoto) {
    response.json({ status: 'Photo removed.' });
    return;
  }

  response.json({ error: 'error removing entitlement.' });
});

app.post('/setHasSub', async (request: RequestWithUser, response: functions.Response) => {
  functions.logger.info('Set hasSub request came in', { structuredData: true });
  usersdb.verifyAuth(request);
  const authenticatedUserRef = await usersdb.authenticateUser(request);

  if (!authenticatedUserRef) {
    response.status(403).send({
      error: 'user is not found in database',
    });
    return;
  }

  // Get parameters passed to the request
  const sku: string = request.body?.sku;
  const purchaseToken: string = request.body?.token;

  let setSub = false;

  // Verify purchase with Play Developer API
  const subPurchase = await purchases.fetchSubscriptionPurchase(sku, purchaseToken);
  if (subPurchase?.isEntitlementActive()) {
    setSub = await purchases.setHasSub(authenticatedUserRef, subPurchase, sku, true);
  }

  if (setSub) {
    response.json({ status: `set hasSub for ${sku}` });
    return;
  }

  response.json({ error: `Error setting hasSub for ${sku}.` });
});

app.post('/validatePurchase', async (request: functions.Request, response: functions.Response) => {
  functions.logger.info('Validate purchase request came in', { structuredData: true });
  // Get parameters passed to the request
  const sku: string = request.body?.sku;
  const purchaseToken: string = request.body?.token;

  if (sku === undefined || purchaseToken === undefined) {
    console.error(`Either sku (${sku}) or purchaseToken (${purchaseToken}) is undefined`);
    response.status(400).json({
      error: `Incorrect propery values sent : Either sku (${sku}) or purchaseToken (${purchaseToken}) is undefined`,
    });
    return;
  }

  // Make sure token isn't already in tokens db
  if (await tokensdb.exists(purchaseToken)) {
    console.error('Purchase token already exists');
    response.json({ error: 'Unable to validate purchase because token already exists' });
    return;
  }

  // Make sure token is in valid purchase state
  const purchase = await purchases.fetchPurchase(sku, purchaseToken);
  if (!purchase || !purchase.wasPurchased()) {
    console.error('Cannot determine if purchase is valid');
    response.status(503).json({ error: 'Purchase not verified' });
    return;
  }

  response.json({ status: true });
});

app.post(
  '/validateSubPurchase',
  async (request: functions.Request, response: functions.Response) => {
    functions.logger.info('Validate sub purchase request came in', { structuredData: true });
    // Get parameters passed to the request
    const sku: string = request.body?.sku;
    const purchaseToken: string = request.body?.token;

    // Make sure token isn't already in tokens db
    if (await tokensdb.exists(purchaseToken)) {
      console.error('Purchase token already exists');
      response.json({
        error: 'Unable to validate subscription purchase because token already exists',
      });
      return;
    }
    // Verify purchase with Play Developer API
    const subPurchase = await purchases.fetchSubscriptionPurchase(sku, purchaseToken);
    if (subPurchase?.isEntitlementActive()) {
      response.json({ status: true });
    } else {
      response.json({ error: 'Subscription is not active and is not valid' });
    }
  },
);

const main = express();
main.use(cors({ origin: true }));
main.use('/api', app);

exports.main = functions.https.onRequest(main);

export const rtdnListener = functions.pubsub.topic(topicID).onPublish(async (data, context) => {
  try {
    // Convert the incoming Realtime Developer notification
    const developerNotification = <rtdn.DeveloperNotification>data.json;
    const sku = developerNotification.subscriptionNotification?.subscriptionId;
    const purchaseToken = developerNotification.subscriptionNotification?.purchaseToken;
    const notification = developerNotification.subscriptionNotification?.notificationType;
    // Cannot proceed without this information
    if (!sku || !purchaseToken || !notification) {
      throw new HttpsError('internal', 'Invalid subscription.');
    }
    // Search token database for this token and see which user it is associated with.
    // Note: new purchases will not be in the token store and will not be processed here
    const userRef = await tokensdb.getUserRefFromToken(purchaseToken);
    if (!userRef) {
      throw new HttpsError('internal', 'User not in database.');
    }
    // The RTDN contains the purchaseToken but no other information.
    // Get the full subscription details via the Play Developer API
    const subPurchase = await purchases.fetchSubscriptionPurchase(sku, purchaseToken);
    if (!subPurchase) {
      throw new HttpsError('internal', 'Error getting subscription details.');
    }
    let actionSuccessful = false;
    // Act upon the incoming notification
    switch (notification) {
      // TODO: what needs to be done for the following cases?
      case rtdn.NotificationType.SUBSCRIPTION_PRICE_CHANGE_CONFIRMED:
      case rtdn.NotificationType.SUBSCRIPTION_DEFERRED:
      case rtdn.NotificationType.SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED:
        break;
      case rtdn.NotificationType.SUBSCRIPTION_CANCELED:
        // TODO add FCM to send push message to apps for renewal offer
        break;
      // For the following cases, remove entitlement
      case rtdn.NotificationType.SUBSCRIPTION_ON_HOLD:
      case rtdn.NotificationType.SUBSCRIPTION_REVOKED:
      case rtdn.NotificationType.SUBSCRIPTION_EXPIRED:
      case rtdn.NotificationType.SUBSCRIPTION_PAUSED:
        actionSuccessful = await purchases.setHasSub(userRef, subPurchase, sku, false);

        // TODO add FCM to send push messages to apps to immediately
        // block entitlement. For now, rely on apps to poll getEntitlements
        break;
      // For the following cases, grant entitlement
      case rtdn.NotificationType.SUBSCRIPTION_RENEWED:
      case rtdn.NotificationType.SUBSCRIPTION_PURCHASED:
        // For basic subscription, add 100 coins to user's account when first
        // purchased and every time it is renewed.
        actionSuccessful = await purchases.grantSubBenefits(userRef, sku);
      // falls through
      case rtdn.NotificationType.SUBSCRIPTION_RECOVERED:
      case rtdn.NotificationType.SUBSCRIPTION_RESTARTED:
        actionSuccessful = await purchases.setHasSub(userRef, subPurchase, sku, true);
        // TODO add FCM to send push messages to apps to ensure
        // immediate entitlement. For now, rely on apps to poll getEntitlements
        break;
      case rtdn.NotificationType.SUBSCRIPTION_IN_GRACE_PERIOD:
        // TODO add FCM to tell apps to show warning message to user
        // to fix their payment method
        break;
    }
    if (actionSuccessful) {
      console.log(
        'Adjusted entitlement for ' + sku + ' to RTDN: ' + rtdn.NotificationType[notification],
      );
    } else {
      console.log(
        'Failed to adjust entitlement for ' +
          sku +
          ' to RTDN: ' +
          rtdn.NotificationType[notification],
      );
    }
  } catch (error) {
    console.error(error);
  }
});
