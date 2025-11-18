import { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000/api/v1/media';

export default function StoryViewer() {
  const [stories, setStories] = useState([]);
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchStories();
    const handler = (e) => {
      // refresh when new story uploaded
      if (!e?.detail || e.detail.type === 'story') fetchStories();
    };
    window.addEventListener('media:uploaded', handler);
    return () => window.removeEventListener('media:uploaded', handler);
  }, []);

  useEffect(() => {
    if (stories.length === 0) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % stories.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [stories]);

  const fetchStories = async () => {
    try {
      const res = await axios.get(`${API}/story/all`, { withCredentials: true });
      if (res.data.success) {
        // normalize field names to frontend-friendly shape
        const normalized = (res.data.stories || []).map((st) => ({
          _id: st._id,
          url: st.mediaUrl || st.url || st.videoUrl,
          type: st.mediaType || (st.mediaUrl?.includes('video') || st.videoUrl?.includes('.mp4') ? 'video' : 'image'),
          author: st.author,
          createdAt: st.createdAt,
        }));
        setStories(normalized);
      }
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-800">Stories</h4>
        <small className="text-xs text-gray-500">{stories.length} available</small>
      </div>

      <div className="flex gap-3 overflow-x-auto">
        {stories.length === 0 ? (
          <div className="w-full py-6 text-center text-gray-500">No stories yet — upload one to share!</div>
        ) : (
          stories.map((s, idx) => (
            <div
              key={s._id}
              className={`w-24 h-36 rounded overflow-hidden ring-2 ${idx === index ? 'ring-sky-500' : 'ring-gray-300'} bg-white`}
              onClick={() => setIndex(idx)}
            >
              {s.type === 'image' ? (
                <img src={s.url} alt="story" className="w-full h-full object-cover" />
              ) : (
                <video src={s.url} className="w-full h-full object-cover" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
