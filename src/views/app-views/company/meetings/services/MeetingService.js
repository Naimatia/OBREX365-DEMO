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
   * Creates a new meeting in Firestore
   * @param {Object} meetingData - Meeting data to be saved
   * @returns {Promise<string>} - ID of the newly created meeting
   */
  static async createMeeting(meetingData) {
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
        createdAt: Timestamp.now()
      };

      const meetingsRef = collection(firestore, 'meetings');
      const docRef = await addDoc(meetingsRef, meetingWithTimestamp);
      return docRef.id;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

  /**
   * Updates an existing meeting in Firestore
   * @param {string} meetingId - ID of the meeting to update
   * @param {Object} meetingData - Updated meeting data
   * @returns {Promise<void>}
   */
  static async updateMeeting(meetingId, meetingData) {
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
}

export default MeetingService;
