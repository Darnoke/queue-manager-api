require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;

const userSchema = new Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['worker', 'admin', 'none'], default: 'worker' },
});

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    const username = process.env.ADMIN_LOGIN;

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      throw new Error('Username already in use');
    };

    const adminPassword = process.env.ADMIN_PASSWORD;

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const user = new User({
      username,
      password: hashedPassword,
      role: 'admin',
      defaultPassword: false,
    });

    await user.save();
    console.log('Admin user created successfully');
  } catch (error) {
    console.error(error);
  } finally {
    db.close();
  }
}

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
  createAdminUser();
});