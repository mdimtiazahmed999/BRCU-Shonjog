import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import { Notification } from "../models/notification.model.js";

export const addNewPost = async (req, res) => {
    try {
        const { caption } = req.body;
        const image = req.file;
        const authorId = req.id;

        if (!image && !caption) return res.status(400).json({ message: 'Image or caption required' });

        let imageUrl = null;
        if (image) {
            // try to optimize using sharp if available; fall back to original buffer otherwise
            let optimizedImageBuffer;
            try {
                const mod = await import('sharp');
                const sharpLib = mod && mod.default ? mod.default : mod;
                optimizedImageBuffer = await sharpLib(image.buffer)
                    .resize({ width: 800, height: 800, fit: 'inside' })
                    .toFormat('jpeg', { quality: 80 })
                    .toBuffer();
            } catch (e) {
                // sharp not installed or failed to load — use original buffer
                optimizedImageBuffer = image.buffer;
            }

            // buffer to data uri
            const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString('base64')}`;
            const cloudResponse = await cloudinary.uploader.upload(fileUri);
            imageUrl = cloudResponse.secure_url;
        }

        const post = await Post.create({
            caption,
            image: imageUrl,
            author: authorId
        });
        // parse mentions and hashtags from caption
        try {
            const mentionRegex = /@([a-zA-Z0-9_\.\-]+)/g;
            const hashRegex = /#(\w+)/g;
            const mentions = [];
            const hashtags = [];
            let m;
            while ((m = mentionRegex.exec(caption || '')) !== null) {
                mentions.push(m[1]);
            }
            while ((m = hashRegex.exec(caption || '')) !== null) {
                hashtags.push(m[1].toLowerCase());
            }
            if (mentions.length > 0) {
                // resolve usernames to user ids (first match)
                const users = await User.find({ username: { $in: mentions } }).select('_id');
                post.mentions = users.map(u => u._id);
            }
            if (hashtags.length > 0) {
                post.hashtags = [...new Set(hashtags)];
            }
            await post.save();
        } catch (e) {
            console.log('mentions/hashtags parsing failed', e);
        }
        const user = await User.findById(authorId);
        if (user) {
            user.posts.push(post._id);
            await user.save();
        }

        await post.populate({ path: 'author', select: '-password' });

        return res.status(201).json({
            message: 'New post added',
            post,
            success: true,
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Failed to create post', error: error.message, success: false });
    }
}
export const getAllPost = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;

        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({ path: 'author', select: 'username profilePicture' })
            .populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: {
                    path: 'author',
                    select: 'username profilePicture'
                }
            });
        const total = await Post.countDocuments();
        return res.status(200).json({
            posts,
            success: true,
            pagination: { page, limit, total }
        })
    } catch (error) {
        console.log(error);
    }
};
export const getUserPost = async (req, res) => {
    try {
        const authorId = req.id;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;

        const posts = await Post.find({ author: authorId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'author',
                select: 'username profilePicture'
            }).populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: {
                    path: 'author',
                    select: 'username profilePicture'
                }
            });

        const total = await Post.countDocuments({ author: authorId });
        return res.status(200).json({
            posts,
            success: true,
            pagination: { page, limit, total }
        })
    } catch (error) {
        console.log(error);
    }
}
export const likePost = async (req, res) => {
    try {
        const likers_id = req.id;
        const postId = req.params.id; 
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found', success: false });

        // like logic started
        await post.updateOne({ $addToSet: { likes: likers_id } });
        await post.save();

        // implement socket io for real time notification
        const user = await User.findById(likers_id).select('username profilePicture');
         
        const postOwnerId = post.author.toString();
        if(postOwnerId !== likers_id){
            // persist notification
            try {
                await Notification.create({
                    type: 'like',
                    user: postOwnerId,
                    fromUser: likers_id,
                    post: postId,
                    message: 'Your post was liked'
                });
            } catch (e) {
                console.log('Failed to persist notification', e);
            }

            // emit a notification event
            const notification = {
                type:'like',
                userId:likers_id,
                userDetails:user,
                postId,
                message:'Your post was liked'
            }
            const postOwnerSocketId = getReceiverSocketId(postOwnerId);
            if (io && postOwnerSocketId) {
                io.to(postOwnerSocketId).emit('notification', notification);
            }
        }

        return res.status(200).json({message:'Post liked', success:true});
    } catch (error) {

    }
}
export const dislikePost = async (req, res) => {
    try {
        const likers_id = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found', success: false });

        // like logic started
        await post.updateOne({ $pull: { likes: likers_id } });
        await post.save();

        // implement socket io for real time notification
        const user = await User.findById(likers_id).select('username profilePicture');
        const postOwnerId = post.author.toString();
        if(postOwnerId !== likers_id){
            // persist notification
            try {
                await Notification.create({
                    type: 'dislike',
                    user: postOwnerId,
                    fromUser: likers_id,
                    post: postId,
                    message: 'A like was removed on your post'
                });
            } catch (e) {
                console.log('Failed to persist notification', e);
            }

            // emit a notification event
            const notification = {
                type:'dislike',
                userId:likers_id,
                userDetails:user,
                postId,
                message:'A like was removed from your post'
            }
            const postOwnerSocketId = getReceiverSocketId(postOwnerId);
            if (io && postOwnerSocketId) {
                io.to(postOwnerSocketId).emit('notification', notification);
            }
        }



        return res.status(200).json({message:'Post disliked', success:true});
    } catch (error) {

    }
}
export const addComment = async (req,res) =>{
    try {
        const postId = req.params.id;
        const commenters_id = req.id;

        const {text} = req.body;

        const post = await Post.findById(postId);

        if(!text) return res.status(400).json({message:'text is required', success:false});

        const comment = await Comment.create({
            text,
            author:commenters_id,
            post:postId
        })

        await comment.populate({
            path:'author',
            select:"username profilePicture"
        });
        
        post.comments.push(comment._id);
        await post.save();

        // persist notification for post owner (if commenter is not owner)
        try {
            const postOwnerId = post.author.toString();
            if (postOwnerId !== commenters_id) {
                await Notification.create({
                    type: 'comment',
                    user: postOwnerId,
                    fromUser: commenters_id,
                    post: postId,
                    message: 'Someone commented on your post'
                });
                const commenter = await User.findById(commenters_id).select('username profilePicture');
                const postOwnerSocketId = getReceiverSocketId(postOwnerId);
                if (io && postOwnerSocketId) {
                    io.to(postOwnerSocketId).emit('notification', {
                        type: 'comment',
                        userId: commenters_id,
                        userDetails: commenter,
                        postId,
                        message: 'Someone commented on your post'
                    });
                }
            }
        } catch (e) {
            console.log('Failed to persist/emit comment notification', e);
        }

        return res.status(201).json({
            message:'Comment Added',
            comment,
            success:true
        })

    } catch (error) {
        console.log(error);
    }
};
export const getCommentsOfPost = async (req,res) => {
    try {
        const postId = req.params.id;

        const comments = await Comment.find({post:postId}).populate('author', 'username profilePicture');

        if(!comments) return res.status(404).json({message:'No comments found for this post', success:false});

        return res.status(200).json({success:true,comments});

    } catch (error) {
        console.log(error);
    }
}
export const deletePost = async (req,res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;

        const post = await Post.findById(postId);
        if(!post) return res.status(404).json({message:'Post not found', success:false});

        // check if the logged-in user is the owner of the post
        if(post.author.toString() !== authorId) return res.status(403).json({message:'Unauthorized'});

        // delete post
        await Post.findByIdAndDelete(postId);

        // remove the post id from the user's post
        let user = await User.findById(authorId);
        user.posts = user.posts.filter(id => id.toString() !== postId);
        await user.save();

        // delete associated comments
        await Comment.deleteMany({post:postId});

        return res.status(200).json({
            success:true,
            message:'Post deleted'
        })

    } catch (error) {
        console.log(error);
    }
}
export const bookmarkPost = async (req,res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;
        const post = await Post.findById(postId);
        if(!post) return res.status(404).json({message:'Post not found', success:false});
        
        const user = await User.findById(authorId);
        if(user.bookmarks.includes(post._id)){
            // already bookmarked -> remove from the bookmark
            await user.updateOne({$pull:{bookmarks:post._id}});
            await user.save();
            return res.status(200).json({type:'unsaved', message:'Post removed from bookmark', success:true});

        }else{
            // bookmark
            await user.updateOne({$addToSet:{bookmarks:post._id}});
            await user.save();
            return res.status(200).json({type:'saved', message:'Post bookmarked', success:true});
        }

    } catch (error) {
        console.log(error);
    }
}
export const searchPosts = async (req, res) => {
    try {
        const q = req.query.q || '';
        if (!q.trim()) {
            return res.status(200).json({ success: true, posts: [] });
        }
        const regex = new RegExp(q, 'i');
        const posts = await Post.find({ caption: regex })
            .sort({ createdAt: -1 })
            .populate({ path: 'author', select: 'username profilePicture' })
            .populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: { path: 'author', select: 'username profilePicture' }
            });

        return res.status(200).json({ success: true, posts });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};