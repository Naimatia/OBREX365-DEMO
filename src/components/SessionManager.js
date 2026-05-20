import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAuth, onAuthStateChanged, signOut, onIdTokenChanged } from 'firebase/auth';
import { signOut as reduxSignOut } from 'store/slices/authSlice';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from 'configs/FirebaseConfig';

const SessionManager = () => {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);

    useEffect(() => {
        const auth = getAuth();
        let unsubscribeMetadata = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser || !user?.uid) return;

            const metadataRef = doc(db, 'metadata', user.uid);

            unsubscribeMetadata = onSnapshot(metadataRef, async (snapshot) => {
                const data = snapshot.data();
                const revokeTime = data?.revokeTime;

                if (!revokeTime) return;

                try {
                    // Force refresh token
                    const idTokenResult = await currentUser.getIdTokenResult(true);

                    const authTimeMs = new Date(idTokenResult.authTime).getTime();
                    const issuedAtMs = idTokenResult.issuedAtTime 
                        ? new Date(idTokenResult.issuedAtTime).getTime() 
                        : authTimeMs;

                    console.log('🔍 Session Check:', {
                        authTime: new Date(authTimeMs).toISOString(),
                        revokeTime: new Date(revokeTime).toISOString(),
                        shouldLogout: authTimeMs < revokeTime
                    });

                    if (authTimeMs < revokeTime || issuedAtMs < revokeTime) {
                        console.warn('🚪 Session revoked - logging out');
                        await signOut(auth);
                        dispatch(reduxSignOut());
                        window.location.href = '/login';
                    }
                } catch (err) {
                    console.error('Session check failed:', err);
                    await signOut(auth).catch(() => {});
                    dispatch(reduxSignOut());
                }
            });
        });

        // Extra safety: also listen to token changes
        const unsubscribeToken = onIdTokenChanged(auth, () => {
            // This helps trigger re-checks
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeMetadata) unsubscribeMetadata();
            unsubscribeToken();
        };
    }, [user?.uid, dispatch]);

    return null;
};

export default SessionManager;