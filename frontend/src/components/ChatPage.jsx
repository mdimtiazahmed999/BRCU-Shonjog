import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { getSocketInstance } from '../lib/socketManager';
import axios from 'axios';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { API_URL } from '../lib/config';

export default function ChatPage() {
  const { user } = useSelector((state) => state.auth);
  const { id: socketId } = useSelector((state) => state.socketio);
  const location = useLocation();
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Group creation modal state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  // Handle state passed from Marketplace
  useEffect(() => {
    if (location.state?.selectedUser) {
      setSelectedUser(location.state.selectedUser);
      setSelectedGroup(null);
      // Clear the location state to avoid re-selecting on navigate back
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.selectedUser]);

  useEffect(() => {
    fetchSuggestedUsers();
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser._id);
    }
    if (selectedGroup) {
      fetchGroupMessages(selectedGroup._id);
    }
  }, [selectedUser, selectedGroup]);

  useEffect(() => {
    // Listen for new messages via the socket manager instance
    const socket = getSocketInstance();
    if (socket) {
      const onNewMessage = (message) => {
        // Direct message
        if (!message.groupId && (
          (message.senderId === selectedUser?._id && message.receiverId === user._id) ||
          (message.senderId === user._id && message.receiverId === selectedUser?._id)
        )) {
          setMessages((prev) => [...prev, message]);
        }
        // Group message
        if (message.groupId && selectedGroup?._id === message.groupId) {
          setMessages((prev) => [...prev, message]);
        }
      };

      socket.on('newMessage', onNewMessage);

      return () => {
        try { socket.off('newMessage', onNewMessage); } catch (e) {}
      };
    }
  }, [socketId, selectedUser, selectedGroup, user]);

  useEffect(() => {
    // Join/leave group socket rooms
    const socket = getSocketInstance();
    if (!socket) return;
    
    if (selectedGroup) {
      socket.emit('joinGroup', { groupId: selectedGroup._id });
    }
    
    return () => {
      if (selectedGroup && socket) {
        socket.emit('leaveGroup', { groupId: selectedGroup._id });
      }
    };
  }, [selectedGroup]);

  useEffect(() => {
    const socket = getSocketInstance();
    if (!socket || !selectedUser) return;

    const onTyping = ({ fromUserId }) => {
      if (selectedUser && fromUserId === selectedUser._id) setIsPeerTyping(true);
    };

    const onStopTyping = ({ fromUserId }) => {
      if (selectedUser && fromUserId === selectedUser._id) setIsPeerTyping(false);
    };

    socket.on('typing', onTyping);
    socket.on('stopTyping', onStopTyping);

    return () => {
      try { socket.off('typing', onTyping); socket.off('stopTyping', onStopTyping); } catch (e) {}
    };
  }, [socketId, selectedUser]);


  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSuggestedUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/user/suggested`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setSuggestedUsers(res.data.users);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await axios.get(`${API_URL}/group/mine`, { withCredentials: true });
      if (res.data.success) setGroups(res.data.groups || []);
    } catch (e) { console.log(e); }
  };

  const fetchGroupMessages = async (groupId) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/message/group/${groupId}/all`, { withCredentials: true });
      if (res.data.success) setMessages(res.data.messages || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  const fetchMessages = async (userId) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/message/all/${userId}`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setMessages(res.data.messages);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessageHandler = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) {
      toast.error('Enter a message');
      return;
    }

    try {
      if (selectedUser) {
        // Direct message
        const res = await axios.post(
          `${API_URL}/message/send/${selectedUser._id}`,
          { textMessage: newMessage },
          { withCredentials: true }
        );
        if (res.data.success) {
          setMessages([...messages, res.data.newMessage]);
          setNewMessage('');
          const s = getSocketInstance();
          if (s && selectedUser) {
            s.emit('stopTyping', { toUserId: selectedUser._id, fromUserId: user._id });
          }
          toast.success('Message sent');
        }
      } else if (selectedGroup) {
        // Group message
        const res = await axios.post(
          `${API_URL}/message/group/${selectedGroup._id}/send`,
          { textMessage: newMessage },
          { withCredentials: true }
        );
        if (res.data.success) {
          setMessages([...messages, res.data.newMessage]);
          setNewMessage('');
          toast.success('Message sent');
        }
      } else {
        toast.error('Select a user or group');
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to send message');
    }
  };

  const onInputChange = (e) => {
    const val = e.target.value;
    setNewMessage(val);

    const s = getSocketInstance();
    if (!s || !selectedUser) return;

    // emit typing and debounce stopTyping
    s.emit('typing', { toUserId: selectedUser._id, fromUserId: user._id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      s.emit('stopTyping', { toUserId: selectedUser._id, fromUserId: user._id });
    }, 1200);
  };

  const toggleMemberSelection = (userId) => {
    setSelectedMembers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const createGroupWithMembers = async () => {
    if (!newGroupName.trim()) {
      toast.error('Enter a group name');
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error('Select at least one member');
      return;
    }

    try {
      const res = await axios.post(
        `${API_URL}/group`,
        { name: newGroupName.trim(), members: selectedMembers },
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success('Group created with members');
        setShowCreateGroupModal(false);
        setNewGroupName('');
        setSelectedMembers([]);
        fetchGroups();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create group');
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      {/* Sidebar - Users List */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-black">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">Messages</h2>
          {/* Groups create button */}
          <div className="mt-3">
            <button 
              className="w-full px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded font-medium transition"
              onClick={() => setShowCreateGroupModal(true)}
            >
              Create Group
            </button>
          </div>
        </div>
        <div className="space-y-1">
          {/* Groups list */}
          {groups && groups.length > 0 && (
            <div className="p-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Your groups</p>
              {groups.map((g) => (
                <button key={g._id} onClick={() => { setSelectedGroup(g); setSelectedUser(null);} } className={`w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-900 transition rounded ${selectedGroup?._id===g._id?'bg-gray-200 dark:bg-gray-800':''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold">G</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-gray-900 dark:text-white">{g.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{g.members?.length || 1} members</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {/* Direct users list */}
          {suggestedUsers.map((u) => (
            <button
              key={u._id}
              onClick={() => { setSelectedUser(u); setSelectedGroup(null);} }
              className={`w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-900 transition rounded ${
                selectedUser?._id === u._id ? 'bg-gray-200 dark:bg-gray-800' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={u.profilePicture || 'https://via.placeholder.com/40'}
                  alt={u.username}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-gray-900 dark:text-white">{u.username}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{u.bio || 'No bio'}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser || selectedGroup ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3 justify-between bg-white dark:bg-gray-900">
              <div className="flex items-center gap-3">
                {selectedGroup ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">G</div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{selectedGroup.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{selectedGroup.members?.length || 1} members</p>
                    </div>
                  </>
                ) : (
                  <>
                    <img src={selectedUser.profilePicture || 'https://via.placeholder.com/40'} alt={selectedUser.username} className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{selectedUser.username}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.followers?.length || 0} followers</p>
                      {isPeerTyping && (<p className="text-xs text-green-500 dark:text-green-400">typing...</p>)}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-black">
              {loading ? (
                <p className="text-center text-gray-500 dark:text-gray-400">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400">No messages yet. Start a conversation!</p>
              ) : (
                messages.map((message) => {
                  const senderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
                  const senderName = typeof message.senderId === 'object' ? message.senderId.username : 'Unknown';
                  const senderPicture = typeof message.senderId === 'object' ? message.senderId.profilePicture : null;
                  
                  return (
                    <div key={message._id} className={`flex ${senderId === user._id ? 'justify-end' : 'justify-start'}`}> 
                      <div className={`max-w-xs ${senderId === user._id ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'}`}> 
                        {selectedGroup && senderId !== user._id && (
                          <div className="flex items-center gap-2 px-4 pt-2">
                            <img 
                              src={senderPicture || 'https://via.placeholder.com/24'} 
                              alt={senderName} 
                              className="w-6 h-6 rounded-full"
                            />
                            <p className="text-xs font-semibold">{senderName}</p>
                          </div>
                        )}
                        <div className="px-4 py-2">
                          <p>{message.message}</p>
                          <p className="text-xs opacity-70 mt-1">{new Date(message.createdAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessageHandler} className="border-t border-gray-200 dark:border-gray-700 p-4 flex gap-2 bg-white dark:bg-gray-900">
              <input type="text" value={newMessage} onChange={onInputChange} placeholder="Type a message..." className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 flex items-center justify-center">
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-lg">Select a user or group to start chatting</p>
          </div>
        )}
      </div>

      {/* Group Members Sidebar - Only show when viewing a group */}
      {selectedGroup && (
        <div className="w-64 border-l border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-black">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Members</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{selectedGroup.members?.length || 0} total</p>
          </div>
          <div className="space-y-2 p-4">
            {selectedGroup.members && selectedGroup.members.length > 0 ? (
              selectedGroup.members.map((member) => (
                <div key={member._id} className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-900 rounded transition">
                  <img 
                    src={member.profilePicture || 'https://via.placeholder.com/40'} 
                    alt={member.username} 
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{member.username}</p>
                    {String(member._id) === String(selectedGroup.owner?._id) && (
                      <p className="text-xs text-blue-500 dark:text-blue-400">Owner</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No members</p>
            )}
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Group</h3>
              <button 
                onClick={() => {
                  setShowCreateGroupModal(false);
                  setNewGroupName('');
                  setSelectedMembers([]);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Members ({selectedMembers.length} selected)
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded p-2">
                {suggestedUsers.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => toggleMemberSelection(u._id)}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition ${
                      selectedMembers.includes(u._id)
                        ? 'bg-sky-100 dark:bg-sky-900/30 border-2 border-sky-500'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(u._id)}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                    <img
                      src={u.profilePicture || 'https://via.placeholder.com/40'}
                      alt={u.username}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{u.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{u.bio || 'No bio'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCreateGroupModal(false);
                  setNewGroupName('');
                  setSelectedMembers([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={createGroupWithMembers}
                className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded font-medium transition"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
