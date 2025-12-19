import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'sonner';
import { setAuthUser } from '../redux/authSlice';
import { ArrowLeft } from 'lucide-react';
import { API_URL } from '../lib/config';

export default function EditProfile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user?.profilePicture);
  const [input, setInput] = useState({
    bio: user?.bio || '',
    gender: user?.gender || '',
    privacy: user?.privacy || 'public',
  });

  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const fileChangeHandler = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePic(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const editProfileHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('bio', input.bio);
      if (input.gender) {
        formData.append('gender', input.gender);
      }
      if (input.privacy) {
        formData.append('privacy', input.privacy);
      }
      if (profilePic) {
        formData.append('profilePicture', profilePic);
      }

      const res = await axios.post(`${API_URL}/user/profile/edit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });

      if (res.data.success) {
        dispatch(setAuthUser(res.data.user));
        toast.success(res.data.message);
        navigate(`/profile/${user._id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 p-4 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
        <button
          onClick={() => navigate(`/profile/${user?._id}`)}
          className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Profile</h2>
      </div>

      {/* Form */}
      <form onSubmit={editProfileHandler} className="p-6 space-y-6">
        {/* Profile Picture */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <img
              src={previewUrl || 'https://via.placeholder.com/100'}
              alt="Preview"
              className="w-32 h-32 rounded-full object-cover"
            />
            <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={fileChangeHandler}
                className="hidden"
              />
              📷
            </label>
          </div>
          {profilePic && <p className="text-sm text-gray-400">Image selected</p>}
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Bio
          </label>
          <textarea
            name="bio"
            value={input.bio}
            onChange={changeEventHandler}
            placeholder="Tell us about yourself..."
            rows="4"
            maxLength={150}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <p className="text-xs text-gray-400 mt-1">
            {input.bio.length}/150 characters
          </p>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Gender
          </label>
          <select
            name="gender"
            value={input.gender}
            onChange={changeEventHandler}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="">Other</option>
            <option value="">Prefer not to say</option>
          </select>
        </div>

        {/* Privacy */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Account Privacy
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="privacy"
                value="public"
                checked={input.privacy === 'public'}
                onChange={changeEventHandler}
                disabled={loading}
                className="w-4 h-4"
              />
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Public Account</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Anyone can follow you and see your posts</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="privacy"
                value="private"
                checked={input.privacy === 'private'}
                onChange={changeEventHandler}
                disabled={loading}
                className="w-4 h-4"
              />
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Private Account</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">You approve follow requests and only followers see your posts</p>
              </div>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-6">
          <button
            type="button"
            onClick={() => navigate(`/profile/${user?._id}`)}
            className="flex-1 px-4 py-2 border border-gray-700 text-white rounded font-semibold hover:bg-gray-900 transition"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold disabled:opacity-50 transition"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
