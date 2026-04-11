const Notification = require('../../models/Notification');

async function createNotification({ userId, role, title, message, type = 'info', relatedId }) {
  return Notification.create({
    userId,
    role,
    title,
    message,
    type,
    relatedId
  });
}

async function emitToUser(io, userId, event, payload) {
  if (io) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}

async function notifyAndPush(io, params) {
  const doc = await createNotification(params);
  await emitToUser(io, params.userId, 'notification', doc.toObject());
  return doc;
}

module.exports = {
  createNotification,
  emitToUser,
  notifyAndPush
};
