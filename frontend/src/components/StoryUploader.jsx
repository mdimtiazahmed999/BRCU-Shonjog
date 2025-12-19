import { useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { X, Upload, Image, Play } from 'lucide-react';
import { API_URL } from '../lib/config';
const MEDIA_API = `${API_URL}/media`;

export default function StoryUploader() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [schedule, setSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => setPreview(event.target.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file');
    const fd = new FormData();
    fd.append('media', file);
    if (schedule && scheduledAt) {
      // send ISO string
      fd.append('scheduledAt', new Date(scheduledAt).toISOString());
    }
    try {
      setLoading(true);
      const res = await axios.post(`${MEDIA_API}/story`, fd, { withCredentials: true });
      if (res.data.success) {
        toast.success('Story uploaded successfully! 🎉');
        setFile(null);
        setPreview(null);
        setIsOpen(false);
        // notify other components to refresh
        try { window.dispatchEvent(new CustomEvent('media:uploaded', { detail: { type: 'story' } })); } catch(e){}
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setFile(null);
    setPreview(null);
  };

  // Scheduled stories management
  const [manageOpen, setManageOpen] = useState(false);
  const [scheduledList, setScheduledList] = useState([]);
  const fetchScheduled = async () => {
    try {
      const res = await axios.get(`${MEDIA_API}/story/scheduled`, { withCredentials: true });
      if (res.data.success) setScheduledList(res.data.stories || []);
    } catch (e) { console.log(e); }
  };
  const cancelScheduled = async (id) => {
    try {
      const res = await axios.delete(`${MEDIA_API}/story/scheduled/${id}`, { withCredentials: true });
      if (res.data.success) {
        toast.success('Cancelled scheduled story');
        fetchScheduled();
      }
    } catch (e) { toast.error('Cancel failed'); }
  };

  return (
    <>
      {/* Open Modal Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-2 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-semibold rounded-xl transition duration-200 shadow-lg flex items-center gap-2 mb-6"
      >
        <Upload size={20} />
        Upload Story
      </button>

      {/* Modal Background */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          {/* Modal Container */}
          <div className="bg-gradient-to-br from-gray-900 to-black border border-sky-700/30 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-600 to-sky-500 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Share Your Story</h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <X size={24} className="text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              {preview ? (
                // Preview Section
                <div className="space-y-6">
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden border-2 border-sky-600 shadow-lg">
                    {file?.type.startsWith('video') ? (
                      <video
                        src={preview}
                        className="w-full h-full object-cover"
                        controls
                      />
                    ) : (
                      <img
                        src={preview}
                        alt="Story preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                  </div>
                  <p className="text-sm text-gray-400 text-center">
                    {file?.name} • {(file?.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                        fileInputRef.current?.click();
                      }}
                      className="flex-1 px-4 py-3 border-2 border-sky-600 text-sky-400 font-semibold rounded-xl hover:bg-sky-600/10 transition"
                    >
                      Change File
                    </button>
                    <div className="flex-1">
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} />
                        <span>Schedule publish</span>
                      </label>
                      {schedule && (
                        <input
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="mt-2 w-full rounded-md p-2 bg-gray-800 text-white border border-sky-700"
                        />
                      )}
                      <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="w-full mt-3 px-4 py-3 bg-gradient-to-r from-sky-600 to-sky-500 text-white font-semibold rounded-xl hover:from-sky-500 hover:to-sky-400 disabled:opacity-50 transition"
                      >
                        {loading ? (schedule ? 'Scheduling...' : 'Uploading...') : (schedule ? 'Schedule Story' : 'Upload Story')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // File Select Section
                <div className="space-y-6">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-sky-600 rounded-xl p-12 text-center cursor-pointer hover:bg-sky-600/10 transition duration-200 group"
                  >
                    <div className="flex justify-center mb-4">
                      <div className="p-4 bg-gradient-to-br from-sky-600 to-sky-500 rounded-full group-hover:scale-110 transition">
                        <Image size={32} className="text-white" />
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-sky-400 mb-2">
                      Choose a file
                    </p>
                    <p className="text-sm text-gray-400">
                      or drag and drop images or videos here
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Supported: Images (JPG, PNG, GIF) and Videos (MP4, WebM)
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 bg-gradient-to-r from-sky-600 to-sky-500 text-white font-semibold rounded-xl hover:from-sky-500 hover:to-sky-400 transition flex items-center justify-center gap-2"
                  >
                    <Upload size={20} />
                    Select File
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="p-4 border-t border-sky-800 flex items-center justify-between">
                <button onClick={() => { setManageOpen(true); fetchScheduled(); }} className="text-sm text-sky-300 hover:underline">Manage Scheduled Stories</button>
                <div className="text-xs text-gray-500">Stories expire 24 hours after publish</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Scheduled Stories Modal */}
      {manageOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-sky-700/30 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="p-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Scheduled Stories</h3>
              <button onClick={() => setManageOpen(false)} className="text-white">Close</button>
            </div>
            <div className="p-4">
              {scheduledList.length === 0 ? (
                <p className="text-sm text-gray-400">No scheduled stories</p>
              ) : (
                <ul className="space-y-4">
                  {scheduledList.map(st => (
                    <li key={st._id} className="flex items-center justify-between bg-gray-900/40 p-3 rounded">
                      <div>
                        <div className="text-sm text-white">{new Date(st.scheduledAt).toLocaleString()}</div>
                        <div className="text-xs text-gray-400">{st.mediaType}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => cancelScheduled(st._id)} className="px-3 py-1 text-sm bg-red-600 rounded">Cancel</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
