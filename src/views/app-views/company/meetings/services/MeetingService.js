// MeetingService.js - Updated to handle employees from employees table

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db as firestore } from 'configs/FirebaseConfig';
import MeetingNotificationService from './MeetingNotificationService';

class MeetingService {
  static async fetchMeetings(companyId) {
    try {
      const meetingsRef = collection(firestore, 'meetings');
      const q = query(
        meetingsRef,
        where('company_id', '==', companyId),
        orderBy('DateTime', 'asc')
      );

      const meetingsSnapshot = await getDocs(q);
      const meetings = [];

      meetingsSnapshot.forEach((doc) => {
        const meetingData = doc.data();
        const dateTime = meetingData.DateTime instanceof Timestamp 
          ? meetingData.DateTime.toDate() 
          : new Date(meetingData.DateTime);
        
        meetings.push({
          id: doc.id,
          ...meetingData,
          DateTime: dateTime
        });
      });

      return meetings;
    } catch (error) {
      console.error('Error fetching meetings:', error);
      throw error;
    }
  }

  static async fetchCompanyUsers(companyId) {
    try {
      const usersRef = collection(firestore, 'users');
      const q = query(
        usersRef,
        where('company_id', '==', companyId)
      );

      const usersSnapshot = await getDocs(q);
      const users = [];

      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        users.push({
          id: doc.id,
          name: `${userData.firstname || ''} ${userData.lastname || ''}`.trim(),
          email: userData.email || '',
          Role: userData.Role || userData.role || '',
          ...userData
        });
      });

      return users;
    } catch (error) {
      console.error('Error fetching company users:', error);
      throw error;
    }
  }

  /**
   * Creates a new meeting with employee support
   */
  static async createMeeting(meetingData, companyUsers = [], employees = []) {
    try {
      const firestoreDateTime = Timestamp.fromDate(
        meetingData.DateTime instanceof Date 
          ? meetingData.DateTime 
          : new Date(meetingData.DateTime)
      );

      const meetingWithTimestamp = {
        ...meetingData,
        DateTime: firestoreDateTime,
        createdAt: Timestamp.now(),
        notificationSent: false,
        notificationDate: null,
      };

      const meetingsRef = collection(firestore, 'meetings');
      const docRef = await addDoc(meetingsRef, meetingWithTimestamp);
      
      console.log('✅ Meeting created with ID:', docRef.id);

      const newMeeting = {
        id: docRef.id,
        ...meetingData,
        DateTime: meetingData.DateTime
      };

      let notificationResults = [];
      try {
        // Get participants with emails from both employees and company users
        const participants = await MeetingService.getParticipantsWithEmails(
          meetingData, 
          companyUsers,
          employees // Pass employees array
        );

        console.log('📧 Participants found:', participants);

        if (participants.length > 0) {
          console.log(`📧 Sending notifications to ${participants.length} participants...`);
          
          notificationResults = await MeetingNotificationService.sendMeetingNotification(
            newMeeting, 
            'created', 
            participants
          );
          
          await updateDoc(docRef, {
            notificationSent: true,
            notificationDate: Timestamp.now(),
            notificationResults: notificationResults
          });
          
          console.log('✅ Notifications sent successfully');
        } else {
          console.log('⚠️ No participants with emails to notify');
        }
      } catch (notificationError) {
        console.error('❌ Error sending notifications:', notificationError);
        await updateDoc(docRef, {
          notificationSent: false,
          notificationError: notificationError.message
        });
      }
      
      return {
        meetingId: docRef.id,
        notificationResults: notificationResults
      };
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

  static async getParticipantsWithEmails(meetingData, companyUsers = [], employees = []) {
    try {
      const participants = [];
      
      // Create maps for quick lookup
      const userMap = new Map();
      companyUsers.forEach(user => {
        if (user.id) {
          userMap.set(user.id, user);
        }
      });

      const employeeMap = new Map();
      employees.forEach(emp => {
        if (emp.id) {
          employeeMap.set(emp.id, emp);
        }
      });

      console.log('📊 Employee map size:', employeeMap.size);
      console.log('📊 User map size:', userMap.size);
      console.log('📊 Users in meeting:', meetingData.Users);

      // Process internal participants from meetingData.Users
      if (meetingData.Users && meetingData.Users.length > 0) {
        for (const userId of meetingData.Users) {
          let found = false;
          
          // First check in employees table
          const employee = employeeMap.get(userId);
          if (employee) {
            console.log('✅ Found employee:', employee.name, employee.email);
            participants.push({
              id: userId,
              name: employee.name || 'Employee',
              email: employee.email || '',
              role: employee.Role || 'Employee',
              source: 'employees'
            });
            found = true;
          }
          
          // If not found in employees, check in company users
          if (!found) {
            const user = userMap.get(userId);
            if (user) {
              console.log('✅ Found user:', user.name, user.email);
              participants.push({
                id: userId,
                name: user.name || user.displayName || 'User',
                email: user.email || '',
                role: user.Role || user.role || 'User',
                source: 'users'
              });
              found = true;
            }
          }
          
          // If still not found, try to fetch from Firestore
          if (!found) {
            try {
              const userRef = doc(firestore, 'users', userId);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const userData = userSnap.data();
                console.log('✅ Found user from direct fetch:', userData);
                participants.push({
                  id: userId,
                  name: `${userData.firstname || ''} ${userData.lastname || ''}`.trim() || 'User',
                  email: userData.email || '',
                  role: userData.Role || userData.role || 'User',
                  source: 'direct_fetch'
                });
              }
            } catch (err) {
              console.warn(`Could not fetch user ${userId}:`, err);
            }
          }
        }
      }

      // Process external participants
      if (meetingData.ExternalParticipants && meetingData.ExternalParticipants.length > 0) {
        for (const external of meetingData.ExternalParticipants) {
          const isEmail = external.includes('@');
          participants.push({
            id: `external_${Date.now()}_${Math.random()}`,
            name: isEmail ? external.split('@')[0] : external,
            email: isEmail ? external : null,
            isExternal: true,
            source: 'external'
          });
        }
      }

      // Filter out participants without email addresses
      const participantsWithEmail = participants.filter(p => p.email && p.email.trim() !== '');
      
      console.log(`📧 Found ${participantsWithEmail.length} participants with email addresses:`, 
        participantsWithEmail.map(p => ({ name: p.name, email: p.email, source: p.source }))
      );
      
      return participantsWithEmail;
    } catch (error) {
      console.error('Error getting participants with emails:', error);
      return [];
    }
  }

  static async updateMeeting(meetingId, meetingData, companyUsers = [], employees = []) {
    try {
      let updatedData = { ...meetingData };
      
      if (meetingData.DateTime) {
        const firestoreDateTime = Timestamp.fromDate(
          meetingData.DateTime instanceof Date 
            ? meetingData.DateTime 
            : new Date(meetingData.DateTime)
        );
        updatedData.DateTime = firestoreDateTime;
      }

      updatedData.updatedAt = Timestamp.now();

      const meetingRef = doc(firestore, 'meetings', meetingId);
      await updateDoc(meetingRef, updatedData);
      
      console.log('✅ Meeting updated with ID:', meetingId);

      let notificationResults = [];
      try {
        const updatedMeeting = {
          id: meetingId,
          ...meetingData,
          DateTime: meetingData.DateTime || new Date()
        };
        
        const participants = await MeetingService.getParticipantsWithEmails(
          meetingData, 
          companyUsers,
          employees
        );

        if (participants.length > 0) {
          console.log(`📧 Sending update notifications to ${participants.length} participants...`);
          
          notificationResults = await MeetingNotificationService.sendMeetingNotification(
            updatedMeeting, 
            'updated', 
            participants
          );
          
          await updateDoc(meetingRef, {
            notificationSent: true,
            notificationDate: Timestamp.now(),
            notificationResults: notificationResults
          });
        }
      } catch (notificationError) {
        console.error('❌ Error sending update notifications:', notificationError);
        await updateDoc(meetingRef, {
          notificationSent: false,
          notificationError: notificationError.message
        });
      }
      
      return { notificationResults };
    } catch (error) {
      console.error('Error updating meeting:', error);
      throw error;
    }
  }

  static async deleteMeeting(meetingId) {
    try {
      const meetingRef = doc(firestore, 'meetings', meetingId);
      await deleteDoc(meetingRef);
    } catch (error) {
      console.error('Error deleting meeting:', error);
      throw error;
    }
  }

  static async getMeetingById(meetingId) {
    try {
      const meetingRef = doc(firestore, 'meetings', meetingId);
      const meetingSnap = await getDoc(meetingRef);
      
      if (meetingSnap.exists()) {
        const meetingData = meetingSnap.data();
        const dateTime = meetingData.DateTime instanceof Timestamp 
          ? meetingData.DateTime.toDate() 
          : new Date(meetingData.DateTime);
        
        return {
          id: meetingSnap.id,
          ...meetingData,
          DateTime: dateTime
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching meeting by ID:', error);
      throw error;
    }
  }

  static async resendMeetingNotifications(meetingId, companyUsers = [], employees = []) {
    try {
      const meeting = await MeetingService.getMeetingById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const meetingData = {
        id: meeting.id,
        Title: meeting.Title,
        DateTime: meeting.DateTime,
        Duration: meeting.Duration,
        Type: meeting.Type,
        Status: meeting.Status,
        Description: meeting.Description || '',
        MeetLink: meeting.MeetLink || '',
        Users: meeting.Users || [],
        ExternalParticipants: meeting.ExternalParticipants || [],
        creator_id: meeting.creator_id,
        company_id: meeting.company_id
      };

      const participants = await MeetingService.getParticipantsWithEmails(
        meetingData, 
        companyUsers,
        employees
      );

      if (participants.length === 0) {
        throw new Error('No participants with email addresses found');
      }

      const notificationResults = await MeetingNotificationService.sendMeetingNotification(
        meetingData, 
        'created', 
        participants
      );

      const meetingRef = doc(firestore, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        notificationSent: true,
        notificationDate: Timestamp.now(),
        notificationResults: notificationResults
      });

      return { notificationResults };
    } catch (error) {
      console.error('Error resending notifications:', error);
      throw error;
    }
  }
}

export default MeetingService;