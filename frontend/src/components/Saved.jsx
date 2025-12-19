import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Heart, MessageCircle, Bookmark } from 'lucide-react';
import parseCaptionToElements from '../lib/parseCaptionToElements.jsx';
import { API_URL } from '../lib/config';
const POST_API = `${API_URL}/post`;

export default function Saved() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const userId = user && user._id;
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedPosts();
  }, []);

  const fetchSavedPosts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${POST_API}/saved`, {
        withCredentials: true,
      });

      if (res.data.success) {
        setSavedPosts(res.data.posts || []);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const goToProfile = (authorId) => {
    if (authorId) navigate(`/profile/${authorId}`);
  };

  const removeSavedPost = async (postId) => {
    try {
      const res = await axios.get(`${POST_API}/${postId}/bookmark`, {
        withCredentials: true,
      });
      if (res.data.success) {
        // Remove from local state
        setSavedPosts((prev) => prev.filter((p) => p._id !== postId));
      }
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="text-center py-10 text-gray-900 dark:text-white">Loading saved posts...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Saved Posts</h1>
        <p className="text-gray-600 dark:text-gray-400">Your bookmarked posts appear here</p>
      </div>

      <div className="space-y-6">
        {savedPosts.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">No saved posts yet</div>
        ) : (
          savedPosts.map((post) => {
            const isLiked = post.likes && post.likes.includes(userId);
            return (
            <div key={post._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              {/* Post Header */}
              <div className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img
                    src={(post.author && post.author.profilePicture) || 'https://via.placeholder.com/40'}
                    alt={(post.author && post.author.username) || 'Deleted user'}
                    className="w-11 h-11 rounded-full cursor-pointer hover:opacity-80 transition"
                    onClick={() => goToProfile(post.author?._id)}
                  />
                  <div>
                    <h3
                      className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 transition"
                      onClick={() => goToProfile(post.author?._id)}
                    >
                      {(post.author && post.author.username) || 'Deleted user'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Post Image */}
              {post.image && (
                <div className="w-full bg-gray-100 dark:bg-gray-800">
                  <img
                    src={post.image}
                    alt="Post"
                    className="w-full max-h-[600px] object-cover"
                  />
                </div>
              )}

              {/* Post Caption - Prominent Display */}
              {post.caption && (
                <div className="px-4 pt-4 pb-3">
                  <div className="text-base text-gray-800 dark:text-gray-200 leading-relaxed">
                    {parseCaptionToElements(post.caption)}
                  </div>
                </div>
              )}

              {/* Post Actions */}
              <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <button className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition ${isLiked ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                    <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
                  </button>

                  <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
                    <MessageCircle size={20} />
                  </button>
                </div>

                <div>
                  <button 
                    onClick={() => removeSavedPost(post._id)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-red-500 hover:text-red-600"
                  >
                    <Bookmark size={20} fill="currentColor" />
                  </button>
                </div>
              </div>

              {/* Likes Count */}
              <div className="px-4 pb-2">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{(post.likes && post.likes.length) || 0} likes</div>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
