import Contact from '../model/contact.model.js';
import contactNotificationTemplate from '../template/contactNotification.template.js';
import { ValidationError, NotFoundError, InternalServerError } from '../utils/errors.js';

class ContactService {
  async createSubmission({ name, email, subject, message }) {
    // Create and save contact submission
    const contact = new Contact({
      name,
      email,
      subject,
      message,
      status: 'pending'
    });

    try {
      await contact.save();
    } catch (error) {
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        throw new ValidationError(messages.join(', '));
      }
      throw error;
    }

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
  }

  async sendAdminNotification(contact) {
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
  }

  async getAllSubmissions({ status, subject, page = 1, limit = 20 }) {
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
  }

  async updateSubmissionStatus(id, { status, adminNotes, adminId }) {
    const contact = await Contact.findById(id);
    
    if (!contact) {
      throw new NotFoundError('Contact submission not found');
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
  }
}

export default new ContactService();
