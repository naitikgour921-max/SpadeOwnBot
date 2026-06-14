const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');
const fs = require('fs');

// --- Configuration ---
const botToken = process.env.BOT_TOKEN || "8962692068:AAGlyid0J5PwKsuVeLDr9dMWmNM7Mm94-Ig";
const adminId = process.env.ADMIN_ID || "5585391580";
const mongoUrl = process.env.MONGO_URL;

if (!mongoUrl) {
    console.error("❌ MONGO_URL missing! Railway me variable check karo.");
    process.exit(1);
}

// Bot init with drop_pending_updates
const bot = new TelegramBot(botToken, { 
    polling: { params: { drop_pending_updates: true } } 
});

console.log("🤖 Bot is starting...");

// --- MongoDB Setup ---
const client = new MongoClient(mongoUrl);
let db, dataCol, waitingCol;

async function initDB() {
    await client.connect();
    db = client.db('PremiumBotDB');
    dataCol = db.collection('bot_data');
    waitingCol = db.collection('waiting_list');

    // Data Migration from Local JSON to MongoDB
    let existingData = await dataCol.findOne({ _id: "mainData" });
    if (!existingData) {
        console.log("🔄 MongoDB me data nahi mila. Local data.json se import kar raha hu...");
        let initialData;
        if (fs.existsSync('data.json')) {
            initialData = JSON.parse(fs.readFileSync('data.json', 'utf8'));
        } else {
            initialData = {
                users: [], user_details: {}, demos: [], states: {}, pending: [],
                history: { approved: 0, rejected: 0 },
                settings: {
                    upi: 'example@ybl', support: '@nglynx', premium_image: 'https://i.ibb.co/9x38myC/x.jpg',
                    price_indian: '199', price_premium: '299', price_movies: '399', price_all: '499',
                    link_indian: 'https://t.me/link1', link_premium: 'https://t.me/link2', link_movies: 'https://t.me/link3', link_all: 'https://t.me/link4'
                }
            };
        }
        initialData._id = "mainData";
        await dataCol.insertOne(initialData);
        
        if (fs.existsSync('waiting.json')) {
            let waitData = JSON.parse(fs.readFileSync('waiting.json', 'utf8'));
            if (Object.keys(waitData).length > 0) {
                await waitingCol.insertOne({ _id: "waitList", data: waitData });
            }
        }
        console.log("✅ Data Migration Complete!");
    } else {
        console.log("✅ MongoDB already has data. Ready to go!");
    }

    let waitListCheck = await waitingCol.findOne({ _id: "waitList" });
    if (!waitListCheck) await waitingCol.insertOne({ _id: "waitList", data: {} });
}

initDB();

// --- Helper Functions ---
async function getData() { return await dataCol.findOne({ _id: "mainData" }); }
async function saveData(data) { await dataCol.replaceOne({ _id: "mainData" }, data); }
async function getWaiting() { let res = await waitingCol.findOne({ _id: "waitList" }); return res ? res.data : {}; }
async function saveWaiting(waitData) { await waitingCol.replaceOne({ _id: "waitList" }, { _id: "waitList", data: waitData }); }

function getAdminMenu() {
    return {
        keyboard: [
            [{ text: 'Change UPI' }, { text: 'Change Username' }],
            [{ text: 'Change Price' }, { text: 'Add Links' }],
            [{ text: 'Change Premium Image' }, { text: 'Process Link Video' }], 
            [{ text: 'Add Demo Video' }, { text: 'Remove Demo' }],
            [{ text: 'Check Users List' }, { text: 'Check History' }]
        ],
        resize_keyboard: true
    };
}

const packEmojiMap = {
    'indian': '👉 INDIAN VIDEOS 👈',
    'premium': '🤤 R@P VIDEOS 🤤',
    'movies': '👄 CHILD VIDEOS (50k+)😵',
    'all': '🥵 ALL IN ONE 50+ GROUPS ✅'
};

const categoryMap = { 'Indian': 'indian', 'R@p': 'premium', 'Child': 'movies', 'All': 'all' };

// --- 5-Minute Cron Job (Interval) ---
setInterval(async () => {
    if (!db) return;
    let waiting = await getWaiting();
    let changed = false;
    const now = Math.floor(Date.now() / 1000);

    for (let cid in waiting) {
        if (now - waiting[cid].time >= 300) {
            let info = waiting[cid];
            let oldPrice = parseInt(info.price);
            let newPrice = Math.round(oldPrice * 0.80);
            let packKey = info.pack;
            let exactPackName = packEmojiMap[packKey] || (packKey.charAt(0).toUpperCase() + packKey.slice(1) + " Videos");
            
            let offerMsg = `🎉 <b>𝐒𝐏𝐄𝐂𝐈𝐀𝐋 𝐎𝐅𝐅𝐄𝐑 𝐎𝐍𝐋𝐘 𝐅𝐎𝐑 𝐘𝐎𝐔</b> 🎉\n\n𝐃𝐞𝐬𝐢 𝐋𝐞𝐚𝐤𝐬 🥵\n€𝐏 𝐕𝐢𝐝𝐞𝐨𝐬 💦\n𝐈𝐧𝐝𝐢𝐚𝐧 𝐅𝐨𝐫𝐜𝐞𝐝 𝐏*𝐫𝐧 🤤\n\n📦 <b>𝗬𝗼𝘂𝗿 𝗣𝗮𝗰𝗸:</b> ${exactPackName}\n❌ <b>𝖮𝗋𝗂𝗀𝗂𝗇𝖺𝗅 𝖯𝗋𝗂𝖼𝖾:</b> ₹${oldPrice}\n✅ <b>𝖮𝖿𝖿𝖾𝗋 𝖯𝗋𝗂𝖼𝖾:</b> ₹${newPrice}\n\n👇 <i> 𝖭𝗂𝖼𝗁𝖾 𝖡𝗎𝗍𝗍𝗈𝗇 𝖢𝗅𝗂𝖼𝗄 𝖪𝖺𝗋𝗄𝖾 𝖠𝗉𝗇𝖺 𝟐𝟎% 𝖣𝗂𝗌𝖼𝗈𝗎𝗇𝗍 𝖢𝗅𝖺𝗂𝗆 𝖪𝖺𝗋𝗅𝖾𝗂𝗇</i>`;
            
            let offerBtn = { inline_keyboard: [[{ text: `🤩 𝐂𝐋𝐀𝐈𝐌 𝐎𝐅𝐅𝐄𝐑 (₹${newPrice})`, callback_data: `specialoffer_${info.pack}_${newPrice}` }]] };
            
            try { await bot.sendMessage(cid, offerMsg, { parse_mode: 'HTML', reply_markup: offerBtn }); } catch (e) {}
            
            delete waiting[cid];
            changed = true;
        }
    }
    if (changed) await saveWaiting(waiting);
}, 30000); // Check every 30 seconds

// --- Message Handler ---
bot.on('message', async (msg) => {
    if (!db) return;
    const chatId = msg.chat.id.toString();
    const text = msg.text || '';
    const captionText = msg.caption || '';
    const photo = msg.photo;
    const video = msg.video;
    const firstName = msg.from.first_name || 'User';
    const username = msg.from.username || 'NoUsername';
    const isAdmin = (chatId === adminId);

    let data = await getData();

    // /checkms (Admin Speed Check)
    if (isAdmin && text === '/checkms') {
        const start = Date.now();
        const sentMsg = await bot.sendMessage(chatId, "⏱ Checking response speed...");
        const diff = Date.now() - start;
        const seconds = (diff / 1000).toFixed(2);
        bot.editMessageText(`✅ Bot Speed is working perfectly!\n\n⚡ Response Time: **${seconds} seconds**`, { chat_id: chatId, message_id: sentMsg.message_id, parse_mode: 'Markdown' });
        return;
    }

    if (!data.users.includes(Number(chatId)) && !data.users.includes(chatId)) {
        data.users.push(chatId);
        let newUserMention = `<a href='tg://user?id=${chatId}'>${firstName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</a>`;
        let adminMsg = `🚨 <b>New User Started Bot!</b>\n\n👤 <b>Name:</b> ${newUserMention}\n🆔 <b>Chat ID:</b> <code>${chatId}</code>\n🔗 <b>Username:</b> @${username}`;
        bot.sendMessage(adminId, adminMsg, { parse_mode: 'HTML' });
    }
    data.user_details[chatId] = `${firstName} (@${username})`;
    await saveData(data);

    let state = data.states[chatId] || 'none';

    if (isAdmin) {
        // Broadcast
        if (text.startsWith('/bdc ') || captionText.startsWith('/bdc ')) {
            let msgId = msg.message_id;
            if (data.last_bdc_id === msgId) return;
            data.last_bdc_id = msgId;
            await saveData(data);

            let bdcText = text.startsWith('/bdc ') ? text.substring(5) : captionText.substring(5);
            let bdcPhoto = photo ? photo[photo.length - 1].file_id : null;
            let bdcVideo = video ? video.file_id : null;
            
            let successCount = 0;
            let uniqueUsers = [...new Set(data.users)];
            
            bot.sendMessage(chatId, `⏳ Broadcast starting for ${uniqueUsers.length} users...`);
            for (let uId of uniqueUsers) {
                try {
                    if (bdcPhoto) await bot.sendPhoto(uId, bdcPhoto, { caption: bdcText });
                    else if (bdcVideo) await bot.sendVideo(uId, bdcVideo, { caption: bdcText });
                    else await bot.sendMessage(uId, bdcText);
                    successCount++;
                } catch(e) {}
                await new Promise(r => setTimeout(r, 35));
            }
            bot.sendMessage(chatId, `✅ Broadcast successfully sent to ${successCount} unique users.`);
            return;
        }

        // Admin States
        if (state === 'wait_upi' && text) {
            data.settings.upi = text; data.states[chatId] = 'none'; await saveData(data);
            return bot.sendMessage(chatId, `✅ UPI successfully updated to: ${text}`, { reply_markup: getAdminMenu() });
        }
        if (state === 'wait_username' && text) {
            data.settings.support = text; data.states[chatId] = 'none'; await saveData(data);
            return bot.sendMessage(chatId, `✅ Support username updated to: ${text}`, { reply_markup: getAdminMenu() });
        }
        if (state === 'wait_price_category' && text) {
            if (categoryMap[text]) {
                data.states[chatId] = 'wait_price_val_' + categoryMap[text]; await saveData(data);
                return bot.sendMessage(chatId, `Send the new price for ${text} category (Numbers only):`, { reply_markup: { remove_keyboard: true } });
            } else {
                data.states[chatId] = 'none'; await saveData(data);
                return bot.sendMessage(chatId, "❌ Cancelled.", { reply_markup: getAdminMenu() });
            }
        }
        if (state.startsWith('wait_price_val_') && !isNaN(text)) {
            let cat = state.replace('wait_price_val_', '');
            data.settings[`price_${cat}`] = text; data.states[chatId] = 'none'; await saveData(data);
            let displayName = Object.keys(categoryMap).find(k => categoryMap[k] === cat);
            return bot.sendMessage(chatId, `✅ Price for ${displayName} updated to ₹${text}!`, { reply_markup: getAdminMenu() });
        }
        if (state === 'wait_link_category' && text) {
            if (categoryMap[text]) {
                data.states[chatId] = 'wait_link_val_' + categoryMap[text]; await saveData(data);
                return bot.sendMessage(chatId, `Send the new private channel link for ${text}:`, { reply_markup: { remove_keyboard: true } });
            } else {
                data.states[chatId] = 'none'; await saveData(data);
                return bot.sendMessage(chatId, "❌ Cancelled.", { reply_markup: getAdminMenu() });
            }
        }
        if (state.startsWith('wait_link_val_') && text) {
            let cat = state.replace('wait_link_val_', '');
            data.settings[`link_${cat}`] = text; data.states[chatId] = 'none'; await saveData(data);
            let displayName = Object.keys(categoryMap).find(k => categoryMap[k] === cat);
            return bot.sendMessage(chatId, `✅ Link for ${displayName} successfully updated!`, { reply_markup: getAdminMenu() });
        }
        if (state === 'wait_demo_video' && video) {
            if (!data.demos) data.demos = [];
            data.demos.push(video.file_id); data.states[chatId] = 'none'; await saveData(data);
            return bot.sendMessage(chatId, "✅ Demo video added successfully!", { reply_markup: getAdminMenu() });
        }
        if (state === 'wait_premium_image' && photo) {
            data.settings.premium_image = photo[photo.length - 1].file_id; data.states[chatId] = 'none'; await saveData(data);
            return bot.sendMessage(chatId, "✅ Premium selection image updated successfully!", { reply_markup: getAdminMenu() });
        }
        if (state === 'wait_how_to_video' && video) {
            data.settings.how_to_video = video.file_id; data.states[chatId] = 'none'; await saveData(data);
            return bot.sendMessage(chatId, "✅ 'How To Get Premium' video updated successfully!", { reply_markup: getAdminMenu() });
        }

        // Admin Menus
        if (text === 'Change UPI') { data.states[chatId] = 'wait_upi'; await saveData(data); return bot.sendMessage(chatId, "Send the new UPI ID:"); }
        if (text === 'Change Username') { data.states[chatId] = 'wait_username'; await saveData(data); return bot.sendMessage(chatId, "Send new support username (e.g., @newname):"); }
        if (text === 'Change Price') {
            data.states[chatId] = 'wait_price_category'; await saveData(data);
            let kb = { keyboard: [[{ text: 'Indian' }, { text: 'R@p' }], [{ text: 'Child' }, { text: 'All' }]], resize_keyboard: true };
            return bot.sendMessage(chatId, "Which category price do you want to change?", { reply_markup: kb });
        }
        if (text === 'Add Links') {
            data.states[chatId] = 'wait_link_category'; await saveData(data);
            let kb = { keyboard: [[{ text: 'Indian' }, { text: 'R@p' }], [{ text: 'Child' }, { text: 'All' }]], resize_keyboard: true };
            return bot.sendMessage(chatId, "Which category link do you want to set?", { reply_markup: kb });
        }
        if (text === 'Add Demo Video') { data.states[chatId] = 'wait_demo_video'; await saveData(data); return bot.sendMessage(chatId, "Send the video you want to add as a demo now:"); }
        if (text === 'Remove Demo') {
            if (!data.demos || data.demos.length === 0) return bot.sendMessage(chatId, "No demo videos currently available.");
            for (let i = 0; i < data.demos.length; i++) {
                let kb = { inline_keyboard: [[{ text: '❌ Delete Demo', callback_data: `deldemo_${i}` }]] };
                await bot.sendVideo(chatId, data.demos[i], { caption: `Demo Video #${i + 1}`, reply_markup: kb });
            }
            return;
        }
        if (text === 'Change Premium Image') { data.states[chatId] = 'wait_premium_image'; await saveData(data); return bot.sendMessage(chatId, "Send the new image for the Premium Section now:"); }
        if (text === 'Process Link Video') { data.states[chatId] = 'wait_how_to_video'; await saveData(data); return bot.sendMessage(chatId, "Send the video for 'How to Get Premium' now:"); }
        if (text === 'Check Users List') {
            let count = Object.keys(data.user_details).length;
            await bot.sendMessage(chatId, `📊 **Total Bot Users:** ${count}\n\n_Generating JSON file format..._`, { parse_mode: 'Markdown' });
            let jsonList = JSON.stringify(data.user_details, null, 2);
            let chunks = jsonList.match(/[\s\S]{1,3900}/g) || [];
            for (let chunk of chunks) await bot.sendMessage(chatId, `\`\`\`json\n${chunk}\n\`\`\``, { parse_mode: 'Markdown' });
            return;
        }
        if (text === 'Check History') {
            let appr = data.history.approved || 0; let rej = data.history.rejected || 0;
            return bot.sendMessage(chatId, `📈 **Payment History:**\n✅ Approved: ${appr}\n❌ Rejected: ${rej}`, { parse_mode: 'Markdown' });
        }
    }

    // User State: Screenshot
    if (state === 'wait_screenshot' && photo) {
        let photoId = photo[photo.length - 1].file_id;
        data.states[chatId] = 'none';
        let replyText = `⏳ Screenshot has been sent for approval\n\nYou will get private channel link within 20 minutes\n\nContact support ${data.settings.support} ✅`;
        await bot.sendPhoto(chatId, 'https://i.ibb.co/ymm1Pvsv/x.png', { caption: replyText });

        let adminCaption = `📢 New Payment Verification\n\n👤 User: ${firstName} (@${username})\n🆔 ID: ${chatId}\n\nApprove or Reject?`;
        let adminKb = { inline_keyboard: [[{ text: '✅ Approve', callback_data: `approve_${chatId}` }, { text: '❌ Reject', callback_data: `reject_${chatId}` }]] };
        await bot.sendPhoto(adminId, photoId, { caption: adminCaption, reply_markup: adminKb });
        await saveData(data);
        return;
    }

    // Commands
    if (text === '/start') {
        if (isAdmin) {
            let adminText = "Welcome Admin\nBot developed by @nglynx";
            return bot.sendMessage(chatId, adminText, { reply_markup: getAdminMenu() });
        } else {
            let userText = "Available Videos Collection?\n\n1. Mom Son videos - 5000+\n2. Sister Brother videos -2000+\n3. Cp kids videos - 15000+\n4. R@pe & Force videos-3000+\n5. Teen Girl. Videos - 6000+\n6. Indian Desi videos - 10000+\n7. Hidden cam videos - 2000+";
            let inlineKb = { inline_keyboard: [[{ text: '💎 Get Premium', callback_data: 'get_premium' }], [{ text: '🥵 Demo Videos', callback_data: 'view_demos' }], [{ text: '✅ How To Get Premium', callback_data: 'how_to' }]] };
            let replyKb = { keyboard: [[{ text: '💎 Get Premium' }], [{ text: 'PAYMENT DONE ✅' }]], resize_keyboard: true };
            
            await bot.sendPhoto(chatId, 'https://i.ibb.co/d4Ffygs4/x.jpg', { caption: userText, reply_markup: inlineKb });
            return bot.sendMessage(chatId, "👇 Menu 👇", { reply_markup: replyKb });
        }
    }

    if (text === '/help' && isAdmin) {
        let helpText = "🛠 **Admin Commands & Tools:**\n\n🔹 **Change UPI:** Update the UPI ID where payments are sent.\n🔹 **Change Username:** Update the @support username shown to users.\n🔹 **Change Price / Add Links:** Modify prices and add unique channel links for different category packs.\n🔹 **Change Premium Image:** Customize the image shown on the 'Get Premium' menu.\n🔹 **Add / Remove Demo:** Manage videos in the demo section.\n🔹 **Check Users List:** See detailed list of users in JSON.\n🔹 **Check History:** See total approved and rejected payments.\n🔹 **/bdc <msg>:** Broadcast a message (or image/video with caption) to all users.";
        return bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
    }

    if (text === '💎 Get Premium') return sendPremiumCategories(chatId, data);
    if (text === 'PAYMENT DONE ✅') return askForScreenshot(chatId, data);
});

// --- Callback Queries ---
bot.on('callback_query', async (query) => {
    bot.answerCallbackQuery(query.id);
    let dataStr = query.data;
    let chatId = query.message.chat.id.toString();
    let messageId = query.message.message_id;
    let data = await getData();

    if (dataStr === 'get_premium') return sendPremiumCategories(chatId, data);

    if (dataStr === 'how_to') {
        if (data.settings.how_to_video) {
            return bot.sendVideo(chatId, data.settings.how_to_video, { caption: "✅ **How To Get Premium / Process Link**\nWatch this video to understand the process.", parse_mode: 'Markdown' });
        } else {
            return bot.sendMessage(chatId, "Video is not available right now. Please contact support.");
        }
    }

    if (dataStr === 'view_demos') {
        if (!data.demos || data.demos.length === 0) return bot.sendMessage(chatId, "No demo videos available right now.");
        for (let vid of data.demos) {
            let kb = { inline_keyboard: [[{ text: '👉 Get Premium', callback_data: 'get_premium' }]] };
            await bot.sendVideo(chatId, vid, { caption: "🎬 This video is only for demo\n💎 Click Get Premium for VIP channels access", reply_markup: kb });
        }
        return;
    }

    if (dataStr.startsWith('deldemo_')) {
        let index = parseInt(dataStr.replace('deldemo_', ''));
        if (data.demos && data.demos[index] !== undefined) {
            data.demos.splice(index, 1);
            await saveData(data);
            return bot.editMessageCaption("✅ Demo video deleted!", { chat_id: chatId, message_id: messageId });
        }
    }

    if (dataStr.startsWith('pay_')) {
        let cat = dataStr.replace('pay_', '');
        let upi = data.settings.upi;
        let price = data.settings[`price_${cat}`] || "199";
        
        let payText = `🏷️ 𝐏𝐫𝐢𝐜𝐞: ₹${price}\n\n⏳ 𝐓𝐢𝐦𝐞 𝐋𝐞𝐟𝐭: 02:00\n\n1️⃣ 𝐒𝐜𝐚𝐧  |  2️⃣ 𝐏𝐚𝐲  |  3️⃣ 𝐂𝐥𝐢𝐜𝐤 ' PAYMENT DONE '`;
        let qrData = encodeURIComponent(`upi://pay?pa=${upi}&pn=Premium&am=${price}&cu=INR`);
        let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=35&data=${qrData}`;

        let kb = { inline_keyboard: [[{ text: 'PAYMENT DONE SEND SCREENSHOT ✅', callback_data: 'ask_screenshot' }]] };
        await bot.sendPhoto(chatId, qrUrl, { caption: payText, reply_markup: kb });

        let packName = Object.keys(categoryMap).find(key => categoryMap[key] === cat) || cat.charAt(0).toUpperCase() + cat.slice(1);
        let userMention = `<a href='tg://user?id=${chatId}'>User</a>`;
        let qrAlertAdmin = `🔔 <b>New QR Code Requested!</b>\n\n👤 <b>User:</b> ${userMention}\n🆔 <b>Chat ID:</b> <code>${chatId}</code>\n📦 <b>Pack Clicked:</b> ${packName}`;
        bot.sendMessage(adminId, qrAlertAdmin, { parse_mode: 'HTML' });

        let waitList = await getWaiting();
        waitList[chatId] = { time: Math.floor(Date.now() / 1000), pack: cat, price: price };
        await saveWaiting(waitList);
        return;
    }

    if (dataStr.startsWith('specialoffer_')) {
        let parts = dataStr.split('_');
        let cat = parts[1]; let discPrice = parts[2];
        let upi = data.settings.upi;
        
        let payText = `🎁 <b>SPECIAL OFFER APPLIED!</b> 🎁\n\n🏷️ 𝐏𝐫𝐢𝐜𝐞: ₹${discPrice}\n\n⏳ 𝐓𝐢𝐦𝐞 𝐋𝐞𝐟𝐭: 02:00\n\n1️⃣ 𝐒𝐜𝐚𝐧  |  2️⃣ 𝐏𝐚𝐲  |  3️⃣ 𝐂𝐥𝐢𝐜𝐤 ' PAYMENT DONE '`;
        let qrData = encodeURIComponent(`upi://pay?pa=${upi}&pn=Premium&am=${discPrice}&cu=INR`);
        let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=35&data=${qrData}`;

        let kb = { inline_keyboard: [[{ text: 'PAYMENT DONE SEND SCREENSHOT ✅', callback_data: 'ask_screenshot' }]] };
        await bot.sendPhoto(chatId, qrUrl, { caption: payText, parse_mode: 'HTML', reply_markup: kb });
        
        let waitList = await getWaiting();
        if (waitList[chatId]) { delete waitList[chatId]; await saveWaiting(waitList); }
        return;
    }

    if (dataStr === 'ask_screenshot') return askForScreenshot(chatId, data);

    if (dataStr.startsWith('approve_')) {
        let userId = dataStr.replace('approve_', '');
        let kb = { inline_keyboard: [
            [{ text: 'Indian Link', callback_data: `sendlink_indian_${userId}` }],
            [{ text: 'R@p Link ', callback_data: `sendlink_premium_${userId}` }],
            [{ text: 'Child Link', callback_data: `sendlink_movies_${userId}` }],
            [{ text: 'All in One Link', callback_data: `sendlink_all_${userId}` }]
        ]};
        await bot.editMessageCaption("✅ Payment Approved. Which link to send?", { chat_id: chatId, message_id: messageId, reply_markup: kb });
        data.history.approved = (data.history.approved || 0) + 1;
        await saveData(data);
        return;
    }

    if (dataStr.startsWith('reject_')) {
        let userId = dataStr.replace('reject_', '');
        let rejectText = `❌ YOUR PAYMENT WAS FAILED\nInvalid payment or fake payment\nContact support: ${data.settings.support}`;
        await bot.sendPhoto(userId, 'https://i.ibb.co/h147XCFh/x.png', { caption: rejectText });
        await bot.editMessageCaption(`❌ Payment Rejected for ${userId}.`, { chat_id: chatId, message_id: messageId });
        data.history.rejected = (data.history.rejected || 0) + 1;
        await saveData(data);
        return;
    }

    if (dataStr.startsWith('sendlink_')) {
        let parts = dataStr.split('_');
        let pack = parts[1]; let userId = parts[2];
        let link = data.settings[`link_${pack}`] || "https://t.me/fallback_link";
        let displayName = Object.keys(categoryMap).find(key => categoryMap[key] === pack) || pack.charAt(0).toUpperCase() + pack.slice(1);
        
        let successText = `✅ YOUR PAYMENT IS SUCCESSFULLY APPROVED\n\nClick below link to join private channel\n\nPack: ${displayName}\nLink: ${link}\nContact support ${data.settings.support}`;
        await bot.sendPhoto(userId, 'https://i.ibb.co/Dfz7CSMV/x.png', { caption: successText });
        await bot.editMessageCaption(`✅ Link sent to user ${userId}.`, { chat_id: chatId, message_id: messageId });
        return;
    }
});

// --- Helper Functions Logic ---
async function sendPremiumCategories(chatId, data) {
    let img = data.settings.premium_image || 'https://i.ibb.co/9x38myC/x.jpg';
    let kb = { inline_keyboard: [
        [{ text: '👉 INDIAN VIDEOS 👈', callback_data: 'pay_indian' }],
        [{ text: '🤤 R@P VIDEOS 🤤', callback_data: 'pay_premium' }],
        [{ text: '👄 CHILD VIDEOS (50k+)😵', callback_data: 'pay_movies' }],
        [{ text: '🥵 ALL IN ONE 50+ GROUPS ✅', callback_data: 'pay_all' }]
    ]};
    await bot.sendPhoto(chatId, img, { reply_markup: kb });
}

async function askForScreenshot(chatId, data) {
    let waitList = await getWaiting();
    if (waitList[chatId]) { delete waitList[chatId]; await saveWaiting(waitList); }
    
    data.states[chatId] = 'wait_screenshot'; await saveData(data);
    await bot.sendMessage(chatId, "📸 𝙎𝙀𝙉𝘿 𝙎𝘾𝙍𝙀𝙀𝙉𝙎𝙃𝙊𝙏 𝙊𝙁 𝙔𝙊𝙐𝙍 𝙋𝘼𝙔𝙈𝙀𝙉𝙏 𝙁𝙊𝙍 𝙂𝙀𝙏 𝙋𝙍𝙀𝙈𝙄𝙐𝙈");
}

bot.on('polling_error', (error) => console.log(error.message));
