// MeetingService.js - Updated with email notification on create

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

// Import the notification service
import MeetingNotificationService from './MeetingNotificationService';

/**
 * Service class for handling meeting-related operations with Firestore
 */
class MeetingService {
  /**
   * Fetches all meetings for a specific company
   * @param {string} companyId - The ID of the company
   * @returns {Promise<Array>} - Array of meeting objects
   */
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
        
        // Convert Firestore timestamps to JavaScript Date objects
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

  /**
   * Fetches all users for a specific company (for meeting participant selection)
   * @param {string} companyId - The ID of the company
   * @returns {Promise<Array>} - Array of user objects
   */
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
   * Creates a new meeting in Firestore and sends email notifications
   * @param {Object} meetingData - Meeting data to be saved
   * @param {Array} companyUsers - List of all company users (for email lookup)
   * @returns {Promise<Object>} - { meetingId: string, notificationResults: Array }
   */
  static async createMeeting(meetingData, companyUsers = []) {
    try {
      // Convert JavaScript Date to Firestore Timestamp
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
        notificationDate: null
      };

      const meetingsRef = collection(firestore, 'meetings');
      const docRef = await addDoc(meetingsRef, meetingWithTimestamp);
      
      console.log('✅ Meeting created with ID:', docRef.id);

      // Prepare the meeting object with ID for email
      const newMeeting = {
        id: docRef.id,
        ...meetingData,
        DateTime: meetingData.DateTime
      };

      // Send email notifications
      let notificationResults = [];
      try {
        // Get all participants with their email addresses
        const participants = await MeetingService.getParticipantsWithEmails(
          meetingData, 
          companyUsers
        );

        if (participants.length > 0) {
          console.log(`📧 Sending notifications to ${participants.length} participants...`);
          
          notificationResults = await MeetingNotificationService.sendMeetingNotification(
            newMeeting, 
            'created', 
            participants
          );
          
          // Update meeting with notification status
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
        // Update meeting with error status
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

  /**
   * Gets participants with their email addresses for notification
   * @param {Object} meetingData - The meeting data
   * @param {Array} companyUsers - List of all company users
   * @returns {Promise<Array>} - Array of participant objects with name and email
   */
  static async getParticipantsWithEmails(meetingData, companyUsers = []) {
    try {
      const participants = [];
      const userMap = new Map();
      
      // Create a map of user IDs to user data for quick lookup
      companyUsers.forEach(user => {
        if (user.id) {
          userMap.set(user.id, user);
        }
      });

      // Process internal participants (Users array contains user IDs)
      if (meetingData.Users && meetingData.Users.length > 0) {
        for (const userId of meetingData.Users) {
          // Check if the user exists in the company users list
          const user = userMap.get(userId);
          if (user) {
            const participantName = user.name || `${user.firstname || ''} ${user.lastname || ''}`.trim() || 'User';
            participants.push({
              id: userId,
              name: participantName,
              email: user.email || '',
              role: user.Role || user.role || ''
            });
          } else {
            // Try to fetch user from Firestore if not in the provided list
            try {
              const userRef = doc(firestore, 'users', userId);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const userData = userSnap.data();
                participants.push({
                  id: userId,
                  name: `${userData.firstname || ''} ${userData.lastname || ''}`.trim() || 'User',
                  email: userData.email || '',
                  role: userData.Role || userData.role || ''
                });
              }
            } catch (err) {
              console.warn(`Could not fetch user ${userId}:`, err);
            }
          }
        }
      }

      // Process external participants (ExternalParticipants contains free text names/emails)
      if (meetingData.ExternalParticipants && meetingData.ExternalParticipants.length > 0) {
        for (const external of meetingData.ExternalParticipants) {
          // Check if the external participant is an email
          const isEmail = external.includes('@');
          participants.push({
            id: `external_${Date.now()}_${Math.random()}`,
            name: isEmail ? external.split('@')[0] : external,
            email: isEmail ? external : null, // Only send email if it's a valid email
            isExternal: true
          });
        }
      }

      // Filter out participants without email addresses
      const participantsWithEmail = participants.filter(p => p.email && p.email.trim() !== '');
      
      console.log(`📧 Found ${participantsWithEmail.length} participants with email addresses`);
      return participantsWithEmail;
    } catch (error) {
      console.error('Error getting participants with emails:', error);
      return [];
    }
  }

  /**
   * Updates an existing meeting in Firestore
   * @param {string} meetingId - ID of the meeting to update
   * @param {Object} meetingData - Updated meeting data
   * @param {Array} companyUsers - List of all company users
   * @returns {Promise<Object>} - { notificationResults: Array }
   */
  static async updateMeeting(meetingId, meetingData, companyUsers = []) {
    try {
      // Convert JavaScript Date to Firestore Timestamp if it exists
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

      // Send update notifications
      let notificationResults = [];
      try {
        const updatedMeeting = {
          id: meetingId,
          ...meetingData,
          DateTime: meetingData.DateTime || new Date()
        };
        
        const participants = await MeetingService.getParticipantsWithEmails(
          meetingData, 
          companyUsers
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

  /**
   * Deletes a meeting from Firestore
   * @param {string} meetingId - ID of the meeting to delete
   * @returns {Promise<void>}
   */
  static async deleteMeeting(meetingId) {
    try {
      const meetingRef = doc(firestore, 'meetings', meetingId);
      await deleteDoc(meetingRef);
    } catch (error) {
      console.error('Error deleting meeting:', error);
      throw error;
    }
  }

  /**
   * Fetches a single meeting by ID
   * @param {string} meetingId - ID of the meeting to fetch
   * @returns {Promise<Object|null>} - Meeting object or null if not found
   */
  static async getMeetingById(meetingId) {
    try {
      const meetingRef = doc(firestore, 'meetings', meetingId);
      const meetingSnap = await getDoc(meetingRef);
      
      if (meetingSnap.exists()) {
        const meetingData = meetingSnap.data();
        
        // Convert Firestore timestamp to JavaScript Date
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

  /**
   * Resend notifications for an existing meeting
   * @param {string} meetingId - ID of the meeting
   * @param {Array} companyUsers - List of all company users
   * @returns {Promise<Object>} - { notificationResults: Array }
   */
  static async resendMeetingNotifications(meetingId, companyUsers = []) {
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
        companyUsers
      );

      if (participants.length === 0) {
        throw new Error('No participants with email addresses found');
      }

      const notificationResults = await MeetingNotificationService.sendMeetingNotification(
        meetingData, 
        'created', 
        participants
      );

      // Update meeting with notification status
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