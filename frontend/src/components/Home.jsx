import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Heart, MessageCircle, Bookmark, Send, MoreVertical } from 'lucide-react';
import StoryViewer from './StoryViewer';
import StoryUploader from './StoryUploader';
import ReelGrid from './ReelGrid';
import ReelUploader from './ReelUploader';
import parseCaptionToElements from '../lib/parseCaptionToElements.jsx';
import { API_URL } from '../lib/config';
const POST_API = `${API_URL}/post`;

export default function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const userId = user && user._id;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newComment, setNewComment] = useState({});
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [sharePostId, setSharePostId] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editPost, setEditPost] = useState(null); // { id, caption }

  const goToProfile = (authorId) => {
    if (authorId) navigate(`/profile/${authorId}`);
  };

  const fetchFollowersForShare = async () => {
    try {
      setLoadingFollowers(true);
      // Get current user's followers
      const res = await axios.get(`${API_URL}/user/${userId}/profile`, {
        withCredentials: true,
      });
      if (res.data.success) {
        const followerList = res.data.user.followers || [];
        // If followers are strings (IDs), we need to fetch their details
        if (followerList.length > 0 && typeof followerList[0] === 'string') {
          // Fetch user details for each follower ID
          const followerDetails = await Promise.all(
            followerList.map(async (followerId) => {
              try {
                const userRes = await axios.get(`${API_URL}/user/${followerId}/profile`, {
                  withCredentials: true,
                });
                return userRes.data.user;
              } catch (e) {
                return { _id: followerId, username: 'User', email: followerId };
              }
            })
          );
          setFollowers(followerDetails);
        } else {
          setFollowers(followerList);
        }
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to load followers');
    } finally {
      setLoadingFollowers(false);
    }
  };

  const handleSharePost = (postId) => {
    console.log('Share button clicked for post:', postId);
    setSharePostId(postId);
    // Fetch followers asynchronously
    setLoadingFollowers(true);
    fetchFollowersForShare();
  };

  const sharePostWithUser = async (userId) => {
    try {
      const post = posts.find(p => p._id === sharePostId);
      const message = `Check out this post: ${post.caption || 'A post from ' + post.author.username}\n\n${post.image ? '[Post has an image]' : ''}`;
      
      await axios.post(
        `${API_URL}/message/send/${userId}`,
        {
          textMessage: message,
        },
        { withCredentials: true }
      );
      toast.success('Post shared!');
    } catch (error) {
      console.log(error);
      toast.error('Failed to share post');
    }
  };

  useEffect(() => {
    fetchPosts(1);
    fetchBookmarkedPosts();
    // infinite scroll
    const onScroll = () => {
      if (!hasMore || loadingMore) return;
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
      if (nearBottom) {
        fetchPosts(page + 1);
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const fetchBookmarkedPosts = async () => {
    try {
      const res = await axios.get(`${POST_API}/saved`, {
        withCredentials: true,
      });
      if (res.data.success) {
        const bookmarkedIds = (res.data.posts || []).map((post) => post._id);
        setBookmarkedPosts(bookmarkedIds);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchPosts = async (targetPage = 1) => {
    try {
      if (targetPage === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await axios.get(`${POST_API}/all?page=${targetPage}&limit=10`, {
        withCredentials: true,
      });
      if (res.data.success) {
        if (targetPage === 1) {
          setPosts(res.data.posts);
        } else {
          setPosts((prev) => [...prev, ...res.data.posts]);
        }
        setPage(targetPage);
        const total = res.data.pagination?.total || 0;
        const limit = res.data.pagination?.limit || 10;
        const fetched = targetPage * limit;
        setHasMore(fetched < total);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const likeHandler = async (postId) => {
    try {
      const res = await axios.get(`${POST_API}/${postId}/like`, {
        withCredentials: true,
      });
      if (res.data.success) {
        // Update local post state
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
              if (post._id === postId) {
              const isLiked = post.likes.includes(userId);
              return {
                ...post,
                likes: isLiked
                  ? post.likes.filter((id) => id !== userId)
                  : [...post.likes, userId],
              };
            }
            return post;
          })
        );
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const dislikeHandler = async (postId) => {
    try {
      const res = await axios.get(`${POST_API}/${postId}/dislike`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
              if (post._id === postId) {
              return {
                ...post,
                likes: post.likes.filter((id) => id !== userId),
              };
            }
            return post;
          })
        );
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const bookmarkHandler = async (postId) => {
    try {
      const res = await axios.get(`${POST_API}/${postId}/bookmark`, {
        withCredentials: true,
      });
      if (res.data.success) {
        // Toggle bookmark in local state
        setBookmarkedPosts((prev) => (
          prev.includes(postId)
            ? prev.filter((id) => id !== postId)
            : [...prev, postId]
        ));
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to bookmark post');
    }
  };

  const deletePostHandler = async (postId) => {
    try {
      const res = await axios.delete(`${POST_API}/delete/${postId}`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setPosts(posts.filter((post) => post._id !== postId));
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const openEditModal = (post) => {
    setEditPost({ id: post._id, caption: post.caption || '' });
    setMenuOpenId(null);
  };

  const saveEdit = async () => {
    if (!editPost) return;
    try {
      const res = await axios.put(
        `${POST_API}/edit/${editPost.id}`,
        { caption: editPost.caption },
        { withCredentials: true }
      );
      if (res.data.success) {
        const updated = res.data.post;
        setPosts((prev) => prev.map((p) => (p._id === updated._id ? { ...p, caption: updated.caption, image: updated.image } : p)));
        toast.success('Post updated');
        setEditPost(null);
      }
    } catch (e) {
      console.log(e);
      toast.error('Failed to update post');
    }
  };

  const commentHandler = async (postId) => {
    try {
      const commentText = newComment[postId];
      if (!commentText) {
        toast.error('Comment cannot be empty');
        return;
      }

      const res = await axios.post(
        `${POST_API}/${postId}/comment`,
        { text: commentText },
        { withCredentials: true }
      );

      if (res.data.success) {
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post._id === postId) {
              return {
                ...post,
                comments: [...post.comments, res.data.comment],
              };
            }
            return post;
          })
        );
        setNewComment({ ...newComment, [postId]: '' });
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-900 dark:text-white">Loading posts...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <StoryViewer />
      <StoryUploader />
      <ReelUploader />
      <ReelGrid />

      <div className="space-y-6">
        {posts.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">No posts yet</div>
        ) : (
          posts.map((post) => (
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
                {post.author && post.author._id === userId && (
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === post._id ? null : post._id)}
                      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {menuOpenId === post._id && (
                      <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                          onClick={() => openEditModal(post)}
                        >
                          Edit Post
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => { setMenuOpenId(null); deletePostHandler(post._id); }}
                        >
                          Delete Post
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
                  <button
                    onClick={() =>
                      post.likes && post.likes.includes(userId)
                        ? dislikeHandler(post._id)
                        : likeHandler(post._id)
                    }
                    className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition ${(post.likes && post.likes.includes(userId)) ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}
                  >
                    <Heart size={20} fill={(post.likes && post.likes.includes(userId)) ? 'currentColor' : 'none'} />
                  </button>

                  <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
                    <MessageCircle size={20} />
                  </button>

                  <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
                    <Send size={20} />
                  </button>
                </div>

                <div>
                  <button onClick={() => bookmarkHandler(post._id)} className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition ${
                    bookmarkedPosts.includes(post._id) ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'
                  }`}>
                    <Bookmark size={20} fill={bookmarkedPosts.includes(post._id) ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>

              {/* Likes Count */}
              <div className="px-4 pb-2">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{(post.likes && post.likes.length) || 0} likes</div>
                {post.comments && post.comments.length > 0 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">View all {post.comments.length} comments</div>
                )}
              </div>

              {/* Comments Section */}
              <div className="px-4 pt-2 pb-4">
                {post.comments && post.comments.length > 0 && (
                  <div className="space-y-3">
                    {post.comments.slice(0, 3).map((comment) => (
                      <div key={comment._id} className="flex gap-3 items-start">
                        <img
                          src={(comment.author && comment.author.profilePicture) || 'https://via.placeholder.com/32'}
                          alt={(comment.author && comment.author.username) || 'Deleted user'}
                          className="w-8 h-8 rounded-full cursor-pointer hover:opacity-80 transition"
                          onClick={() => goToProfile(comment.author?._id)}
                        />
                        <div>
                          <div className="text-sm"><span className="font-semibold text-gray-900 dark:text-white mr-2 cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 transition" onClick={() => goToProfile(comment.author?._id)}>{(comment.author && comment.author.username) || 'Deleted user'}</span><span className="text-gray-700 dark:text-gray-300">{comment.text}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment Input */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment[post._id] || ''}
                    onChange={(e) =>
                      setNewComment({ ...newComment, [post._id]: e.target.value })
                    }
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        commentHandler(post._id);
                      }
                    }}
                    className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
                  />
                  <button
                    onClick={() => commentHandler(post._id)}
                    className="text-sm text-purple-600 font-semibold"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
        {loadingMore && (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">Loading more posts...</div>
        )}
        {!hasMore && posts.length > 0 && (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">No more posts</div>
        )}
      </div>

      {/* Share Post Modal */}
      {/* Removed for now - feature simplified */}

      {/* Edit Post Modal */}
      <EditPostModal editPost={editPost} setEditPost={setEditPost} onSave={saveEdit} />
    </div>
  );
}

// Edit Post Modal
// Rendered at the bottom to avoid layout issues
export function EditPostModal({ editPost, setEditPost, onSave }) {
  if (!editPost) return null;
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => setEditPost(null)}></div>
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Edit Post</h3>
        <textarea
          value={editPost.caption}
          onChange={(e) => setEditPost({ ...editPost, caption: e.target.value })}
          className="w-full h-32 resize-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-2 text-sm text-gray-800 dark:text-gray-200"
          placeholder="Update your caption"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-2 text-sm" onClick={() => setEditPost(null)}>Cancel</button>
          <button className="px-3 py-2 text-sm bg-sky-600 text-white rounded-md" onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
