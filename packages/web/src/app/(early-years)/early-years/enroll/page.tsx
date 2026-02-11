'use client';

/**
 * Child Enrollment Page
 * Allows parents to add a new child to the family
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Calendar, Sparkles, Check } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { useEarlyYearsStore } from '@/stores/early-years-store';
import { earlyYearsApi } from '@/lib/early-years-api';
import { AVATARS } from '@/components/early-years/child-selector';

const enrollmentSchema = z.object({
  firstName: z.string().min(1, 'Please enter a name').max(50),
  preferredName: z.string().max(50).optional(),
  dateOfBirth: z.string().refine((val) => {
    const date = new Date(val);
    const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 2 && age <= 8;
  }, 'Child must be between 2 and 8 years old'),
  avatarId: z.string().min(1, 'Please choose an avatar'),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

export default function EnrollChildPage() {
  const router = useRouter();
  const { family, loadFamily } = useEarlyYearsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      firstName: '',
      preferredName: '',
      dateOfBirth: '',
      avatarId: '',
    },
  });

  const selectedAvatar = watch('avatarId');

  const onSubmit = async (data: EnrollmentFormData) => {
    if (!family) {
      alert('Please create a family account first');
      return;
    }

    setIsSubmitting(true);
    try {
      await earlyYearsApi.enrollChild(family.id, {
        firstName: data.firstName,
        preferredName: data.preferredName || undefined,
        dateOfBirth: data.dateOfBirth,
        avatarId: data.avatarId,
      });

      setShowSuccess(true);

      // Reload family data
      await loadFamily();

      // Redirect after success animation
      setTimeout(() => {
        router.push('/early-years');
      }, 2000);
    } catch (error) {
      console.error('Failed to enroll child:', error);
      alert('Failed to enroll child. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-24 h-24 mx-auto rounded-full bg-green-500 flex items-center justify-center mb-6"
          >
            <Check className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to the Family!</h1>
          <p className="text-xl text-gray-600">
            {watch('preferredName') || watch('firstName')} is ready to start learning!
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-purple-50 to-pink-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Link
          href="/early-years"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Add a Little Explorer! 🌟
          </h1>
          <p className="text-lg text-gray-600">
            Let's set up your child's learning profile
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-3xl shadow-xl p-6 md:p-8 space-y-6"
        >
          {/* Name Fields */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-2">
                <User className="w-5 h-5 text-purple-500" />
                Child's Name
              </label>
              <input
                {...register('firstName')}
                type="text"
                placeholder="First name"
                className={cn(
                  'w-full px-4 py-3 text-lg rounded-xl border-2 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
                  errors.firstName
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 focus:border-purple-400'
                )}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-500">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-600 mb-2">
                Nickname (optional)
              </label>
              <input
                {...register('preferredName')}
                type="text"
                placeholder="What do they like to be called?"
                className="w-full px-4 py-3 text-lg rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              Date of Birth
            </label>
            <input
              {...register('dateOfBirth')}
              type="date"
              className={cn(
                'w-full px-4 py-3 text-lg rounded-xl border-2 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
                errors.dateOfBirth
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200 focus:border-purple-400'
              )}
            />
            {errors.dateOfBirth && (
              <p className="mt-1 text-sm text-red-500">{errors.dateOfBirth.message}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Little Explorers is designed for ages 3-7
            </p>
          </div>

          {/* Avatar Selection */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-4">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Choose an Avatar
            </label>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(AVATARS).map(([id, avatar]) => (
                <motion.button
                  key={id}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setValue('avatarId', id, { shouldValidate: true })}
                  className={cn(
                    'aspect-square rounded-2xl flex items-center justify-center text-4xl',
                    'border-4 transition-all bg-gradient-to-br',
                    avatar.bg,
                    selectedAvatar === id
                      ? 'border-purple-500 ring-4 ring-purple-500/30 scale-105'
                      : 'border-transparent hover:border-gray-300'
                  )}
                >
                  {avatar.emoji}
                </motion.button>
              ))}
            </div>
            {errors.avatarId && (
              <p className="mt-2 text-sm text-red-500">{errors.avatarId.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'w-full py-4 rounded-xl text-xl font-bold transition-all',
              'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
              'hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl',
              isSubmitting && 'opacity-70 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-6 h-6 border-3 border-white border-t-transparent rounded-full"
                />
                Creating Profile...
              </span>
            ) : (
              'Create Profile'
            )}
          </motion.button>
        </motion.form>

        {/* Info Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4"
        >
          <h3 className="font-semibold text-blue-800 mb-2">
            What happens next?
          </h3>
          <ul className="text-blue-700 space-y-1 text-sm">
            <li>• Your child will set up their picture password</li>
            <li>• They'll choose their learning mentor</li>
            <li>• Then the fun begins in Phonics Forest and Number Land!</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
