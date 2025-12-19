import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'sonner';
import { X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_URL } from '../lib/config';
const MEDIA_API = `${API_URL}/media`;

export default function StoryModal({ stories, initialIndex, onClose, onStoryDeleted }) {
  const { user } = useSelector((state) => state.auth);
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [progress, setProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentStory = stories[currentIndex];
  const isOwner = currentStory?.author?._id === user?._id;

  // Auto-progress story every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((prevIdx) => {
            const nextIdx = prevIdx + 1;
            if (nextIdx >= stories.length) {
              onClose();
              return prevIdx;
            }
            return nextIdx;
          });
          return 0;
        }
        return prev + 2;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [stories.length, onClose]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handleDeleteStory = async () => {
    if (!confirm('Are you sure you want to delete this story?')) return;

    setIsDeleting(true);
    try {
      const res = await axios.delete(`${MEDIA_API}/story/${currentStory._id}`, {
        withCredentials: true,
      });

      if (res.data.success) {
        toast.success('Story deleted');
        onStoryDeleted(currentStory._id);
        
        // Move to next story or close if it's the last one
        if (currentIndex < stories.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setProgress(0);
        } else if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
          setProgress(0);
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to delete story');
    } finally {
      setIsDeleting(false);
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
        {stories.map((_, idx) => (
          <div
            key={idx}
            className="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header with user and delete button */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <img
            src={currentStory?.author?.profilePicture || 'https://via.placeholder.com/40'}
            alt={currentStory?.author?.username}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className="text-white font-semibold text-sm">
              {currentStory?.author?.username}
            </p>
            <p className="text-gray-400 text-xs">
              {getTimeAgo(currentStory?.publishedAt || currentStory?.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isOwner && (
            <button
              onClick={handleDeleteStory}
              disabled={isDeleting}
              className="p-2 hover:bg-gray-800 rounded-full transition disabled:opacity-50"
              title="Delete story"
            >
              <Trash2 size={20} className="text-red-500" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition"
            title="Close"
          >
            <X size={24} className="text-white" />
          </button>
        </div>
      </div>

      {/* Story content */}
      <div className="relative w-full h-full max-w-md max-h-screen flex items-center justify-center">
        {currentStory?.mediaType === 'image' ? (
          <img
            src={currentStory.mediaUrl}
            alt="story"
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            src={currentStory?.mediaUrl}
            className="w-full h-full object-contain"
            autoPlay
            controls
          />
        )}
      </div>

      {/* Navigation buttons */}
      {currentIndex > 0 && (
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-800 rounded-full transition z-20"
        >
          <ChevronLeft size={32} className="text-white" />
        </button>
      )}

      {currentIndex < stories.length - 1 && (
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-800 rounded-full transition z-20"
        >
          <ChevronRight size={32} className="text-white" />
        </button>
      )}

      {/* Tap zones for navigation */}
      <div
        onClick={goToPrevious}
        className="absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer"
      />
      <div
        onClick={goToNext}
        className="absolute right-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer"
      />
    </div>
  );
}
