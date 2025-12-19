import { useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { X, Upload, Film } from 'lucide-react';
import { API_URL } from '../lib/config';
const MEDIA_API = `${API_URL}/media`;

export default function ReelUploader() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('video')) {
        toast.error('Please select a video file');
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => setPreview(event.target.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a video file');
    const fd = new FormData();
    fd.append('media', file);
    try {
      setLoading(true);
      const res = await axios.post(`${MEDIA_API}/reel`, fd, { withCredentials: true });
      if (res.data.success) {
        toast.success('Reel uploaded successfully! 🎬');
        setFile(null);
        setPreview(null);
        setIsOpen(false);
        try { window.dispatchEvent(new CustomEvent('media:uploaded', { detail: { type: 'reel' } })); } catch(e){}
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

  return (
    <>
      {/* Open Modal Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-2 bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-400 hover:to-cyan-500 text-white font-semibold rounded-xl transition duration-200 shadow-lg flex items-center gap-2 mb-6"
      >
        <Film size={20} />
        Upload Reel
      </button>

      {/* Modal Background */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          {/* Modal Container */}
          <div className="bg-gradient-to-br from-gray-900 to-black border border-sky-700/30 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-600 to-cyan-500 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Share a Reel</h2>
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
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-sky-600 shadow-lg">
                    <video
                      src={preview}
                      className="w-full h-full object-cover"
                      controls
                    />
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
                      Change Video
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-sky-600 to-cyan-500 text-white font-semibold rounded-xl hover:from-sky-500 hover:to-cyan-400 disabled:opacity-50 transition"
                    >
                      {loading ? 'Uploading...' : 'Upload Reel'}
                    </button>
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
                      <div className="p-4 bg-gradient-to-br from-sky-600 to-cyan-500 rounded-full group-hover:scale-110 transition">
                        <Film size={32} className="text-white" />
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-sky-400 mb-2">
                      Choose a video
                    </p>
                    <p className="text-sm text-gray-400">
                      or drag and drop a video file here
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Supported: Video files (MP4, WebM, MOV)
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 bg-gradient-to-r from-sky-600 to-cyan-500 text-white font-semibold rounded-xl hover:from-sky-500 hover:to-cyan-400 transition flex items-center justify-center gap-2"
                  >
                    <Upload size={20} />
                    Select Video
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
