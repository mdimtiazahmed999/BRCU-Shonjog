import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'sonner';
import { Heart, MessageCircle, User, ArrowLeft } from 'lucide-react';

const API_URL = 'http://localhost:8000/api/v1';

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      if (!id) {
        toast.error('No profile ID provided');
        setLoading(false);
        return;
      }
      setLoading(true);
      const res = await axios.get(`${API_URL}/user/${id}/profile`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setProfile(res.data.user);
        setIsFollowing(res.data.user.followers?.includes(currentUser?._id));
      } else {
        toast.error(res.data.message || 'Failed to load profile');
        setProfile(null);
      }
    } catch (error) {
      console.log('Profile fetch error:', error);
      toast.error(error.response?.data?.message || 'Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const followHandler = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/user/followorunfollow/${id}`,
        {},
        { withCredentials: true }
      );
      if (res.data.success) {
        setIsFollowing(!isFollowing);
        toast.success(res.data.message);
        // Refresh profile to update counts
        fetchProfile();
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to follow/unfollow');
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-700">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="text-center py-10 text-gray-700">Profile not found</div>;
  }

  const isOwnProfile = currentUser?._id === profile._id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 p-4">
        <button
          onClick={() => navigate('/')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{profile.username}</h2>
          <p className="text-sm text-gray-500">{profile.posts?.length || 0} posts</p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-4">
            <img
              src={profile.profilePicture || 'https://via.placeholder.com/100'}
              alt={profile.username}
              className="w-24 h-24 rounded-full object-cover"
            />
            <div className="pt-2">
              <h1 className="text-2xl font-semibold text-gray-900">{profile.username}</h1>
              {profile.bio && <p className="text-gray-600 mt-2">{profile.bio}</p>}
              {profile.gender && (
                <p className="text-sm text-gray-500 mt-1">Gender: {profile.gender}</p>
              )}
            </div>
          </div>

          {!isOwnProfile && (
            <button
              onClick={followHandler}
              className={`px-5 py-2 rounded-full font-semibold transition ${
                isFollowing
                  ? 'bg-gray-100 text-gray-800 border border-gray-200'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              }`}
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}

          {isOwnProfile && (
            <button
              onClick={() => navigate('/account/edit')}
              className="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-semibold"
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-8 text-gray-800">
          <div>
            <p className="text-2xl font-bold">{profile.posts?.length || 0}</p>
            <p className="text-sm text-gray-500">Posts</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{profile.followers?.length || 0}</p>
            <p className="text-sm text-gray-500">Followers</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{profile.following?.length || 0}</p>
            <p className="text-sm text-gray-500">Following</p>
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4 px-4">Posts</h3>
        <div className="grid grid-cols-3 gap-2 px-2">
          {profile.posts && profile.posts.length > 0 ? (
            profile.posts.map((post) => (
              <div
                key={post._id}
                className="aspect-square bg-gray-800 rounded overflow-hidden cursor-pointer hover:opacity-80 transition relative group"
              >
                {post.image && (
                  <img
                    src={post.image}
                    alt="Post"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-40 transition flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1 text-white opacity-0 group-hover:opacity-100">
                    <Heart size={18} fill="currentColor" />
                    <span className="text-sm">{post.likes?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-white opacity-0 group-hover:opacity-100">
                    <MessageCircle size={18} fill="currentColor" />
                    <span className="text-sm">{post.comments?.length || 0}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-10 text-gray-400">
              No posts yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
