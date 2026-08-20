import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const SALT_ROUNDS = 10;
const JWT_EXPIRY = '7d';

const signToken = (id: string, role: string): string => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: JWT_EXPIRY,
  });
};

router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      throw new AppError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already in use', 409);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ email, hashedPassword });

    const token = signToken(user._id.toString(), user.role);

    res.status(201).json({ success: true, token });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new AppError('Invalid credentials', 401);
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = signToken(user._id.toString(), user.role);

    res.status(200).json({ success: true, token });
  })
);

export default router;
