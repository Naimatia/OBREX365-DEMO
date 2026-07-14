// src/services/MeetingNotificationService.js

/**
 * Service for sending meeting notifications via email
 */
class MeetingNotificationService {
  /**
   * Send meeting notifications to all participants
   * @param {Object} meeting - Meeting data
   * @param {string} action - 'created', 'updated', 'deleted', 'reminder'
   * @param {Array} recipients - List of recipient objects with name and email
   * @returns {Promise<Object>} - Response from the server
   */
  static async sendMeetingNotification(meeting, action = 'created', recipients = []) {
    try {
      // Validate inputs
      if (!meeting || !meeting.Title) {
        throw new Error('Meeting data is incomplete');
      }

      if (!recipients || recipients.length === 0) {
        console.log('No recipients to notify');
        return { success: true, message: 'No recipients to notify', results: [] };
      }

      // Prepare the meeting data for the email
      const meetingData = {
        id: meeting.id || 'temp-id',
        Title: meeting.Title,
        DateTime: meeting.DateTime instanceof Date ? meeting.DateTime : new Date(meeting.DateTime),
        Duration: meeting.Duration || 60,
        Type: meeting.Type || 'onSite',
        Status: meeting.Status || 'Pending',
        Description: meeting.Description || '',
        MeetLink: meeting.MeetLink || '',
        creator_id: meeting.creator_id || '',
        company_id: meeting.company_id || ''
      };

      // Prepare recipients with their names and emails
      const recipientList = recipients.map(r => ({
        name: r.name || r.displayName || 'Participant',
        email: r.email,
        otherParticipants: recipients
          .filter(p => p.id !== r.id)
          .map(p => p.name || p.displayName || 'Participant')
      }));

      // Filter out recipients without valid email
      const validRecipients = recipientList.filter(r => r.email && r.email.trim() !== '');

      if (validRecipients.length === 0) {
        console.warn('No valid email addresses found among recipients');
        return { success: true, message: 'No valid email addresses', results: [] };
      }

      console.log(`📧 Sending ${action} notification to ${validRecipients.length} recipients`);

      // Make the API call to your backend
      const apiUrl = process.env.REACT_APP_API_URL || 'https://mail-sender-bardawil.vercel.app';
      
      const response = await fetch(`${apiUrl}/send-meeting-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meeting: meetingData,
          recipients: validRecipients,
          action: action
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to send notifications (HTTP ${response.status})`);
      }

      const result = await response.json();
      console.log(`✅ Meeting notification (${action}) sent to ${validRecipients.length} recipients`);
      return result;
    } catch (error) {
      console.error('❌ Error sending meeting notification:', error);
      throw error;
    }
  }

  /**
   * Send meeting reminder notifications
   * @param {Array} meetings - Array of meetings with recipients
   * @returns {Promise<Object>} - Response from the server
   */
  static async sendMeetingReminders(meetings) {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://mail-sender-bardawil.vercel.app';
      
      const response = await fetch(`${apiUrl}/send-meeting-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meetings })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send reminders');
      }

      const result = await response.json();
      console.log(`✅ Meeting reminders sent to ${result.results?.filter(r => r.success).length || 0} recipients`);
      return result;
    } catch (error) {
      console.error('❌ Error sending meeting reminders:', error);
      throw error;
    }
  }

  /**
   * Send test email to verify configuration
   * @param {string} email - Email address to send test to
   * @returns {Promise<Object>} - Response from the server
   */
  static async sendTestEmail(email = 'atianaim@gmail.com') {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://mail-sender-bardawil.vercel.app';
      
      const response = await fetch(`${apiUrl}/send-test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: email })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send test email');
      }

      const result = await response.json();
      console.log(`✅ Test email sent to ${email}`);
      return result;
    } catch (error) {
      console.error('❌ Error sending test email:', error);
      throw error;
    }
  }
}

export default MeetingNotificationService;