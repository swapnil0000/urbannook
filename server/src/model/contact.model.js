import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      enum: {
        values: ['Product Inquiry', 'Interior Design', 'Partnership', 'Support'],
        message: '{VALUE} is not a valid inquiry type'
      }
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [10, 'Message must be at least 10 characters'],
      maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'resolved', 'closed'],
      default: 'pending'
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
    },
    resolvedAt: {
      type: Date
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for efficient querying
contactSchema.index({ email: 1, createdAt: -1 });
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ subject: 1, createdAt: -1 });

// Virtual for response time (if resolved)
contactSchema.virtual('responseTime').get(function() {
  if (this.resolvedAt && this.createdAt) {
    return Math.floor((this.resolvedAt - this.createdAt) / (1000 * 60 * 60)); // hours
  }
  return null;
});

// Method to mark as resolved
contactSchema.methods.markAsResolved = function(adminId, notes) {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.resolvedBy = adminId;
  if (notes) {
    this.adminNotes = notes;
  }
  return this.save();
};

// Static method to get pending count
contactSchema.statics.getPendingCount = function() {
  return this.countDocuments({ status: 'pending' });
};

// Static method to get inquiries by subject
contactSchema.statics.getBySubject = function(subject, limit = 10) {
  return this.find({ subject })
    .sort({ createdAt: -1 })
    .limit(limit);
};

const Contact = mongoose.model('Contact', contactSchema);

export default Contact;
