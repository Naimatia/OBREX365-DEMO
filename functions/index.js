const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.deleteAuthUser = functions.https.onCall(async (data, context) => {
  try {
    const { userId } = data;
    const callerUid = context.auth?.uid;

    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
    }

    if (!callerUid) {
      throw new functions.https.HttpsError('unauthenticated', 'Unauthorized: Caller must be authenticated');
    }

    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
    if (!callerDoc.exists || callerDoc.data().Role !== 'CEO') {
      throw new functions.https.HttpsError('permission-denied', 'Permission denied: CEO role required');
    }

    await admin.auth().deleteUser(userId);

    await admin.firestore().collection('audit_logs').add({
      action: 'USER_DELETION',
      adminId: callerUid,
      deletedUserId: userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: `User ${userId} deleted by ${callerUid}`
    });

    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete user', error.message);
  }
});