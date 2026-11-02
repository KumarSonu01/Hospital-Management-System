const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, 'First name is required'], trim: true },
    lastName: { type: String, required: [true, 'Last name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address']
    },
    password: { type: String, required: [true, 'Password is required'] },
    role: {
      type: String,
      required: true,
      enum: ['patient', 'doctor', 'admin', 'receptionist', 'nurse', 'pharmacist'],
      default: 'patient'
    },
    phoneNumber: { type: String, trim: true, default: '' },
    specialty: { type: String, trim: true, default: '' },
    licenseNumber: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '' },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say', ''], default: '' },
    bloodGroup: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relation: { type: String, default: '' }
    },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ specialty: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
