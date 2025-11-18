const axios = require('axios');
const { chromium } = require('playwright');

(async () => {
  try {
    const API = 'http://localhost:8000/api/v1';
    const FRONTEND = 'http://localhost:5173';
    const ts = Date.now();
    const email = `pwtest_${ts}@example.com`;
    const username = `pwtest_${ts}`;
    const password = 'Test@12345';

    console.log('[e2e-debug] Registering test user', email);
    await axios.post(`${API}/user/register`, { username, email, password }, { validateStatus: () => true });

    console.log('[e2e-debug] Logging in...');
    const loginRes = await axios.post(`${API}/user/login`, { email, password }, { withCredentials: true, validateStatus: () => true });

    const setCookie = loginRes.headers && loginRes.headers['set-cookie'];
    if (!setCookie) console.warn('[e2e-debug] No set-cookie received; backend may use other auth method');
    else console.log('[e2e-debug] Received cookie header');

    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const m = cookieStr && cookieStr.match(/^([^=]+)=([^;]+);/);
    const cookieName = m ? m[1] : null;
    const cookieValue = m ? m[2] : null;
    console.log('[e2e-debug] cookieName=', cookieName);

    const userObj = loginRes.data && loginRes.data.user ? loginRes.data.user : null;
    if (!userObj) console.warn('[e2e-debug] No user object in login response body');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    if (cookieName && cookieValue) {
      await context.addCookies([{ name: cookieName, value: cookieValue, domain: 'localhost', path: '/' }]);
      console.log('[e2e-debug] Cookie set in browser context');
    }

    const page = await context.newPage();

    // Set redux-persist data so ProtectedRoutes will see authenticated user
    if (userObj) {
      const persistRoot = {
        auth: JSON.stringify({ user: userObj })
      };
      await page.addInitScript((data) => {
        // runs in page context before any scripts
        localStorage.setItem('persist:root', data);
      }, JSON.stringify(persistRoot));
      console.log('[e2e-debug] Added persist:root localStorage via addInitScript');
    }

    console.log('[e2e-debug] Opening frontend', FRONTEND);
    await page.goto(FRONTEND, { waitUntil: 'networkidle' });

    // Small checks for main UI pieces
    try {
      await page.waitForSelector('text=Home', { timeout: 4000 });
      console.log('[e2e-debug] Found Home text');
    } catch (e) {
      console.warn('[e2e-debug] Home text not found');
    }

    // Try Explore
    try {
      await page.waitForSelector('text=Explore', { timeout: 3000 });
      await page.click('text=Explore');
      console.log('[e2e-debug] Clicked Explore');
    } catch (e) {
      console.warn('[e2e-debug] Explore not clickable or not present');
    }

    // Notifications
    try {
      await page.waitForSelector('text=Notifications', { timeout: 2000 });
      console.log('[e2e-debug] Notifications element present');
    } catch (e) {
      console.warn('[e2e-debug] Notifications element not found');
    }

    // Navigate to profile using returned user id
    const userId = userObj && userObj._id ? userObj._id : null;
    if (userId) {
      await page.goto(`${FRONTEND}/profile/${userId}`, { waitUntil: 'networkidle' });
      console.log('[e2e-debug] Opened profile page for', userId, 'current URL:', page.url());
    }

    // --- Additional API flows: create post, comment, like, follow/unfollow ---
    try {
      // create a post as user A (via API) using caption only
      const caption = `E2E test post at ${Date.now()}`;
      const createPostRes = await axios.post(`${API}/post/addpost`, { caption }, {
        headers: { 'Content-Type': 'application/json', Cookie: cookieStr }
      });
      if (createPostRes.status === 201 && createPostRes.data && createPostRes.data.post) {
        const postId = createPostRes.data.post._id || createPostRes.data.post.id || createPostRes.data.post;
        console.log('[e2e-debug] Created post', postId);

        // register and login a second user (commenter)
        const ts2 = Date.now();
        const email2 = `pwtest_b_${ts2}@example.com`;
        const username2 = `pwtest_b_${ts2}`;
        await axios.post(`${API}/user/register`, { username: username2, email: email2, password: password }, { validateStatus: () => true });
        const loginResB = await axios.post(`${API}/user/login`, { email: email2, password }, { withCredentials: true, validateStatus: () => true });
        const setCookieB = loginResB.headers && loginResB.headers['set-cookie'];
        const cookieStrB = Array.isArray(setCookieB) ? setCookieB[0] : setCookieB;

        // commenter posts a comment on the post
        const commentRes = await axios.post(`${API}/post/${postId}/comment`, { text: 'Nice post from e2e' }, {
          headers: { 'Content-Type': 'application/json', Cookie: cookieStrB }
        });
        console.log('[e2e-debug] Comment response status', commentRes.status);

        // commenter likes the post
        const likeRes = await axios.get(`${API}/post/${postId}/like`, { headers: { Cookie: cookieStrB } });
        console.log('[e2e-debug] Like response status', likeRes.status);

        // now fetch notifications as post owner (user A)
        const notifRes = await axios.get(`${API}/notification`, { headers: { Cookie: cookieStr } });
        console.log('[e2e-debug] Notifications count for owner:', notifRes.data && notifRes.data.notifications ? notifRes.data.notifications.length : 'N/A');

        // test follow/unfollow: commenter B follows owner A
        const ownerId = userObj && userObj._id ? userObj._id : null;
        if (ownerId) {
          const followRes = await axios.post(`${API}/user/followorunfollow/${ownerId}`, {}, { headers: { Cookie: cookieStrB } });
          console.log('[e2e-debug] Follow response status', followRes.status, followRes.data && followRes.data.success);
          // unfollow back to clean state
          const unfollowRes = await axios.post(`${API}/user/followorunfollow/${ownerId}`, {}, { headers: { Cookie: cookieStrB } });
          console.log('[e2e-debug] Unfollow response status', unfollowRes.status, unfollowRes.data && unfollowRes.data.success);
        }
      } else {
        console.warn('[e2e-debug] Failed to create post via API', createPostRes && createPostRes.status);
      }
    } catch (e) {
      console.warn('[e2e-debug] Additional API flows failed', e && e.message ? e.message : e);
    }

    await browser.close();
    console.log('[e2e-debug] Finished');
    process.exit(0);
  } catch (err) {
    console.error('[e2e-debug] Error', err && err.stack ? err.stack : err);
    process.exit(2);
  }
})();
