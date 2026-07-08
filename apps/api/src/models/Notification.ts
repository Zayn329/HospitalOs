import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  sentAt: Date;
  readAt?: Date;
  status: 'unread' | 'read';
}

const NotificationSchema: Schema = new Schema({
  recipientId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  sentAt: { type: Date, default: Date.now },
  readAt: { type: Date },
  status: { type: String, enum: ['unread', 'read'], default: 'unread' }
});

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
