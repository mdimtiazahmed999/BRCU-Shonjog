import express from "express";
import { 
    register, 
    login, 
    logout, 
    getProfile, 
    editProfile, 
    getSuggestedUsers, 
    searchUsers,
    verifyEmail,
    followOrUnfollow,
    getMe,
    getFollowRequests,
    acceptFollowRequest,
    rejectFollowRequest,
    changePassword,
    changeEmail,
    deleteAccount,
} from "../controllers/user.controller.js";
import { resendVerification } from '../controllers/verify.controller.js';
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

router.route('/register').post(register);
router.route('/login').post(login);
router.route('/logout').get(logout);
router.route('/me').get(isAuthenticated, getMe);
router.route('/:id/profile').get(isAuthenticated, getProfile);
router.route('/profile/edit').post(isAuthenticated, upload.single('profilePicture'), editProfile);
router.route('/change-password').post(isAuthenticated, changePassword);
router.route('/change-email').post(isAuthenticated, changeEmail);
router.route('/delete-account').post(isAuthenticated, deleteAccount);
router.route('/suggested').get(isAuthenticated, getSuggestedUsers);
router.route('/search').get(isAuthenticated, searchUsers);
router.route('/verify').get(verifyEmail);
router.route('/resend').post(resendVerification);
router.route('/followorunfollow/:id').post(isAuthenticated, followOrUnfollow);
router.route('/follow-requests').get(isAuthenticated, getFollowRequests);
router.route('/follow-requests/:requestId/accept').post(isAuthenticated, acceptFollowRequest);
router.route('/follow-requests/:requestId/reject').post(isAuthenticated, rejectFollowRequest);

export default router;