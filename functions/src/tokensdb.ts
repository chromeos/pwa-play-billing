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

import * as admin from 'firebase-admin';
import * as billing from './billing';
import * as usersdb from './usersdb';
import * as FirebaseFirestore from '@google-cloud/firestore';

// import * as { user } from 'firebase-functions/lib/provider/auth';

/**
 * Constants for operating on the tokens storage in firebase
 */
export const FIRESTORE_TOKEN_DB = 'tokens';
const db = admin.firestore();
const tokensRef = db.collection(FIRESTORE_TOKEN_DB);

/**
 * Add a token for a one time purchase to the token store.
 * @param {FirebaseFirestore.DocumentReference} userRef A validated user document reference for Firestore
 * @param {billing.Purchase} purchase A validated Purchase object
 */
export async function addPurchaseToken(
  userRef: FirebaseFirestore.DocumentReference,
  purchase: billing.Purchase,
): Promise<boolean> {
  // Check the user ref exists
  if (!userRef) {
    return false;
  }

  return await addNewToken(true, purchase.purchaseToken, userRef.id);
}

/**
 * Add token for a subscription purchase to the token store.
 * @param {FirebaseFirestore.DocumentReference} userRef
 * @param {billing.SubscriptionPurchase} subPurchase
 */
export async function addSubscriptionToken(
  userRef: FirebaseFirestore.DocumentReference,
  subPurchase: billing.SubscriptionPurchase,
): Promise<boolean> {
  // Check that the user ref exists
  if (!userRef) {
    return false;
  }

  // Check the subscription object for a linkedPurchaseToken field. If there is one,
  // invalidate that token as it has been replaced by this new purchaseToken.
  // See: https://medium.com/androiddevelopers/implementing-linkedpurchasetoken-correctly-to-prevent-duplicate-subscriptions-82dfbf7167da
  if (subPurchase.linkedPurchaseToken && subPurchase.linkedPurchaseToken !== '') {
    console.log(`There is a linkedPurchaseToken, invalidate it.`);
    const numTokensInvalidated = await invalidateToken(subPurchase.linkedPurchaseToken);
    console.log(`Number tokens invalidated : ${numTokensInvalidated}`);
  }

  return await addNewToken(true, subPurchase.purchaseToken, userRef.id);
}

/**
 * Add a new token to token store.
 * @param {boolean} isValid
 * @param {string} purchaseToken
 * @param {string} userDatabaseId
 * @return {Promise<boolean>}
 */
function addNewToken(
  isValid: boolean,
  purchaseToken: string,
  userDatabaseId: string,
): Promise<boolean> {
  const newTokenData = {
    isValid: isValid,
    purchaseToken: purchaseToken,
    userDatabaseId: userDatabaseId,
  };

  return tokensRef
    .add(newTokenData)
    .then((docRef) => {
      console.log(`New token added with doc ID : ${docRef.id}`);
      return true;
    })
    .catch(function (error): boolean {
      console.error(`Error adding new token : ${error}`);
      return false;
    });
}

/**
 * Check whether given purchase token already exists in tokens db
 * @param {string} purchaseToken
 */
export async function exists(purchaseToken: string): Promise<boolean> {
  const tokenQuery = tokensRef.where('purchaseToken', '==', purchaseToken);

  const querySnapshot: FirebaseFirestore.QuerySnapshot = await tokenQuery
    .get()
    .catch(function (error): any {
      console.error(`Error querying tokens : ${error}`);
      return null;
    });

  if (querySnapshot?.size >= 1) {
    return true;
  }

  return false;
}

/**
 * Searches the token store for the given purchaseToken and invalidates it
 *
 * @param {string} purchaseToken The purchase token to look for and invalidate
 */
export async function invalidateToken(purchaseToken: string): Promise<number> {
  const tokenQuery = tokensRef.where('purchaseToken', '==', purchaseToken);
  let numInvalidated = 0;

  // Fetch token that matches (there should not be duplicate tokens, but handle that case too)
  const querySnapshot: FirebaseFirestore.QuerySnapshot = await tokenQuery
    .get()
    .catch(function (error): any {
      console.error(`Error querying tokens : ${error}`);
      return null;
    });

  if (querySnapshot?.size >= 1) {
    await Promise.all(
      // Found some tokens that match, invalidate them
      querySnapshot.docs.map(async (docSnapshot) => {
        await docSnapshot.ref
          .update({ isValid: false })
          .then(() => {
            console.log('Token successfully invalidated!');
            numInvalidated++;
          })
          .catch((error) => {
            console.error(`Error invalidating token : ${error}`);
          });
      }),
    );
  }

  return numInvalidated;
}

/**
 * Searches the token store for a given purchase token. Returns
 * the user associated with that token.
 *
 * @param {string} purchaseToken A purchase token to search the db for
 */
export async function getUserRefFromToken(purchaseToken: string): Promise<any> {
  const tokenQuery = tokensRef.where('purchaseToken', '==', purchaseToken);
  // Fetch token that matches
  const querySnapshot: FirebaseFirestore.QuerySnapshot = await tokenQuery
    .get()
    .catch(function (error): any {
      console.log('Error querying tokens: ', error);
      return null;
    });
  // If there are any matching tokens, just use the first one
  if (querySnapshot?.size >= 1) {
    const token: FirebaseFirestore.QueryDocumentSnapshot = querySnapshot.docs[0];
    // Get the user ID associated with the token, and get the user document reference for that user
    const userDbId = token.data().userDatabaseId;
    const userRef = db.collection(usersdb.FIRESTORE_USER_DB).doc(userDbId);
    return userRef;
  }
  return null;
}
