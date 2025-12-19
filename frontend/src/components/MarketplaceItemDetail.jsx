import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, DollarSign, Package, MessageCircle, Trash2, Edit, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { API_URL } from '../lib/config';
const MARKET_API = `${API_URL}/marketplace`;

export default function MarketplaceItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    fetchListingDetail();
  }, [id]);

  const fetchListingDetail = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${MARKET_API}/${id}`, {
        withCredentials: true,
      });

      if (res.data.success) {
        setListing(res.data.listing);
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to load listing details');
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    try {
      setSendingMessage(true);
      const res = await axios.post(
        `${API_URL}/message/send/${listing.seller._id}`,
        {
          textMessage: `${message}\n\n[Regarding: ${listing.title} - $${listing.price}]`,
        },
        { withCredentials: true }
      );

      if (res.data.success) {
        toast.success('Message sent!');
        setMessage('');
        setShowContactModal(false);
        navigate('/chat');
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleContactSeller = () => {
    if (user?._id === listing.seller._id) {
      toast.error('You cannot contact yourself');
      return;
    }
    setShowContactModal(true);
  };

  const handleDeleteListing = async () => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;

    try {
      const res = await axios.delete(`${MARKET_API}/${id}`, {
        withCredentials: true,
      });

      if (res.data.success) {
        toast.success('Listing deleted');
        navigate('/marketplace');
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to delete listing');
    }
  };

  const handleEditListing = () => {
    navigate(`/marketplace/edit/${id}`);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">Listing not found</div>
      </div>
    );
  }

  const images = listing.images || [];
  const isOwner = user?._id === listing.seller._id;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/marketplace')}
        className="flex items-center gap-2 mb-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
      >
        <ArrowLeft size={20} />
        Back to Marketplace
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Image Gallery */}
        <div className="lg:col-span-2">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-4">
            {images.length > 0 ? (
              <div className="relative">
                <img
                  src={images[currentImageIndex]}
                  alt={`${listing.title} - image ${currentImageIndex + 1}`}
                  className="w-full h-96 md:h-[500px] object-cover"
                />

                {/* Image Navigation */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setCurrentImageIndex(
                          currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1
                        )
                      }
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 p-2 rounded-full transition"
                    >
                      <ChevronLeft size={24} />
                    </button>

                    <button
                      onClick={() =>
                        setCurrentImageIndex(
                          currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1
                        )
                      }
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 p-2 rounded-full transition"
                    >
                      <ChevronRight size={24} />
                    </button>

                    {/* Image Indicator */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full h-96 md:h-[500px] flex items-center justify-center text-gray-400">
                No images
              </div>
            )}
          </div>

          {/* Image Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 w-20 h-20 rounded border-2 transition overflow-hidden ${
                    idx === currentImageIndex
                      ? 'border-sky-600 dark:border-sky-400'
                      : 'border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Sidebar */}
        <div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            {/* Title & Status */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {listing.title}
              </h1>
              <div className="flex items-center gap-2">
                {listing.isSold && (
                  <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-semibold rounded">
                    SOLD
                  </span>
                )}
                {!listing.isSold && !listing.isAvailable && (
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded">
                    Unlisted
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <DollarSign size={32} className="text-sky-600 dark:text-sky-400" />
                <span className="text-4xl font-bold text-sky-600 dark:text-sky-400">
                  {listing.price}
                </span>
              </div>
            </div>

            {/* Category & Location */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Package size={20} className="text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{listing.category}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{listing.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Listed</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Date(listing.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Seller Info */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Seller</p>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <img
                  src={listing.seller.profilePicture || 'https://via.placeholder.com/40'}
                  alt={listing.seller.username}
                  className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
                  onClick={() => navigate(`/profile/${listing.seller._id}`)}
                />
                <div>
                  <p
                    className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 transition"
                    onClick={() => navigate(`/profile/${listing.seller._id}`)}
                  >
                    {listing.seller.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {listing.seller.bio || listing.seller.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-2">
              {isOwner ? (
                <>
                  <button
                    onClick={handleEditListing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition"
                  >
                    <Edit size={18} />
                    Edit Listing
                  </button>
                  <button
                    onClick={handleDeleteListing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
                  >
                    <Trash2 size={18} />
                    Delete Listing
                  </button>
                </>
              ) : listing.isAvailable && !listing.isSold ? (
                <button
                  onClick={handleContactSeller}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition"
                >
                  <MessageCircle size={18} />
                  Contact Seller
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Description</h2>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
          {listing.description}
        </p>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Contact {listing.seller.username}
            </h3>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Your Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell them about your interest in this item..."
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowContactModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={sendingMessage}
                className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold disabled:opacity-50 transition"
              >
                {sendingMessage ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
