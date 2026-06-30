// src/hooks/useBanCheck.js
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from 'configs/FirebaseConfig';
import UserService from 'services/firebase/UserService';
import { message } from 'antd';

export const useBanCheck = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const checkBan = async () => {
      const user = auth.currentUser;
      if (!user || !isMounted) return;

      try {
        const userData = await UserService.getUserData(user.uid);
        
        if (userData?.isBanned === true && isMounted) {
          message.error({
            content: '⛔ Your account has been banned. You are being logged out.',
            duration: 5,
          });
          
          await auth.signOut();
          setTimeout(() => {
            if (isMounted) {
              navigate('/auth/login');
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking ban status:', error);
      }
    };

    // Check immediately
    checkBan();

    // Check every 10 seconds
    const interval = setInterval(checkBan, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [navigate]);
};

export default useBanCheck;