import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Search, MapPin, DollarSign, Package, MessageCircle, Trash2, Edit, X } from 'lucide-react';
import { API_URL } from '../lib/config';
const MARKET_API = `${API_URL}/marketplace`;

const CATEGORIES = ['All', 'Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Vehicles', 'Services', 'Other'];

export default function Marketplace() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMyListings, setShowMyListings] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  useEffect(() => {
    fetchListings();
  }, [selectedCategory, searchQuery, showAvailableOnly]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      if (showAvailableOnly) params.append('available', 'true');

      const res = await axios.get(`${MARKET_API}/all?${params.toString()}`, {
        withCredentials: true,
      });

      if (res.data.success) {
        setListings(res.data.listings);
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyListings = async () => {
    try {
      const res = await axios.get(`${MARKET_API}/my-listings`, {
        withCredentials: true,
      });

      if (res.data.success) {
        setMyListings(res.data.listings);
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to load your listings');
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    setImages(files);
    
    const previews = files.map(file => {
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previews).then(setImagePreviews);
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();

    if (!title || !description || !price || !location) {
      toast.error('All fields are required');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('price', price);
      formData.append('location', location);
      
      images.forEach((image) => {
        formData.append('images', image);
      });

      const res = await axios.post(`${MARKET_API}/create`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });

      if (res.data.success) {
        toast.success('Listing created successfully');
        setShowCreateModal(false);
        resetForm();
        fetchListings();
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || 'Failed to create listing');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Electronics');
    setPrice('');
    setLocation('');
    setImages([]);
    setImagePreviews([]);
  };

  const handleMarkAsSold = async (id) => {
    try {
      const res = await axios.put(`${MARKET_API}/${id}/mark-sold`, {}, {
        withCredentials: true,
      });

      if (res.data.success) {
        toast.success('Listing marked as sold');
        fetchMyListings();
        fetchListings();
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to mark as sold');
    }
  };

  const handleDeleteListing = async (id) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const res = await axios.delete(`${MARKET_API}/${id}`, {
        withCredentials: true,
      });

      if (res.data.success) {
        toast.success('Listing deleted successfully');
        fetchMyListings();
        fetchListings();
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to delete listing');
    }
  };

  const handleContactSeller = (listing) => {
    // Navigate to chat and pass seller user as state
    navigate('/chat', { 
      state: { 
        selectedUser: listing.seller,
        sellerId: listing.seller._id,
        itemTitle: listing.title 
      } 
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Marketplace</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Buy and sell items in your community</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowMyListings(!showMyListings);
              if (!showMyListings) fetchMyListings();
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition font-medium"
          >
            {showMyListings ? 'Browse Marketplace' : 'My Listings'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition"
          >
            <Plus size={20} />
            Sell Item
          </button>
        </div>
      </div>

      {!showMyListings ? (
        <>
          {/* Filters */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Available Only Toggle */}
              <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAvailableOnly}
                  onChange={(e) => setShowAvailableOnly(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-gray-700 dark:text-gray-200">Available only</span>
              </label>
            </div>
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div className="text-center py-10 text-gray-600 dark:text-gray-400">Loading listings...</div>
          ) : listings.length === 0 ? (
            <div className="text-center py-10 text-gray-600 dark:text-gray-400">No listings found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <div
                  key={listing._id}
                  onClick={() => navigate(`/marketplace/${listing._id}`)}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition group cursor-pointer"
                >
                  {/* Image */}
                  {listing.images && listing.images.length > 0 && (
                    <div className="aspect-video bg-gray-200 dark:bg-gray-800 overflow-hidden">
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
                        {listing.title}
                      </h3>
                      {listing.isSold && (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded">
                          SOLD
                        </span>
                      )}
                      {!listing.isSold && !listing.isAvailable && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded">
                          Unlisted
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-3">
                      {listing.description}
                    </p>

                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                      <Package size={16} />
                      <span>{listing.category}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                      <MapPin size={16} />
                      <span>{listing.location}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1 text-2xl font-bold text-primary dark:text-primary">
                        <DollarSign size={24} />
                        <span>{listing.price}</span>
                      </div>

                      {listing.seller._id !== user?._id && listing.isAvailable && !listing.isSold && (
                        <button
                          onClick={() => handleContactSeller(listing)}
                          className="flex items-center gap-2 px-3 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-sm font-medium transition"
                        >
                          <MessageCircle size={16} />
                          Contact
                        </button>
                      )}
                    </div>

                    {/* Seller Info */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <img
                        src={listing.seller.profilePicture || 'https://via.placeholder.com/32'}
                        alt={listing.seller.username}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {listing.seller.username}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        // My Listings View
        <div className="space-y-4">
          {myListings.length === 0 ? (
            <div className="text-center py-10 text-gray-600 dark:text-gray-400">
              You haven't created any listings yet
            </div>
          ) : (
            myListings.map((listing) => (
              <div
                key={listing._id}
                className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex gap-4"
              >
                {listing.images && listing.images.length > 0 && (
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {listing.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        {listing.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-primary dark:text-primary font-bold text-xl">
                          ${listing.price}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">{listing.category}</span>
                        <span className="text-gray-500 dark:text-gray-400">{listing.location}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!listing.isSold && listing.isAvailable && (
                        <button
                          onClick={() => handleMarkAsSold(listing._id)}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
                        >
                          Mark as Sold
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteListing(listing._id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {listing.isSold && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded">
                        SOLD
                      </span>
                    )}
                    {!listing.isSold && !listing.isAvailable && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded">
                        Unlisted
                      </span>
                    )}
                    {!listing.isSold && listing.isAvailable && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-semibold rounded">
                        ACTIVE
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Listing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Listing</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateListing} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What are you selling?"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your item..."
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {CATEGORIES.filter(cat => cat !== 'All').map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, State"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Images (Max 5)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 dark:file:bg-cyan-900/30 file:text-cyan-700 dark:file:text-cyan-300 hover:file:bg-cyan-100 dark:hover:file:bg-cyan-900/50"
                  />
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 mt-3">
                      {imagePreviews.map((preview, index) => (
                        <img
                          key={index}
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-20 object-cover rounded border border-gray-300 dark:border-gray-600"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition"
                  >
                    Create Listing
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
