import { User } from "../models/user.model.js";
import nodemailer from 'nodemailer';
import { sendVerificationEmail } from '../utils/email.js';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(401).json({
                message: "Something is missing, please check!",
                success: false,
            });
        }
        // Enforce minimum password length
        if (String(password).length < 5) {
            return res.status(400).json({
                message: 'Password must be at least 5 characters long',
                success: false,
            });
        }
        // Email domain restriction (optional)
        // By default the project enforced BRACU domains. To allow other domains or allow all
        // set environment variables:
        // - ALLOW_ALL_EMAILS=true  -> skip domain checks
        // - ALLOWED_EMAIL_DOMAINS=",@bracu.ac.bd,@g.bracu.ac.bd" -> comma-separated domains to allow (must include leading '@')
        const lowerEmail = String(email).toLowerCase();
        const allowAll = String(process.env.ALLOW_ALL_EMAILS || '').toLowerCase() === 'true';
        if (!allowAll) {
            const envList = process.env.ALLOWED_EMAIL_DOMAINS || '@bracu.ac.bd,@g.bracu.ac.bd';
            const allowedDomains = envList.split(',').map(d => d.trim()).filter(Boolean);
            const hasAllowedDomain = allowedDomains.some((d) => lowerEmail.endsWith(d));
            if (!hasAllowedDomain) {
                return res.status(400).json({
                    message: 'Registration is restricted by email domain. Use a permitted email address or update server configuration.',
                    success: false,
                });
            }
        }

    const user = await User.findOne({ email: lowerEmail });
        if (user) {
            return res.status(401).json({
                message: "Try different email",
                success: false,
            });
        };
        const hashedPassword = await bcrypt.hash(password, 10);
        // create user with isVerified=false
        const createdUser = await User.create({
            username,
            email: lowerEmail,
            password: hashedPassword,
            isVerified: false,
        });

        // generate a verification token
        const verifyToken = jwt.sign({ userId: createdUser._id, purpose: 'verify' }, process.env.SECRET_KEY, { expiresIn: '1d' });
        const verifyUrl = `${req.protocol}://${req.get('host')}/api/v1/user/verify?token=${verifyToken}`;

        // try to send verification email (helper will no-op if SMTP not configured)
        try {
            await sendVerificationEmail(createdUser.email, createdUser.username, verifyUrl);
        } catch (e) {
            console.log('Failed to send verification email', e);
        }

        return res.status(201).json({
            message: "Account created successfully. Please verify your email.",
            success: true,
            verifyUrl // returned for dev/testing; in production this may not be returned
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(401).json({
                message: "Something is missing, please check!",
                success: false,
            });
        }
    const lowerEmail = String(email).toLowerCase();
    let user = await User.findOne({ email: lowerEmail });
        if (!user) {
            return res.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        };

        const token = await jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '1d' });

        // populate each post if in the posts array
        const populatedPosts = await Promise.all(
            user.posts.map( async (postId) => {
                try {
                    const post = await Post.findById(postId);
                    if (post && post.author && post.author.equals && post.author.equals(user._id)){
                        return post;
                    }
                } catch (e) {
                    // ignore individual post lookup errors
                }
                return null;
            })
        );

        // filter out any null entries to avoid frontend render errors
        const filteredPosts = populatedPosts.filter(Boolean);

        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: filteredPosts
        };
        // Cookie options: use secure, SameSite='none' in production (for cross-site requests),
        // and a more permissive setting during development for local testing.
        const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
        const cookieOptions = {
            httpOnly: true,
            sameSite: isProd ? 'none' : 'lax',
            secure: isProd,
            maxAge: 1 * 24 * 60 * 60 * 1000,
        };

        return res.cookie('token', token, cookieOptions).json({
            message: `Welcome back ${user.username}`,
            success: true,
            user
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
export const logout = async (_, res) => {
    try {
        const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
        const cookieOptions = {
            httpOnly: true,
            sameSite: isProd ? 'none' : 'lax',
            secure: isProd,
            maxAge: 0,
        };
        return res.cookie("token", "", cookieOptions).json({
            message: 'Logged out successfully.',
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        const currentUserId = req.id;

        let user = await User.findById(userId)
            .select('-password')
            .populate({
                path: 'posts',
                options: { sort: { createdAt: -1 } },
                populate: [
                    { path: 'author', select: 'username profilePicture' },
                    { path: 'comments', populate: { path: 'author', select: 'username profilePicture' } },
                ],
            })
            .populate({
                path: 'followers',
                select: 'username profilePicture',
            })
            .populate({
                path: 'following',
                select: 'username profilePicture',
            })
            .populate('bookmarks')
            .lean();

        // Fallback: if posts are not embedded on the user document, fetch directly from Post collection
        // This fixes profiles that show "No posts" when the posts array is empty or out of sync.
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.posts || user.posts.length === 0) {
            const posts = await Post.find({ author: userId })
                .sort({ createdAt: -1 })
                .populate({ path: 'comments', populate: { path: 'author', select: 'username profilePicture' } })
                .populate({ path: 'author', select: 'username profilePicture' })
                .lean();
            user.posts = posts;
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check privacy settings
        const isOwnProfile = String(userId) === String(currentUserId);
        const isFollower = user.followers?.some(f => String(f._id || f) === String(currentUserId));

        if (!isOwnProfile && user.privacy === 'private' && !isFollower) {
            // Return limited profile info for private accounts that user doesn't follow
            return res.status(200).json({
                user: {
                    _id: user._id,
                    username: user.username,
                    profilePicture: user.profilePicture,
                    bio: user.bio,
                    gender: user.gender,
                    privacy: user.privacy,
                    followers: [],
                    following: [],
                    posts: [],
                    isPrivateAndNotFollower: true
                },
                success: true
            });
        }

        return res.status(200).json({
            user,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const editProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { bio, gender, privacy } = req.body;
        const profilePicture = req.file;
        let cloudResponse;

        if (profilePicture) {
            const fileUri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileUri);
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({
                message: 'User not found.',
                success: false
            });
        };
    if (bio) user.bio = bio;
    // normalize gender server-side to avoid enum validation issues
    if (gender) user.gender = String(gender).toLowerCase();
    if (privacy && ['public', 'private'].includes(privacy)) user.privacy = privacy;
        if (profilePicture) user.profilePicture = cloudResponse.secure_url;

        await user.save();

        return res.status(200).json({
            message: 'Profile updated.',
            success: true,
            user
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
export const getSuggestedUsers = async (req, res) => {
    try {
        const suggestedUsers = await User.find({ _id: { $ne: req.id } }).select("-password");
        if (!suggestedUsers) {
            return res.status(400).json({
                message: 'Currently do not have any users',
            })
        };
        return res.status(200).json({
            success: true,
            users: suggestedUsers
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ success: false, message: 'Verification token missing' });

        let payload;
        try {
            payload = jwt.verify(token, process.env.SECRET_KEY);
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token' });
        }

        if (payload.purpose !== 'verify' || !payload.userId) {
            return res.status(400).json({ success: false, message: 'Invalid token payload' });
        }

        const user = await User.findById(payload.userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.isVerified = true;
        await user.save();

        return res.status(200).json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

export const searchUsers = async (req, res) => {
    try {
        const q = req.query.q || '';
        if (!q.trim()) {
            return res.status(200).json({ success: true, users: [] });
        }
        // case-insensitive partial match on username or email
        const regex = new RegExp(q, 'i');
        const users = await User.find({
            $or: [{ username: regex }, { email: regex }],
            _id: { $ne: req.id }
        }).select('-password');

        return res.status(200).json({ success: true, users });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
export const followOrUnfollow = async (req, res) => {
    try {
        const Je_follow_korbe = req.id;
        const jake_follow_korbe = req.params.id;
        if (Je_follow_korbe === jake_follow_korbe) {
            return res.status(400).json({
                message: 'You cannot follow/unfollow yourself',
                success: false
            });
        }

        const user = await User.findById(Je_follow_korbe);
        const targetUser = await User.findById(jake_follow_korbe);

        if (!user || !targetUser) {
            return res.status(400).json({
                message: 'User not found',
                success: false
            });
        }
        
        const isFollowing = user.following.includes(jake_follow_korbe);
        if (isFollowing) {
            // unfollow
            await Promise.all([
                User.updateOne({ _id: Je_follow_korbe }, { $pull: { following: jake_follow_korbe } }),
                User.updateOne({ _id: jake_follow_korbe }, { $pull: { followers: Je_follow_korbe } }),
            ])
            return res.status(200).json({ message: 'Unfollowed successfully', success: true });
        } else {
            // Check if target user has private account
            if (targetUser.privacy === 'private') {
                // Check if follow request already exists
                const { FollowRequest } = await import('../models/followRequest.model.js');
                const existingRequest = await FollowRequest.findOne({
                    from: Je_follow_korbe,
                    to: jake_follow_korbe,
                    status: 'pending'
                });

                if (existingRequest) {
                    return res.status(400).json({
                        message: 'Follow request already sent',
                        success: false
                    });
                }

                // Create follow request
                await FollowRequest.create({
                    from: Je_follow_korbe,
                    to: jake_follow_korbe
                });

                return res.status(200).json({
                    message: 'Follow request sent',
                    success: true,
                    isFollowRequest: true
                });
            } else {
                // Public account - direct follow
                await Promise.all([
                    User.updateOne({ _id: Je_follow_korbe }, { $push: { following: jake_follow_korbe } }),
                    User.updateOne({ _id: jake_follow_korbe }, { $push: { followers: Je_follow_korbe } }),
                ])
                // persist a follow notification
                try {
                    const { Notification } = await import('../models/notification.model.js');
                    await Notification.create({
                        type: 'follow',
                        user: jake_follow_korbe,
                        fromUser: Je_follow_korbe,
                        message: 'You have a new follower'
                    });
                } catch (e) {
                    console.log('Failed to persist follow notification', e);
                }
                return res.status(200).json({ message: 'followed successfully', success: true });
            }
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getMe = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getFollowRequests = async (req, res) => {
    try {
        const userId = req.id;
        const { FollowRequest } = await import('../models/followRequest.model.js');
        const requests = await FollowRequest.find({
            to: userId,
            status: 'pending'
        }).populate('from', 'username profilePicture').sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            followRequests: requests
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const acceptFollowRequest = async (req, res) => {
    try {
        const userId = req.id;
        const { requestId } = req.params;
        const { FollowRequest } = await import('../models/followRequest.model.js');

        const followRequest = await FollowRequest.findById(requestId);
        if (!followRequest || followRequest.to.toString() !== userId) {
            return res.status(404).json({
                success: false,
                message: 'Follow request not found'
            });
        }

        if (followRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Request is no longer pending'
            });
        }

        // Update follow request status
        followRequest.status = 'accepted';
        await followRequest.save();

        // Add to followers/following
        const fromUserId = followRequest.from;
        await Promise.all([
            User.updateOne({ _id: fromUserId }, { $push: { following: userId } }),
            User.updateOne({ _id: userId }, { $push: { followers: fromUserId } })
        ]);

        return res.status(200).json({
            success: true,
            message: 'Follow request accepted'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const rejectFollowRequest = async (req, res) => {
    try {
        const userId = req.id;
        const { requestId } = req.params;
        const { FollowRequest } = await import('../models/followRequest.model.js');

        const followRequest = await FollowRequest.findById(requestId);
        if (!followRequest || followRequest.to.toString() !== userId) {
            return res.status(404).json({
                success: false,
                message: 'Follow request not found'
            });
        }

        if (followRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Request is no longer pending'
            });
        }

        followRequest.status = 'rejected';
        await followRequest.save();

        return res.status(200).json({
            success: true,
            message: 'Follow request rejected'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const changeEmail = async (req, res) => {
    try {
        const userId = req.id;
        const { newEmail, password } = req.body;

        if (!newEmail || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both new email and password'
            });
        }

        // enforce allowed email domains unless ALLOW_ALL_EMAILS is set
        const lowerEmail = String(newEmail).toLowerCase().trim();
        const allowAll = String(process.env.ALLOW_ALL_EMAILS || '').toLowerCase() === 'true';
        if (!allowAll) {
            // By default allow both student and main domains
            const envList = process.env.ALLOWED_EMAIL_DOMAINS || '@g.bracu.ac.bd,@bracu.ac.bd';
            const allowedDomains = envList
                .split(',')
                .map((d) => d.trim().toLowerCase())
                .filter(Boolean);
            const hasAllowedDomain = allowedDomains.some((d) => lowerEmail.endsWith(d));
            if (!hasAllowedDomain) {
                return res.status(400).json({
                    message: 'Email must use @g.bracu.ac.bd or @bracu.ac.bd.',
                    success: false,
                });
            }
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({ success: false, message: 'Incorrect password' });
        }

        if (user.email === lowerEmail) {
            return res.status(400).json({ success: false, message: 'New email cannot be the same as current email' });
        }

        const existing = await User.findOne({ email: lowerEmail });
        if (existing && String(existing._id) !== String(userId)) {
            return res.status(400).json({ success: false, message: 'Email is already in use' });
        }

        user.email = lowerEmail;
        // optionally require re-verification on email change
        user.isVerified = false;
        await user.save();

        // send verification email to the new address (best-effort)
        try {
            const verifyToken = jwt.sign({ userId: user._id, purpose: 'verify' }, process.env.SECRET_KEY, { expiresIn: '1d' });
            const verifyUrl = `${req.protocol}://${req.get('host')}/api/v1/user/verify?token=${verifyToken}`;
            await sendVerificationEmail(user.email, user.username, verifyUrl);
        } catch (e) {
            console.log('Failed to send verification email after email change', e);
        }

        const safeUser = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: user.posts,
            isVerified: user.isVerified,
        };

        return res.status(200).json({
            success: true,
            message: 'Email changed. Please verify your new email.',
            user: safeUser,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const changePassword = async (req, res) => {
    try {
        const userId = req.id;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both old and new passwords'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Reject if new equals current (plain-text check to short-circuit)
        if (String(oldPassword || '') === String(newPassword || '')) {
            return res.status(400).json({
                success: false,
                message: 'Password is already in use'
            });
        }

        // Verify old password
        const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({
                success: false,
                message: 'Incorrect current password'
            });
        }

        // Extra safety: ensure new password isn't the same as current hashed value
        const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
        if (isSameAsCurrent) {
            return res.status(400).json({
                success: false,
                message: 'Password is already in use'
            });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        user.password = hashedNewPassword;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteAccount = async (req, res) => {
    try {
        const userId = req.id;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete all user's posts and associated comments
        const posts = await Post.find({ author: userId });
        for (const post of posts) {
            await Post.findByIdAndDelete(post._id);
            await Comment.deleteMany({ post: post._id });
        }

        // Delete all user's stories
        const { Story } = await import('../models/story.model.js');
        await Story.deleteMany({ author: userId });

        // Delete all user's reels
        const { Reel } = await import('../models/reel.model.js');
        await Reel.deleteMany({ author: userId });

        // Delete all user's drafts
        const { Draft } = await import('../models/draft.model.js');
        await Draft.deleteMany({ author: userId });

        // Delete all user's messages and conversations
        const { Conversation } = await import('../models/conversation.model.js');
        await Conversation.deleteMany({ participants: userId });

        // Delete all user's notifications
        const { Notification } = await import('../models/notification.model.js');
        await Notification.deleteMany({ $or: [{ user: userId }, { from: userId }] });

        // Delete user's follow requests
        const { FollowRequest } = await import('../models/followRequest.model.js');
        await FollowRequest.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] });

        // Remove user from other users' followers/following
        await User.updateMany({ followers: userId }, { $pull: { followers: userId } });
        await User.updateMany({ following: userId }, { $pull: { following: userId } });

        // Delete the user account
        await User.findByIdAndDelete(userId);

        // Clear authentication cookie
        return res.cookie('token', '', { maxAge: 0 }).status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};