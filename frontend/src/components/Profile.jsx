import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'sonner';
import { Heart, MessageCircle, ArrowLeft, Bookmark, Settings, Trash2, Pencil } from 'lucide-react';
import CreatePost from './CreatePost';
import { API_URL } from '../lib/config';
const POST_API = `${API_URL}/post`;

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [scheduledStories, setScheduledStories] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editFile, setEditFile] = useState(null);
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [activeList, setActiveList] = useState(null);
  const [followRequests, setFollowRequests] = useState([]);
  const [showFollowRequests, setShowFollowRequests] = useState(false);
  const [followRequestStatus, setFollowRequestStatus] = useState(null);
  const [isPrivateAndNotFollower, setIsPrivateAndNotFollower] = useState(false);
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [menuPostId, setMenuPostId] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editCaption, setEditCaption] = useState('');
  
  // Compute isOwnProfile - safe to use throughout the component
  const isOwnProfile = currentUser?._id === profile?._id;

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
        const fetchedUser = res.data.user;
        setProfile(fetchedUser);
        setProfilePosts(fetchedUser.posts || []);
        setIsPrivateAndNotFollower(fetchedUser.isPrivateAndNotFollower || false);
        const followerIds = (fetchedUser.followers || [])
          .map((f) => (typeof f === 'string' ? f : f?._id))
          .filter(Boolean)
          .map(String);
        setIsFollowing(currentUser?._id ? followerIds.includes(String(currentUser._id)) : false);
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

  const fetchScheduled = async () => {
    if (!isOwnProfile) return;
    try {
      const res = await axios.get(`${API_URL}/media/story/scheduled`, { withCredentials: true });
      if (res.data && res.data.success) setScheduledStories(res.data.stories || []);
    } catch (e) { console.log(e); }
  };

  useEffect(() => { if (isOwnProfile) fetchScheduled(); }, [isOwnProfile]);

  const fetchFollowRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/user/follow-requests`, { withCredentials: true });
      if (res.data.success) {
        setFollowRequests(res.data.followRequests);
      }
    } catch (e) { console.log(e); }
  };

  useEffect(() => { if (isOwnProfile) fetchFollowRequests(); }, [isOwnProfile]);
  useEffect(() => {
    fetchBookmarkedPosts();
  }, []);

  const fetchBookmarkedPosts = async () => {
    try {
      const res = await axios.get(`${POST_API}/saved`, { withCredentials: true });
      if (res.data.success) {
        setBookmarkedPosts((res.data.posts || []).map((p) => p._id));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const likeHandler = async (postId) => {
    try {
      const res = await axios.get(`${POST_API}/${postId}/like`, { withCredentials: true });
      if (res.data.success) {
        setProfilePosts((prev) => prev.map((p) => p._id === postId
          ? { ...p, likes: p.likes?.includes(currentUser?._id) ? p.likes.filter((id) => id !== currentUser?._id) : [...(p.likes || []), currentUser?._id] }
          : p));
        toast.success(res.data.message);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const dislikeHandler = async (postId) => {
    try {
      const res = await axios.get(`${POST_API}/${postId}/dislike`, { withCredentials: true });
      if (res.data.success) {
        setProfilePosts((prev) => prev.map((p) => p._id === postId
          ? { ...p, likes: (p.likes || []).filter((id) => id !== currentUser?._id) }
          : p));
        toast.success(res.data.message);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const bookmarkHandler = async (postId) => {
    try {
      const res = await axios.get(`${POST_API}/${postId}/bookmark`, { withCredentials: true });
      if (res.data.success) {
        setBookmarkedPosts((prev) => prev.includes(postId)
          ? prev.filter((id) => id !== postId)
          : [...prev, postId]);
        toast.success(res.data.message);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const deleteHandler = async (postId) => {
    try {
      const res = await axios.delete(`${POST_API}/delete/${postId}`, { withCredentials: true });
      if (res.data.success) {
        setProfilePosts((prev) => prev.filter((p) => p._id !== postId));
        toast.success('Post deleted');
      }
    } catch (e) {
      console.log(e);
      toast.error('Failed to delete post');
    } finally {
      setMenuPostId(null);
    }
  };

  const openEditModal = (post) => {
    setEditingPostId(post._id);
    setEditCaption(post.caption || '');
    setEditModalOpen(true);
    setMenuPostId(null);
  };

  const saveEdit = async () => {
    if (!editingPostId) return;
    try {
      const formData = new FormData();
      formData.append('caption', editCaption || '');

      const res = await axios.put(`${POST_API}/edit/${editingPostId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });

      if (res.data.success && res.data.post) {
        setProfilePosts((prev) => prev.map((p) => (p._id === editingPostId ? res.data.post : p)));
        toast.success('Post updated');
      }
    } catch (e) {
      console.log(e);
      toast.error('Failed to update post');
    } finally {
      setEditModalOpen(false);
      setEditingPostId(null);
    }
  };

  const openEdit = (st) => {
    setEditing(st);
    setEditScheduledAt(st.scheduledAt ? new Date(st.scheduledAt).toISOString().slice(0,16) : '');
    setEditOpen(true);
  };

  const closeList = () => setActiveList(null);

  const submitEdit = async () => {
    if (!editing) return;
    try {
      const fd = new FormData();
      if (editFile) fd.append('media', editFile);
      if (editScheduledAt) fd.append('scheduledAt', new Date(editScheduledAt).toISOString());
      const res = await axios.put(`${API_URL}/media/story/scheduled/${editing._id}`, fd, { withCredentials: true });
      if (res.data.success) {
        toast.success('Scheduled story updated');
        setEditOpen(false);
        setEditFile(null);
        fetchScheduled();
      }
    } catch (e) { toast.error('Update failed'); }
  };

  const followHandler = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/user/followorunfollow/${id}`,
        {},
        { withCredentials: true }
      );
      if (res.data.success) {
        if (res.data.isFollowRequest) {
          setFollowRequestStatus('pending');
          toast.success('Follow request sent');
        } else {
          setIsFollowing(!isFollowing);
          toast.success(res.data.message);
        }
        // Refresh profile to update counts
        fetchProfile();
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || 'Failed to follow/unfollow');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const res = await axios.post(
        `${API_URL}/user/follow-requests/${requestId}/accept`,
        {},
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success('Follow request accepted');
        fetchFollowRequests();
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const res = await axios.post(
        `${API_URL}/user/follow-requests/${requestId}/reject`,
        {},
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success('Follow request rejected');
        fetchFollowRequests();
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to reject request');
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-700 dark:text-gray-300">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="text-center py-10 text-gray-700 dark:text-gray-300">Profile not found</div>;
  }

  if (isPrivateAndNotFollower && !isOwnProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6 p-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft size={24} />
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 mb-6 shadow-sm text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-black flex items-center justify-center">
            {profile.profilePicture ? (
              <img
                src={profile.profilePicture}
                alt={profile.username}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-white text-2xl font-bold">{profile.username?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{profile.username}</h1>
          {profile.bio && <p className="text-gray-600 dark:text-gray-300 mt-2">{profile.bio}</p>}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">🔒 This is a private account</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            {followRequestStatus === 'pending'
              ? 'Follow request pending approval'
              : 'Request to follow to see their posts and activities'
            }
          </p>
          {followRequestStatus !== 'pending' && (
            <button
              onClick={followHandler}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition"
            >
              Request to Follow
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 p-4">
        <button
          onClick={() => navigate('/')}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{profile.username}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{profile.posts?.length || 0} posts</p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center overflow-hidden">
              {profile.profilePicture ? (
                <img
                  src={profile.profilePicture}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-2xl font-bold">{profile.username?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="pt-2">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{profile.username}</h1>
              {profile.bio && <p className="text-gray-600 dark:text-gray-300 mt-2">{profile.bio}</p>}
              {profile.gender && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gender: {profile.gender}</p>
              )}
            </div>
          </div>

          {!isOwnProfile && (
            <button
              onClick={followHandler}
              className={`px-5 py-2 rounded-full font-semibold transition ${
                isFollowing
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600'
                  : followRequestStatus === 'pending'
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600'
                  : 'bg-gradient-to-r from-primary to-secondary text-primary-foreground'
              }`}
              disabled={followRequestStatus === 'pending'}
            >
              {isFollowing
                ? 'Following'
                : followRequestStatus === 'pending'
                ? 'Request Sent'
                : profile.privacy === 'private'
                ? 'Request to Follow'
                : 'Follow'}
            </button>
          )}

          {isOwnProfile && (
            <button
              onClick={() => navigate('/account/edit')}
              className="px-5 py-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full font-semibold"
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-gray-800 dark:text-gray-200">
          {[{ key: 'posts', label: 'Posts', value: profile.posts?.length || 0 },
            { key: 'followers', label: 'Followers', value: profile.followers?.length || 0 },
            { key: 'following', label: 'Following', value: profile.following?.length || 0 }].map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveList(item.key)}
              className="text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Create Post - Only for own profile */}
      {isOwnProfile && <CreatePost onCreated={fetchProfile} />}

      {/* Follow Requests - Only for own profile with private account */}
      {isOwnProfile && profile.privacy === 'private' && (
        <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Follow Requests {followRequests.length > 0 && `(${followRequests.length})`}
            </h3>
            {followRequests.length > 0 && (
              <button
                onClick={() => setShowFollowRequests(!showFollowRequests)}
                className="text-sm text-primary dark:text-primary hover:underline"
              >
                {showFollowRequests ? 'Hide' : 'Show'}
              </button>
            )}
          </div>
          {followRequests.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No follow requests</p>
          ) : showFollowRequests ? (
            <div className="space-y-3">
              {followRequests.map((req) => (
                <div key={req._id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {req.from.profilePicture ? (
                      <img src={req.from.profilePicture} alt={req.from.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-xs font-bold">{req.from.username?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{req.from.username}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptRequest(req._id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req._id)}
                      className="px-3 py-1 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Posts Feed */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 px-1 sm:px-0">Posts</h3>
        <div className="space-y-6">
          {profilePosts && profilePosts.length > 0 ? (
            profilePosts.map((post) => {
              const author = post.author || profile;
              const authorName = author?.username || 'User';
              const authorAvatar = author?.profilePicture || 'https://via.placeholder.com/40';
              const isLiked = post.likes?.includes(currentUser?._id);
              const isBookmarked = bookmarkedPosts.includes(post._id);
              return (
                <div key={post._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm relative">
                  {/* Post Header */}
                  <div className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <img
                        src={authorAvatar}
                        alt={authorName}
                        className="w-11 h-11 rounded-full"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{authorName}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}
                        </p>
                      </div>
                    </div>

                    {isOwnProfile && (
                      <div className="relative">
                        <button
                          onClick={() => setMenuPostId(menuPostId === post._id ? null : post._id)}
                          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                          aria-haspopup="menu"
                          aria-expanded={menuPostId === post._id}
                        >
                          <Settings size={18} />
                        </button>

                        {menuPostId === post._id && (
                          <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                            <button
                              onClick={() => openEditModal(post)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Pencil size={16} /> Edit post
                            </button>
                            <button
                              onClick={() => deleteHandler(post._id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                            >
                              <Trash2 size={16} /> Delete post
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Post Image */}
                  {post.image && (
                    <div className="w-full bg-gray-100 dark:bg-gray-800">
                      <img src={post.image} alt="Post" className="w-full max-h-[600px] object-cover" />
                    </div>
                  )}

                  {/* Post Caption */}
                  {post.caption && (
                    <div className="px-4 pt-4 pb-3">
                      <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed">{post.caption}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => (isLiked ? dislikeHandler(post._id) : likeHandler(post._id))}
                        className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition ${isLiked ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}
                      >
                        <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
                      </button>

                      <div className="p-2 rounded-full text-gray-600 dark:text-gray-300">
                        <MessageCircle size={20} />
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={() => bookmarkHandler(post._id)}
                        className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition ${isBookmarked ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}
                      >
                        <Bookmark size={20} fill={isBookmarked ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>

                  {/* Likes Count */}
                  <div className="px-4 pb-4">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{post.likes?.length || 0} likes</div>
                    {post.comments?.length > 0 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">View all {post.comments.length} comments</div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">No posts yet</div>
          )}
        </div>
      </div>
      {isOwnProfile && (
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scheduled Stories</h3>
            <small className="text-sm text-gray-500 dark:text-gray-400">Manage upcoming stories</small>
          </div>
          {scheduledStories.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No scheduled stories</p>
          ) : (
            <ul className="space-y-3">
              {scheduledStories.map(st => (
                <li key={st._id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{new Date(st.scheduledAt).toLocaleString()}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{st.mediaType}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(st)} className="px-3 py-1 bg-sky-600 text-white rounded">Edit</button>
                    <button onClick={async () => { await axios.delete(`${API_URL}/media/story/scheduled/${st._id}`, { withCredentials: true }); fetchScheduled(); }} className="px-3 py-1 bg-red-600 text-white rounded">Cancel</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Edit Scheduled Story</h4>
            <div className="space-y-3">
              <label className="block text-sm text-gray-700 dark:text-gray-300">New publish time</label>
              <input type="datetime-local" value={editScheduledAt} onChange={(e) => setEditScheduledAt(e.target.value)} className="w-full p-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded" />
              <label className="block text-sm text-gray-700 dark:text-gray-300">Replace media (optional)</label>
              <input type="file" accept="image/*,video/*" onChange={(e) => setEditFile(e.target.files?.[0])} className="text-gray-900 dark:text-gray-200" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300">Close</button>
                <button onClick={submitEdit} className="px-4 py-2 bg-sky-600 text-white rounded">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeList && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Profile details</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {activeList === 'posts' && 'Posts'}
                  {activeList === 'followers' && 'Followers'}
                  {activeList === 'following' && 'Following'}
                  {' '}
                  ({activeList === 'posts' ? profile.posts?.length || 0 : activeList === 'followers' ? profile.followers?.length || 0 : profile.following?.length || 0})
                </p>
              </div>
              <button onClick={closeList} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700">
                Close
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {activeList === 'posts' && (
                profile.posts?.length ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {profile.posts.map((post) => (
                      <div key={post._id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
                        {post.image && <img src={post.image} alt={post.caption || 'Post image'} className="w-full h-40 object-cover" />}
                        <div className="p-3 space-y-1">
                          <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{post.caption || 'No caption'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{post.createdAt ? new Date(post.createdAt).toLocaleString() : ''}</p>
                          <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-300">
                            <span>❤ {post.likes?.length || 0}</span>
                            <span>💬 {post.comments?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{isOwnProfile ? 'You have not posted yet.' : 'No posts to show.'}</p>
                )
              )}

              {activeList === 'followers' && (
                profile.followers?.length ? (
                  profile.followers.map((person, idx) => {
                    const normalized = typeof person === 'string'
                      ? { _id: person, username: 'User', profilePicture: '' }
                      : person || {};
                    const personId = normalized._id || `follower-${idx}`;
                    return (
                      <div key={personId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {normalized.profilePicture ? (
                            <img src={normalized.profilePicture} alt={normalized.username || 'User'} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-xs font-bold">{normalized.username?.[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{normalized.username || 'Unknown user'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{personId}</p>
                        </div>
                        <button onClick={() => { closeList(); navigate(`/profile/${personId}`); }} className="text-sm text-purple-600 dark:text-purple-300 hover:underline">View</button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No followers to show yet.</p>
                )
              )}

              {activeList === 'following' && (
                profile.following?.length ? (
                  profile.following.map((person, idx) => {
                    const normalized = typeof person === 'string'
                      ? { _id: person, username: 'User', profilePicture: '' }
                      : person || {};
                    const personId = normalized._id || `following-${idx}`;
                    return (
                      <div key={personId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {normalized.profilePicture ? (
                            <img src={normalized.profilePicture} alt={normalized.username || 'User'} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-xs font-bold">{normalized.username?.[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{normalized.username || 'Unknown user'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{personId}</p>
                        </div>
                        <button onClick={() => { closeList(); navigate(`/profile/${personId}`); }} className="text-sm text-purple-600 dark:text-purple-300 hover:underline">View</button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Not following anyone yet.</p>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md shadow-xl">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit post</h4>
            <div className="space-y-3">
              <label className="text-sm text-gray-600 dark:text-gray-300">Caption</label>
              <textarea
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                rows="4"
                className="w-full p-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => { setEditModalOpen(false); setEditingPostId(null); }}
                  className="px-4 py-2 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="px-4 py-2 rounded bg-gradient-to-r from-primary to-secondary text-white font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
