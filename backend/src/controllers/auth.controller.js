const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');
const { isValidEmail, isStrongPassword, isValidName } = require('../utils/validators');
const {
  findUserByEmail,
  findUserById,
  createUserWithWallet
} = require('../models/auth.model');

const buildToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

const register = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!isValidName(fullName)) {
    throw new AppError('Full name must contain 2-100 characters', 400, 'INVALID_NAME');
  }

  if (!isValidEmail(email)) {
    throw new AppError('A valid email address is required', 400, 'INVALID_EMAIL');
  }

  if (!isStrongPassword(password)) {
    throw new AppError(
      'Password must be at least 8 characters and contain letters and numbers',
      400,
      'WEAK_PASSWORD'
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const { user, wallet } = await createUserWithWallet({
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash
    });

    const token = buildToken(user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user,
        wallet,
        token
      }
    });
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
    }
    throw error;
  }
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!isValidEmail(email) || typeof password !== 'string' || password.length === 0) {
    throw new AppError('Email and password are required', 400, 'INVALID_CREDENTIALS_INPUT');
  }

  const user = await findUserByEmail(email.trim().toLowerCase());

  if (!user || !user.is_active) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const token = buildToken(user);
  delete user.password_hash;

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      token
    }
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await findUserById(req.user.sub);

  if (!user || !user.is_active) {
    throw new AppError('User account not found', 404, 'USER_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: { user }
  });
});

module.exports = {
  register,
  login,
  me
};
