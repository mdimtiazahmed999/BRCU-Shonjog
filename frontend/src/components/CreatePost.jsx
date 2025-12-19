import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'sonner';
import { Image, X } from 'lucide-react';
import { API_URL } from '../lib/config';

export default function CreatePost({ onCreated }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const DRAFT_STORAGE_KEY = 'post:drafts';

  const readDrafts = () => {
    try { return JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || '[]'); } catch (e) { return []; }
  };

  const saveDraft = () => {
    if (!previewUrl && !caption.trim()) {
      toast.error('Nothing to save');
      return;
    }
    const drafts = readDrafts();
    const id = Date.now().toString();
    drafts.unshift({ id, caption, previewUrl, fileName: imageFile?.name || null, createdAt: new Date().toISOString() });
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    toast.success('Draft saved');
  };

  const deleteDraft = (id) => {
    const drafts = readDrafts().filter((d) => d.id !== id);
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  };

  const loadDraft = async (draft) => {
    setCaption(draft.caption || '');
    setPreviewUrl(draft.previewUrl || null);
    // reconstruct File from data url if possible
    if (draft.previewUrl) {
      try {
        const file = dataURLtoFile(draft.previewUrl, draft.fileName || 'image.png');
        setImageFile(file);
      } catch (e) {
        setImageFile(null);
      }
    }
    toast.success('Draft loaded');
  };

  // Server drafts state
  const [serverDrafts, setServerDrafts] = useState([]);
  const autosaveRef = useRef(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const fetchServerDrafts = async () => {
    try {
      const res = await axios.get(`${API_URL}/draft`, { withCredentials: true });
      if (res.data && res.data.success) setServerDrafts(res.data.drafts || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (draftsOpen) fetchServerDrafts();
  }, [draftsOpen]);

  useEffect(() => {
    // autosave every 10s when there are changes
    autosaveRef.current = setInterval(() => {
      if (caption.trim() || previewUrl) {
        saveDraftToServer(false).catch(() => {});
      }
    }, 10000);
    return () => clearInterval(autosaveRef.current);
  }, [caption, previewUrl, imageFile]);

  const saveDraftToServer = async (notify = true) => {
    try {
      const fd = new FormData();
      fd.append('caption', caption || '');
      if (imageFile) fd.append('image', imageFile);
      // if previewUrl is an external URL and no file, send caption only (server draft will have no image)
      const res = await axios.post(`${API_URL}/draft`, fd, { withCredentials: true });
      if (res.data && res.data.success) {
        setLastSavedAt(new Date());
        if (notify) toast.success('Draft saved to server');
        // refresh server drafts cache
        fetchServerDrafts();
        return res.data.draft;
      }
      return null;
    } catch (e) {
      if (notify) toast.error('Failed to save draft to server');
      return null;
    }
  };

  const loadServerDraft = async (d) => {
    try {
      setCaption(d.caption || '');
      setPreviewUrl(d.image || null);
      setImageFile(null);
      setDraftsOpen(false);
      toast.success('Server draft loaded');
    } catch (e) {
      toast.error('Failed to load server draft');
    }
  };

  const dataURLtoFile = (dataurl, filename) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();

    if (!caption.trim() && !imageFile) {
      toast.error('Please add text or select an image');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('caption', caption);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const res = await axios.post(`${API_URL}/post/addpost`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });

      if (res.data.success) {
        toast.success(res.data.message);
        setCaption('');
        clearImage();
        if (typeof onCreated === 'function') {
          onCreated();
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create post');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Post</h2>

      <form onSubmit={handleCreatePost} className="space-y-4">
        {/* Caption */}
        <div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's on your mind?"
            maxLength={300}
            rows="3"
            disabled={loading}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded resize-none text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{caption.length}/300 characters</p>
        </div>

        {/* Image Preview */}
        {previewUrl && (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full max-h-96 object-cover rounded border border-gray-200"
            />
            <button
              type="button"
              onClick={clearImage}
              disabled={loading}
              className="absolute top-2 right-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full p-2 transition border border-gray-200 dark:border-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Image Upload */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded cursor-pointer transition disabled:opacity-50">
            <Image size={18} />
            <span>Select Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              disabled={loading}
              className="hidden"
            />
          </label>
          {previewUrl && (
            <span className="text-sm text-gray-500 dark:text-gray-400">Image selected</span>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => {
              setCaption('');
              clearImage();
            }}
            disabled={loading}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => saveDraft()}
            disabled={loading}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => saveDraftToServer(true)}
            disabled={loading}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            Save Draft (Server)
          </button>
          <button
            type="button"
            onClick={() => setDraftsOpen(true)}
            disabled={loading}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            Load Draft
          </button>
          <button
            type="submit"
            disabled={loading || (!imageFile && !caption.trim())}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded font-semibold disabled:opacity-50 transition"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>

      {/* Drafts Modal */}
      {draftsOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Saved Drafts</h3>
              <button onClick={() => setDraftsOpen(false)} className="text-gray-600 dark:text-gray-300">Close</button>
            </div>
            <div className="space-y-3 max-h-72 overflow-auto">
              {readDrafts().length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No drafts saved</div>
              ) : (
                readDrafts().map((d) => (
                  <div key={d.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900 dark:text-white">{d.fileName || 'Draft'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(d.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { loadDraft(d); setDraftsOpen(false); }} className="px-3 py-1 bg-sky-600 text-white rounded text-sm">Load</button>
                      <button onClick={() => { deleteDraft(d.id); }} className="px-3 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200">Delete</button>
                    </div>
                  </div>
                ))
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Server Drafts</h4>
                {serverDrafts.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">No server drafts</div>
                ) : (
                  serverDrafts.map((sd) => (
                    <div key={sd._id} className="p-3 border border-gray-200 dark:border-gray-700 rounded flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">{sd.image ? 'Image draft' : 'Draft'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(sd.updatedAt).toLocaleString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => loadServerDraft(sd)} className="px-3 py-1 bg-sky-600 text-white rounded text-sm">Load</button>
                        <button onClick={async () => { await axios.delete(`${API_URL}/draft/${sd._id}`, { withCredentials: true }); fetchServerDrafts(); }} className="px-3 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200">Delete</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
