import Contact from '../model/contact.model.js';

import contactNotificationTemplate from '../template/contactNotification.template.js';

class ContactService {
  async createSubmission({ name, email, subject, message }) {
    try {
      // Create and save contact submission
      const contact = new Contact({
        name,
        email,
        subject,
        message,
        status: 'pending'
      });

      await contact.save();

      // Send admin notification email (non-blocking)
      this.sendAdminNotification(contact).catch(err => {
        console.error('Failed to send admin notification email:', err);
      });

      return {
        statusCode: 201,
        message: 'Thank you for contacting us! We will get back to you soon.',
        data: {
          id: contact._id,
          name: contact.name,
          email: contact.email,
          subject: contact.subject,
          status: contact.status,
          createdAt: contact.createdAt
        },
        success: true
      };
    } catch (error) {
      console.error('Error creating contact submission:', error);
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return {
          statusCode: 400,
          message: messages.join(', '),
          data: null,
          success: false
        };
      }

      // Handle other errors
      return {
        statusCode: 500,
        message: 'Failed to submit contact form. Please try again later.',
        data: null,
        success: false
      };
    }
  }

  async sendAdminNotification(contact) {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@urbannook.com';
      const emailContent = contactNotificationTemplate({
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        message: contact.message,
        timestamp: contact.createdAt
      });

      await emailService.sendEmail({
        to: adminEmail,
        subject: `New Contact Form Submission: ${contact.subject}`,
        html: emailContent
      });

      console.log(`Admin notification sent for contact ${contact._id}`);
    } catch (error) {
      console.error('Error sending admin notification:', error);
      throw error;
    }
  }

  async getAllSubmissions({ status, subject, page = 1, limit = 20 }) {
    try {
      const query = {};
      if (status) query.status = status;
      if (subject) query.subject = subject;

      const skip = (page - 1) * limit;
      
      const [submissions, total] = await Promise.all([
        Contact.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Contact.countDocuments(query)
      ]);

      return {
        statusCode: 200,
        message: 'Submissions retrieved successfully',
        data: {
          submissions,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        },
        success: true
      };
    } catch (error) {
      console.error('Error fetching submissions:', error);
      return {
        statusCode: 500,
        message: 'Failed to fetch submissions',
        data: null,
        success: false
      };
    }
  }

  async updateSubmissionStatus(id, { status, adminNotes, adminId }) {
    try {
      const contact = await Contact.findById(id);
      
      if (!contact) {
        return {
          statusCode: 404,
          message: 'Contact submission not found',
          data: null,
          success: false
        };
      }

      contact.status = status;
      if (adminNotes) contact.adminNotes = adminNotes;
      
      if (status === 'resolved') {
        contact.resolvedAt = new Date();
        contact.resolvedBy = adminId;
      }

      await contact.save();

      return {
        statusCode: 200,
        message: 'Submission status updated successfully',
        data: contact,
        success: true
      };
    } catch (error) {
      console.error('Error updating submission status:', error);
      return {
        statusCode: 500,
        message: 'Failed to update submission status',
        data: null,
        success: false
      };
    }
  }
}

export default new ContactService();
