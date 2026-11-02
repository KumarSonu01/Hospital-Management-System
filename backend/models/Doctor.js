const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const doctorSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    specialty: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, unique: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    department: { type: String, default: 'General Medicine' },
    role: { type: String, default: 'doctor' },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

doctorSchema.index({ email: 1 });
doctorSchema.index({ specialty: 1 });
doctorSchema.index({ licenseNumber: 1 });

doctorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

doctorSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;