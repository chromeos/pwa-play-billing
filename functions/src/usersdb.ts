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

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as FirebaseFirestore from '@google-cloud/firestore';

interface RequestWithUser extends functions.Request {
  user?: admin.auth.DecodedIdToken;
}

/**
 * Functions for operating on the users Firestore db
 */

// Firestore initialization
export const FIRESTORE_USER_DB = 'users';
const db = admin.firestore();

/**
 * A user in the database
 *
 * Note: this interface is currently unused. Here as a reference
 * for the db structure.
 */
export interface User {
  accountName: string;
  email: string;
  photoEntitlements: Array<string>;
  hasBasicSub: boolean;
  hasPremiumSub: boolean;
  numCoins: number;
  lastQueryTime: number;
  theme: string;
}

/**
 * Verify if the user making the call has signed in using FirebaseAuth
 *
 * @export
 * @param {RequestWithUser} context
 */
export function verifyAuth(context: RequestWithUser): void {
  // Check that there is a authorized context
  if (!context.user) {
    throw new functions.https.HttpsError('unauthenticated', 'Unauthorized Access');
  }
}

/**
 * Get the authenticated user ref from the users database.
 *
 * Currently this does no additional verification
 *
 * @export
 * @param {RequestWithUser} context
 * @return {Promise<FirebaseFirestore.DocumentReference | null>}
 */
export async function authenticateUser(
  context: RequestWithUser,
): Promise<FirebaseFirestore.DocumentReference | null> {
  const userRef = await getUserRef(context);
  // This should always return a valid ref unless there is a database error
  // TODO: Add further authentication or creation retry logic if desired
  if (!userRef) {
    return userRef;
  } else {
    return userRef;
  }
}

/**
 * Gets the logged in user's document reference from the users db
 *
 * If the user does not exist yet, add them and return the new reference.
 *
 * This should only return null if the user does not exist and there is a
 * server error adding a new user entry
 *
 * @export
 * @param {RequestWithUser} context
 * @return {(Promise<FirebaseFirestore.DocumentReference | null>)}
 */
export async function getUserRef(
  context: RequestWithUser,
): Promise<FirebaseFirestore.DocumentReference | null> {
  const name = context.user?.name;
  const email = context.user?.email;
  const usersRef = db.collection(FIRESTORE_USER_DB);
  // Fetch users with matching email address
  const userQuery = usersRef.where('email', '==', email).limit(1);
  const querySnapshot = await userQuery.get();
  if (querySnapshot?.size >= 1) {
    // User already exists, update last query time
    // Only get first matching user, ignore others
    const user = querySnapshot.docs[0];
    user.ref
      .update({
        lastQueryTime: Date.now(),
      })
      .then(function () {
        console.log('User exists! Last query time updated for id: ' + user.ref.id);
      })
      .catch((error) => {
        console.error('Error updating last query time.', error);
      });
    return user.ref;
  } else {
    // User doesn't exist, add them
    const newUserData = {
      accountName: name,
      email: email,
      photoEntitlements: [],
      hasBasicSub: false,
      hasPremiumSub: false,
      numCoins: 0,
      lastQueryTime: Date.now(),
      theme: 'orange_you_glad_I_didnt_say_banana_orange',
    };
    const userRef = await usersRef
      .add(newUserData)
      .then((docRef) => {
        console.log('New user added with ID: ', docRef.id);
        return docRef;
      })
      .catch((error) => {
        console.error('Error adding new user: ', error);
        return null;
      });
    return userRef;
  }
}

/**
 * Given a valid document reference from the users database, return
 * the associated user data.
 */
/**
 * getUserData grabs the users data from the database reference supplied and returns that data.
 *
 * @export
 * @param {FirebaseFirestore.DocumentReference} userRef
 * @return {(Promise<FirebaseFirestore.DocumentData | null>)}
 */
export async function getUserData(
  userRef: FirebaseFirestore.DocumentReference,
): Promise<FirebaseFirestore.DocumentData | null> {
  const userData = await userRef
    ?.get()
    .then(function (doc) {
      if (doc.exists) {
        return doc.data() || null;
      } else {
        console.log('Error user document does not exist.');
        return null;
      }
    })
    .catch(function (error) {
      console.log('Error getting user document:', error);
      return null;
    });
  return userData;
}
