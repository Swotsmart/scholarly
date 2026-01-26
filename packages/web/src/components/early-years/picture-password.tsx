'use client';

/**
 * Picture Password Component
 * Child-friendly authentication using picture sequences
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowLeft, Sparkles, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PICTURE_PASSWORD_CATEGORIES, type PicturePasswordImage } from '@/types/early-years';
import { useEarlyYearsStore, usePicturePassword } from '@/stores/early-years-store';

interface PicturePasswordProps {
  childId: string;
  childName: string;
  mode: 'setup' | 'login';
  onSuccess: () => void;
  onCancel: () => void;
}

export function PicturePassword({
  childId,
  childName,
  mode,
  onSuccess,
  onCancel,
}: PicturePasswordProps) {
  const [activeCategory, setActiveCategory] = useState(PICTURE_PASSWORD_CATEGORIES[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const pictureSequence = usePicturePassword();
  const {
    addToPicturePassword,
    removeFromPicturePassword,
    clearPicturePassword,
    setupPicturePassword,
    authenticateChild,
  } = useEarlyYearsStore();

  const currentCategory = PICTURE_PASSWORD_CATEGORIES.find((c) => c.id === activeCategory)!;
  const minImages = 3;
  const maxImages = 6;

  const handleImageClick = useCallback(
    (image: PicturePasswordImage) => {
      setError(null);
      if (pictureSequence.length < maxImages) {
        addToPicturePassword(image.id);
      }
    },
    [pictureSequence.length, addToPicturePassword]
  );

  const handleRemoveImage = useCallback(
    (index: number) => {
      removeFromPicturePassword(index);
      setError(null);
    },
    [removeFromPicturePassword]
  );

  const handleSubmit = async () => {
    if (pictureSequence.length < minImages) {
      setError(`Please pick at least ${minImages} pictures!`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'setup') {
        const success = await setupPicturePassword(childId);
        if (success) {
          setShowSuccess(true);
          setTimeout(onSuccess, 2000);
        } else {
          setError('Oops! Something went wrong. Try again!');
        }
      } else {
        const success = await authenticateChild(childId, pictureSequence);
        if (success) {
          setShowSuccess(true);
          setTimeout(onSuccess, 1500);
        } else {
          setError('That\'s not quite right. Try again!');
          clearPicturePassword();
        }
      }
    } catch {
      setError('Oops! Something went wrong. Try again!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getImageById = (id: string): PicturePasswordImage | undefined => {
    for (const category of PICTURE_PASSWORD_CATEGORIES) {
      const image = category.images.find((img) => img.id === id);
      if (image) return image;
    }
    return undefined;
  };

  if (showSuccess) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mb-6"
        >
          <Sparkles className="w-12 h-12 text-white" />
        </motion.div>
        <h2 className="text-3xl font-bold text-green-600 mb-2">
          {mode === 'setup' ? 'All Done!' : 'Welcome Back!'}
        </h2>
        <p className="text-xl text-gray-600">
          {mode === 'setup'
            ? 'Your secret pictures are saved!'
            : `Great job, ${childName}!`}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="inline-flex items-center gap-2 mb-2"
        >
          {mode === 'setup' ? (
            <Lock className="w-8 h-8 text-purple-500" />
          ) : (
            <Unlock className="w-8 h-8 text-blue-500" />
          )}
        </motion.div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          {mode === 'setup'
            ? `Hi ${childName}! Let's make your secret pictures!`
            : `Hi ${childName}! Pick your secret pictures!`}
        </h1>
        <p className="text-lg text-gray-600">
          {mode === 'setup'
            ? `Pick ${minImages} to ${maxImages} pictures to be your secret password`
            : 'Tap the pictures in the right order'}
        </p>
      </div>

      {/* Selected Pictures Display */}
      <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-semibold text-gray-700">
            Your secret pictures:
          </span>
          <span className="text-sm text-gray-500">
            ({pictureSequence.length}/{maxImages})
          </span>
        </div>
        <div className="flex flex-wrap gap-3 min-h-[80px]">
          <AnimatePresence mode="popLayout">
            {pictureSequence.map((imageId, index) => {
              const image = getImageById(imageId);
              if (!image) return null;
              return (
                <motion.button
                  key={`${imageId}-${index}`}
                  layout
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleRemoveImage(index)}
                  className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 border-3 border-purple-300 overflow-hidden group"
                  title={`Remove ${image.name}`}
                >
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    {getEmojiForImage(image.id)}
                  </div>
                  <div className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <X className="w-8 h-8 text-white" />
                  </div>
                  <span className="absolute bottom-0 left-0 right-0 bg-purple-600 text-white text-xs py-0.5 text-center font-bold">
                    {index + 1}
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
          {pictureSequence.length === 0 && (
            <div className="flex items-center justify-center w-full text-gray-400 text-lg">
              Tap pictures below to add them here!
            </div>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {PICTURE_PASSWORD_CATEGORIES.map((category) => (
          <motion.button
            key={category.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveCategory(category.id)}
            className={cn(
              'px-4 py-2 rounded-full text-lg font-semibold transition-colors',
              activeCategory === category.id
                ? 'bg-purple-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            <span className="mr-2">{category.icon}</span>
            {category.name}
          </motion.button>
        ))}
      </div>

      {/* Picture Grid */}
      <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {currentCategory.images.map((image) => {
            const isSelected = pictureSequence.includes(image.id);
            const selectCount = pictureSequence.filter((id) => id === image.id).length;

            return (
              <motion.button
                key={image.id}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleImageClick(image)}
                disabled={pictureSequence.length >= maxImages && !isSelected}
                className={cn(
                  'relative aspect-square rounded-xl overflow-hidden transition-all',
                  'border-4 hover:border-purple-400',
                  isSelected
                    ? 'border-purple-500 bg-purple-100'
                    : 'border-gray-200 bg-gray-50',
                  pictureSequence.length >= maxImages && !isSelected && 'opacity-50'
                )}
              >
                <div className="w-full h-full flex items-center justify-center text-5xl">
                  {getEmojiForImage(image.id)}
                </div>
                <span className="absolute bottom-0 left-0 right-0 bg-white/90 text-gray-700 text-xs py-1 text-center font-medium">
                  {image.name}
                </span>
                {selectCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-purple-500 text-white text-sm font-bold flex items-center justify-center"
                  >
                    {selectCount}
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-100 border-2 border-red-300 text-red-700 px-4 py-3 rounded-xl mb-4 text-center text-lg"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCancel}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-200 text-gray-700 text-lg font-semibold hover:bg-gray-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Go Back
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={pictureSequence.length < minImages || isSubmitting}
          className={cn(
            'flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-lg font-semibold transition-colors',
            pictureSequence.length >= minImages
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          )}
        >
          {isSubmitting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
              Checking...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              {mode === 'setup' ? 'Save My Pictures!' : 'That\'s It!'}
            </>
          )}
        </motion.button>

        {pictureSequence.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={clearPicturePassword}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-100 text-orange-700 text-lg font-semibold hover:bg-orange-200 transition-colors"
          >
            <X className="w-5 h-5" />
            Start Over
          </motion.button>
        )}
      </div>

      {/* Help Text */}
      <p className="text-center text-gray-500 mt-4 text-sm">
        {mode === 'setup'
          ? 'Tip: Pick pictures you\'ll remember! You can use the same picture more than once.'
          : 'Tip: Tap your pictures in the same order you picked them!'}
      </p>
    </div>
  );
}

// Helper function to get emoji for image (fallback until real images are added)
function getEmojiForImage(imageId: string): string {
  const emojiMap: Record<string, string> = {
    // Animals
    dog: '🐕',
    cat: '🐱',
    bird: '🐦',
    fish: '🐠',
    rabbit: '🐰',
    elephant: '🐘',
    // Food
    apple: '🍎',
    banana: '🍌',
    pizza: '🍕',
    icecream: '🍦',
    cookie: '🍪',
    cake: '🎂',
    // Transport
    car: '🚗',
    bus: '🚌',
    train: '🚂',
    plane: '✈️',
    boat: '⛵',
    rocket: '🚀',
    // Nature
    sun: '☀️',
    moon: '🌙',
    star: '⭐',
    flower: '🌸',
    tree: '🌳',
    rainbow: '🌈',
    // Toys
    ball: '⚽',
    teddy: '🧸',
    blocks: '🧱',
    doll: '🎎',
    robot: '🤖',
    kite: '🪁',
    // Shapes
    circle: '🔵',
    square: '🟦',
    triangle: '🔺',
    heart: '❤️',
    diamond: '💎',
    oval: '🥚',
  };
  return emojiMap[imageId] || '❓';
}
