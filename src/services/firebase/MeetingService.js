import BaseFirebaseService from './BaseFirebaseService';
import { convertToMeetingModel, MeetingLocationType, MeetingStatus, MeetingAttendeeType, MeetingRelatedType, MeetingRecurrenceType } from '../../models/MeetingModel';

/**
 * Service for managing meetings with Firebase
 * Extends BaseFirebaseService for common CRUD operations
 */
class MeetingService extends BaseFirebaseService {
  /**
   * Constructor
   */
  constructor() {
    super('meetings', convertToMeetingModel);
  }

  /**
   * Get meetings by company ID
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of meetings
   */
  async getMeetingsByCompany(companyId, options = {}) {
    return this.getAllByCompany(companyId, options);
  }

  /**
   * Get meetings by status
   * @param {string} companyId - Company ID
   * @param {string} status - Meeting status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of meetings
   */
  async getMeetingsByStatus(companyId, status, options = {}) {
    const statusFilter = ['status', '==', status];
    const filters = options.filters ? [...options.filters, statusFilter] : [statusFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Get meetings for a specific user (where user is organizer or attendee)
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of meetings
   */
  async getMeetingsForUser(companyId, userId, options = {}) {
    // This is complex because attendees is an array
    // First get meetings where user is organizer
    const organizerFilter = ['organizerId', '==', userId];
    const organizerMeetings = await this.getAllByCompany(companyId, {
      filters: [organizerFilter]
    });
    
    // Then get all meetings and filter client-side for attendees
    // This is not efficient but Firestore doesn't support array-contains-any with other filters well
    const allMeetings = await this.getAllByCompany(companyId);
    const attendeeMeetings = allMeetings.filter(meeting => {
      return meeting.attendees && 
        meeting.attendees.some(attendee => attendee.id === userId);
    });
    
    // Combine and remove duplicates
    const meetingIds = new Set();
    const combinedMeetings = [];
    
    [...organizerMeetings, ...attendeeMeetings].forEach(meeting => {
      if (!meetingIds.has(meeting.id)) {
        meetingIds.add(meeting.id);
        combinedMeetings.push(meeting);
      }
    });
    
    return combinedMeetings;
  }

  /**
   * Get meetings for a date range
   * @param {string} companyId - Company ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} userId - Optional user ID to filter by
   * @returns {Promise<Array>} - Array of meetings
   */
  async getMeetingsByDateRange(companyId, startDate, endDate, userId = null) {
    const startFilter = ['startTime', '>=', startDate];
    const endFilter = ['startTime', '<=', endDate];
    const filters = [startFilter, endFilter];
    
    if (userId) {
      // Due to limitations, we'll just filter by organizer here
      // and client-side filter for attendees
      filters.push(['organizerId', '==', userId]);
      
      const organizerMeetings = await this.getAllByCompany(companyId, {
        filters,
        orderByFields: [['startTime', 'asc']]
      });
      
      // If we need attendee meetings too, we need additional filtering
      const allMeetings = await this.getAllByCompany(companyId, {
        filters: [startFilter, endFilter],
        orderByFields: [['startTime', 'asc']]
      });
      
      const attendeeMeetings = allMeetings.filter(meeting => {
        return meeting.attendees && 
          meeting.attendees.some(attendee => attendee.id === userId);
      });
      
      // Combine and remove duplicates
      const meetingIds = new Set();
      const combinedMeetings = [];
      
      [...organizerMeetings, ...attendeeMeetings].forEach(meeting => {
        if (!meetingIds.has(meeting.id)) {
          meetingIds.add(meeting.id);
          combinedMeetings.push(meeting);
        }
      });
      
      return combinedMeetings;
    }
    
    return this.getAllByCompany(companyId, {
      filters,
      orderByFields: [['startTime', 'asc']]
    });
  }

  /**
   * Get meetings related to a specific entity
   * @param {string} companyId - Company ID
   * @param {string} relatedType - Related entity type (contact, lead, deal, property)
   * @param {string} relatedId - Related entity ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of meetings
   */
  async getMeetingsByRelatedEntity(companyId, relatedType, relatedId, options = {}) {
    const relatedTypeFilter = ['relatedType', '==', relatedType];
    const relatedIdFilter = ['relatedId', '==', relatedId];
    
    const filters = options.filters ? 
      [...options.filters, relatedTypeFilter, relatedIdFilter] : 
      [relatedTypeFilter, relatedIdFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Schedule a new meeting
   * @param {Object} meetingData - Meeting data
   * @returns {Promise<Object>} - Created meeting
   */
  async scheduleMeeting(meetingData) {
    // Validate required fields
    if (!meetingData.title || !meetingData.startTime || !meetingData.endTime) {
      throw new Error('Meeting requires title, start time, and end time');
    }
    
    // Set default values
    const newMeeting = {
      ...meetingData,
      status: meetingData.status || MeetingStatus.SCHEDULED,
      locationType: meetingData.locationType || MeetingLocationType.IN_PERSON,
      isAllDay: meetingData.isAllDay || false,
      reminders: meetingData.reminders || [
        { minutes: 15, sent: false },
        { minutes: 60, sent: false }
      ],
      attendees: meetingData.attendees || []
    };
    
    return this.create(newMeeting);
  }

  /**
   * Update meeting status
   * @param {string} meetingId - Meeting ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated meeting
   */
  async updateStatus(meetingId, status) {
    // Validate status
    if (!Object.values(MeetingStatus).includes(status)) {
      throw new Error(`Invalid meeting status: ${status}`);
    }
    
    return this.update(meetingId, { status });
  }

  /**
   * Add attendee to a meeting
   * @param {string} meetingId - Meeting ID
   * @param {Object} attendee - Attendee object
   * @returns {Promise<Object>} - Updated meeting
   */
  async addAttendee(meetingId, attendee) {
    const meeting = await this.getById(meetingId);
    
    if (!meeting) {
      throw new Error('Meeting not found');
    }
    
    const attendees = meeting.attendees || [];
    
    // Check if attendee already exists
    const exists = attendees.some(a => a.id === attendee.id);
    
    if (!exists) {
      attendees.push({
        ...attendee,
        type: attendee.type || MeetingAttendeeType.USER, // Using USER as the default attendee type
        status: attendee.status || 'pending'
      });
      
      return this.update(meetingId, { attendees });
    }
    
    return meeting;
  }

  /**
   * Remove attendee from a meeting
   * @param {string} meetingId - Meeting ID
   * @param {string} attendeeId - Attendee ID
   * @returns {Promise<Object>} - Updated meeting
   */
  async removeAttendee(meetingId, attendeeId) {
    const meeting = await this.getById(meetingId);
    
    if (!meeting) {
      throw new Error('Meeting not found');
    }
    
    const attendees = meeting.attendees || [];
    const updatedAttendees = attendees.filter(a => a.id !== attendeeId);
    
    return this.update(meetingId, { attendees: updatedAttendees });
  }

  /**
   * Update attendee status
   * @param {string} meetingId - Meeting ID
   * @param {string} attendeeId - Attendee ID
   * @param {string} status - New status (accepted, declined, tentative)
   * @returns {Promise<Object>} - Updated meeting
   */
  async updateAttendeeStatus(meetingId, attendeeId, status) {
    const meeting = await this.getById(meetingId);
    
    if (!meeting) {
      throw new Error('Meeting not found');
    }
    
    const attendees = meeting.attendees || [];
    const updatedAttendees = attendees.map(a => {
      if (a.id === attendeeId) {
        return { ...a, status };
      }
      return a;
    });
    
    return this.update(meetingId, { attendees: updatedAttendees });
  }

  /**
   * Reschedule a meeting
   * @param {string} meetingId - Meeting ID
   * @param {Date} startTime - New start time
   * @param {Date} endTime - New end time
   * @param {boolean} notifyAttendees - Whether to notify attendees
   * @returns {Promise<Object>} - Updated meeting
   */
  async rescheduleMeeting(meetingId, startTime, endTime, notifyAttendees = true) {
    const meeting = await this.getById(meetingId);
    
    if (!meeting) {
      throw new Error('Meeting not found');
    }
    
    // Update meeting times
    const updatedMeeting = await this.update(meetingId, { 
      startTime, 
      endTime,
      rescheduled: true,
      previousStartTime: meeting.startTime,
      previousEndTime: meeting.endTime
    });
    
    // In a real implementation, this would trigger notifications
    if (notifyAttendees && meeting.attendees && meeting.attendees.length > 0) {
      console.log(`Notifying ${meeting.attendees.length} attendees about rescheduled meeting`);
      // This would use Firebase Functions to send notifications
    }
    
    return updatedMeeting;
  }

  /**
   * Cancel a meeting
   * @param {string} meetingId - Meeting ID
   * @param {string} reason - Cancellation reason
   * @param {boolean} notifyAttendees - Whether to notify attendees
   * @returns {Promise<Object>} - Updated meeting
   */
  async cancelMeeting(meetingId, reason = '', notifyAttendees = true) {
    const meeting = await this.getById(meetingId);
    
    if (!meeting) {
      throw new Error('Meeting not found');
    }
    
    // Update meeting status
    const updatedMeeting = await this.update(meetingId, { 
      status: MeetingStatus.CANCELLED,
      cancellationReason: reason,
      cancelledAt: new Date()
    });
    
    // In a real implementation, this would trigger notifications
    if (notifyAttendees && meeting.attendees && meeting.attendees.length > 0) {
      console.log(`Notifying ${meeting.attendees.length} attendees about cancelled meeting`);
      // This would use Firebase Functions to send notifications
    }
    
    return updatedMeeting;
  }

  /**
   * Create a recurring meeting series
   * @param {Object} meetingData - Base meeting data
   * @param {string} recurrenceType - Recurrence type
   * @param {number} recurrenceCount - Number of occurrences
   * @param {Object} recurrenceOptions - Additional recurrence options
   * @returns {Promise<Array>} - Created meetings
   */
  async createRecurringMeetings(meetingData, recurrenceType, recurrenceCount = 10, recurrenceOptions = {}) {
    try {
      if (!Object.values(MeetingRecurrenceType).includes(recurrenceType)) {
        throw new Error(`Invalid recurrence type: ${recurrenceType}`);
      }
      
      const meetings = [];
      const seriesId = `series-${Date.now()}`;
      
      // Create base meeting
      const baseMeeting = {
        ...meetingData,
        recurrenceType,
        recurrenceOptions,
        seriesId,
        isRecurring: true,
        isSeriesMaster: true,
        recurrenceCount,
        status: meetingData.status || MeetingStatus.SCHEDULED
      };
      
      const firstMeeting = await this.create(baseMeeting);
      meetings.push(firstMeeting);
      
      // Calculate start times for recurrences
      const startDate = new Date(meetingData.startTime);
      const endDate = new Date(meetingData.endTime);
      const duration = endDate.getTime() - startDate.getTime();
      
      for (let i = 1; i < recurrenceCount; i++) {
        const nextStartDate = new Date(startDate);
        
        switch (recurrenceType) {
          case MeetingRecurrenceType.DAILY:
            nextStartDate.setDate(startDate.getDate() + i);
            break;
          case MeetingRecurrenceType.WEEKLY:
            nextStartDate.setDate(startDate.getDate() + (i * 7));
            break;
          case MeetingRecurrenceType.BIWEEKLY:
            nextStartDate.setDate(startDate.getDate() + (i * 14));
            break;
          case MeetingRecurrenceType.MONTHLY:
            nextStartDate.setMonth(startDate.getMonth() + i);
            break;
          case MeetingRecurrenceType.YEARLY:
            nextStartDate.setFullYear(startDate.getFullYear() + i);
            break;
          default:
            break;
        }
        
        const nextEndDate = new Date(nextStartDate.getTime() + duration);
        
        const recurrenceMeeting = {
          ...meetingData,
          startTime: nextStartDate,
          endTime: nextEndDate,
          recurrenceType,
          recurrenceOptions,
          seriesId,
          isRecurring: true,
          isSeriesMaster: false,
          recurrenceIndex: i,
          status: MeetingStatus.SCHEDULED
        };
        
        const createdMeeting = await this.create(recurrenceMeeting);
        meetings.push(createdMeeting);
      }
      
      return meetings;
    } catch (error) {
      console.error('Error creating recurring meetings:', error);
      throw error;
    }
  }

  /**
   * Get all meetings in a series
   * @param {string} seriesId - Series ID
   * @returns {Promise<Array>} - Array of meetings in the series
   */
  async getMeetingsBySeriesId(seriesId) {
    return this.getAll({
      filters: [['seriesId', '==', seriesId]],
      orderByFields: [['recurrenceIndex', 'asc']],
      limitCount: 0, // 0 means no limit
      startAfterDoc: null,
      includeDeleted: false
    });
  }

  /**
   * Get upcoming meetings for a user
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID
   * @param {number} days - Number of days to look ahead
   * @returns {Promise<Array>} - Array of upcoming meetings
   */
  async getUpcomingMeetings(companyId, userId, days = 7) {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);
    
    return this.getMeetingsByDateRange(companyId, now, future, userId);
  }

  /**
   * Add notes to a meeting
   * @param {string} meetingId - Meeting ID
   * @param {string} notes - Meeting notes
   * @returns {Promise<Object>} - Updated meeting
   */
  async addNotes(meetingId, notes) {
    return this.update(meetingId, { notes });
  }

  /**
   * Mark meeting as completed
   * @param {string} meetingId - Meeting ID
   * @param {Object} outcome - Meeting outcome
   * @returns {Promise<Object>} - Updated meeting
   */
  async markAsCompleted(meetingId, outcome = {}) {
    return this.update(meetingId, {
      status: MeetingStatus.COMPLETED,
      outcome,
      completedAt: new Date()
    });
  }
}

// Create and export a singleton instance
const meetingService = new MeetingService();
export default meetingService;
