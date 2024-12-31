const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();

// Initialize SQLite database
const db = new sqlite3.Database("user.db");

// Replace with your bot token
const token = "8135815480:AAGMUtV5zkIfLex6d4tbJCD937-HICBawRU";
const bot = new TelegramBot(token, { polling: true });

// Replace with actual owner chat ID
const ownerChatId = 6024267485;
const adminChatIds = [];
const API_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1dWlkIjoiTXpVek5EQT0iLCJ0eXBlIjoicHJvamVjdCIsInYiOiI0YTI2MmQ2ODIyYTkwY2I5ZWYyYWFmNDBiNjhlZWM1ZTQzZmIzYWYxMWUyY2ZhYmI0NWQ3NGU0NjQ4YmNlZmUyIiwiZXhwIjo4ODEzNTUzOTMwNn0.Lbvb_KQshQoO8JIiLlTIYm7Rq9IJILXTsr3n0IaK2DE";

// Helper function to send messages to the owner
const notifyOwner = (message) => {
    bot.sendMessage(ownerChatId, message, { parse_mode: "HTML" });
};

function addColumnIfNotExists(db, tableName, columnName, columnType) {
    db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
        if (err) {
            console.error(`Error fetching table info: ${err.message}`);
            return;
        }

        const columnExists = columns.some(column => column.name === columnName);
        if (!columnExists) {
            db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`, (err) => {
                if (err) {
                    console.error(`Error adding column ${columnName}: ${err.message}`);
                } else {
                    console.log(`Column ${columnName} added successfully.`);
                }
            });
        }
    });
}

// Database initialization
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id INTEGER UNIQUE,
            username TEXT,
            balance REAL DEFAULT 0,
            sender_licenses_remaining INTEGER DEFAULT 0,
            email_wizard_licenses_remaining INTEGER DEFAULT 0,
            sorter_licenses_remaining INTEGER DEFAULT 0,
            Blue_Sqli_licenses_remaining INTEGER DEFAULT 0,
            Dorkgen_licenses_remaining INTEGER DEFAULT 0
        )
    `, (err) => {
        if (err) {
            console.error("Error creating users table:", err.message);
        } else {
            console.log("Users table created or already exists.");

            // Add missing columns if they don't exist
            addColumnIfNotExists(db, "users", "sender_licenses_remaining", "INTEGER DEFAULT 0");
            addColumnIfNotExists(db, "users", "email_wizard_licenses_remaining", "INTEGER DEFAULT 0");
            addColumnIfNotExists(db, "users", "sorter_licenses_remaining", "INTEGER DEFAULT 0");
            addColumnIfNotExists(db, "users", "Blue_Sqli_licenses_remaining", "INTEGER DEFAULT 0");
            addColumnIfNotExists(db, "users", "Dorkgen_licenses_remaining", "INTEGER DEFAULT 0");
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT,
            file_data BLOB,
            category TEXT
        )
    `, (err) => {
        if (err) {
            console.error("Error creating uploads table:", err.message);
        } else {
            console.log("Uploads table created or already exists.");
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id INTEGER,
            invoice_id TEXT,
            amount REAL,
            status TEXT DEFAULT 'pending'
        )
    `, (err) => {
        if (err) {
            console.error("Error creating payments table:", err.message);
        } else {
            console.log("Payments table created or already exists.");
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS admins (
            chat_id INTEGER PRIMARY KEY
        )
    `, (err) => {
        if (err) {
            console.error("Error creating admins table:", err.message);
        } else {
            console.log("Admins table created or already exists.");
        }
    });
});

// Utility functions
const addBackButton = (options) => {
    options.reply_markup.inline_keyboard.push([{ text: "🔙 Back", callback_data: "back" }]);
    return options;
};

const addBuyButton = (options) => {
    options.reply_markup.inline_keyboard.push([{ text: "🛒 Buy", callback_data: "buy" }]);
    return options;
};

// Menu options
const mainMenuOptions = (chatId) => ({
    reply_markup: {
        inline_keyboard: [
            [{ text: "💰 Add Balance", callback_data: "add_balance" }],
            [{ text: "🔐 Buy Activation License", callback_data: "buy" }],
            [{ text: "🔑 Generate License", callback_data: "generate_license" }],
            [{ text: "🗄 Download Tool", callback_data: "download" }],
            [{ text: "👤 My Info", callback_data: "my_info" }],
            [{ text: "📚 Tutorial", callback_data: "tutorial" }],
            [{ text: "📄 Pricelist", callback_data: "about" }],
            [{ text: "🔔 Join My Channel", url: "#" }],
            [{ text: "📨 SMTP Store", url: "#t" }],
            [{ text: "👨‍💼 Contact Support", url: "#" }],
        ],
    },
});

const tutorialOptions = addBackButton({
    reply_markup: {
        inline_keyboard: [
            [{ text: "Sender 📤", url: "#" }],
            [{ text: "Email Wizard [B2B Sender] 🔍", url: "#" }]
        ],
    },
});

const buyOptions = addBackButton({
    reply_markup: {
        inline_keyboard: [
            [{ text: "Sender 📤", callback_data: "buy_sender" }],
            [{ text: "Email Wizard [B2B Sender] 🔍", callback_data: "buy_email_wizard" }],
            [{ text: "Sort 🗂️", callback_data: "buy_sorter" }],
            [{ text: "Blue Sqli 💻", callback_data: "buy_Blue_Sqli" }],
            [{ text: "Dorkgen 🧙‍♂️", callback_data: "buy_Dorkgen" }],
        ],
    },
});

const downloadOptions = addBackButton({
    reply_markup: {
        inline_keyboard: [
            [{ text: "Sender 📤", callback_data: "download_sender" }],
            [{ text: "Email Wizard [B2B Sender] 🔍", callback_data: "download_email_wizard" }],
            [{ text: "Sorter 🗂️", callback_data: "download_sorter" }],
            [{ text: "Blue Sqli 🌐", callback_data: "download_Blue_Sqli" }],
            [{ text: "Dorkgen 🧙‍♂️", callback_data: "download_Dorkgen" }],
        ],
    },
});

const generateOptions = addBackButton({
    reply_markup: {
        inline_keyboard: [
            [{ text: "Sender 📤", callback_data: "generate_sender" }],
            [{ text: "Email Wizard [B2B Sender] 🔍", callback_data: "generate_email_wizard" }],
            [{ text: "Sorter 🗂️", callback_data: "generate_sorter" }],
            [{ text: "Blue Sqli 🌐", callback_data: "generate_Blue_Sqli" }],
            [{ text: "Dorkgen 🧙‍♂️", callback_data: "generate_Dorkgen" }],
        ],
    },
});

const ownerOptions = addBackButton({
    reply_markup: {
        inline_keyboard: [
            [{ text: "Manage User 👥", callback_data: "manage_user" }],
            [{ text: "Increase Balance ➕💰", callback_data: "increase_balance" }],
            [{ text: "Remove Balance ➖💰", callback_data: "remove_balance" }],
            [{ text: "Transfer Tools 🔄", callback_data: "transfer_tools" }],
            [{ text: "Add User Tool ➕🔧", callback_data: "add_user" }],
            [{ text: "Upload Tool 📤", callback_data: "upload_tool" }],
            [{ text: "List Files 🗃", callback_data: "list_files" }],
            [{ text: "Remove File 🗑", callback_data: "remove_file_prompt" }],
            [{ text: "Remove User Tool ➖🔧", callback_data: "remove_user_tool" }],
            [{ text: "Ban User 🚫", callback_data: "ban_user" }], // New Ban User button
            [{ text: "Stats 📊", callback_data: "stats" }],
            [{ text: "Newsletter 📰", callback_data: "newsletter" }],
        ],
    },
});

const adminOptions = addBackButton({
    reply_markup: {
        inline_keyboard: [
            [{ text: "Manage User 👥", callback_data: "manage_user" }],
            [{ text: "Increase Balance ➕💰", callback_data: "increase_balance" }],
            [{ text: "Remove Balance ➖💰", callback_data: "remove_balance" }],
            [{ text: "Transfer Tools 🔄", callback_data: "transfer_tools" }],
            [{ text: "Add User Tool ➕🔧", callback_data: "add_user" }],
            [{ text: "Remove User Tool ➖🔧", callback_data: "remove_user_tool" }],
            [{ text: "Newsletter 📰", callback_data: "newsletter" }],
        ],
    },
});

const uploadToolOptions = addBackButton({
    reply_markup: {
        inline_keyboard: [
            [{ text: "Sender 📤", callback_data: "upload_sender" }],
            [{ text: "Email Wizard [B2B Sender] 🔍", callback_data: "upload_email_wizard" }],
            [{ text: "Sorter 🗂️", callback_data: "upload_sorter" }],
            [{ text: "Blue Sqli🌐", callback_data: "upload_Blue_Sqli" }],
            [{ text: "Dorkgen 🧙‍♂️", callback_data: "upload_Dorkgen" }],
        ],
    },
});

const addBalanceOptions = addBackButton({
    reply_markup: {
        inline_keyboard: [
            [{ text: "Add Balance 💰", callback_data: "add_balance" }]
        ]
    }
});

// Bot commands
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.chat.username || 'N/A';
    const firstName = msg.chat.first_name || 'N/A';
    const lastName = msg.chat.last_name || 'N/A';

    db.get("SELECT chat_id FROM users WHERE chat_id = ?", [chatId], (err, row) => {
        if (err) {
            console.error("Error checking user:", err.message);
            bot.sendMessage(chatId, "⚠️ An error occurred while processing your request.");
        } else if (row) {
            console.log(`User ${username} (${chatId}) already exists in the database.`);
        } else {
            db.run("INSERT INTO users (chat_id, username) VALUES (?, ?)", [chatId, username], (err) => {
                if (err) {
                    console.error("Error inserting user:", err.message);
                } else {
                    console.log(`User ${username} (${chatId}) added to the database.`);
                    notifyOwner(`A new user starts bot\nUsername: ${username}\nFirst Name: ${firstName}\nLast Name: ${lastName}\nChat ID: ${chatId}`);
                }
            });
        }
    });

    bot.sendMessage(chatId, `👋 Welcome ${username}, Please choose an option:`, mainMenuOptions(chatId));
});

bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    db.get("SELECT chat_id FROM admins WHERE chat_id = ?", [chatId], (err, row) => {
        if (err) {
            console.error("Error checking admin:", err.message);
        }
        if (chatId === ownerChatId || row) {
            bot.sendMessage(chatId, "🔐 Welcome to the admin panel. Select an option:", adminOptions);
        } else {
            bot.sendMessage(chatId, "🚫 Unauthorized access.");
        }
    });
});

bot.onText(/\/owner/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId === ownerChatId) {
        bot.sendMessage(chatId, "🔐 Welcome to the owner panel. Select an option:", ownerOptions);
    } else {
        bot.sendMessage(chatId, "🚫 Unauthorized access.");
    }
});

bot.onText(/\/add_admin/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId === ownerChatId) {
        bot.sendMessage(chatId, "Please enter the chat ID of the new admin:").then(() => {
            bot.once("message", (msg) => {
                if (msg.chat.id === chatId) {
                    const newAdminId = parseInt(msg.text, 10);
                    db.run("INSERT OR IGNORE INTO admins (chat_id) VALUES (?)", [newAdminId], (err) => {
                        if (err) {
                            console.error("Error adding admin:", err.message);
                            bot.sendMessage(chatId, `⚠️ Error adding admin: ${err.message}`);
                        } else {
                            console.log(`Admin ${newAdminId} added to the database.`);
                            bot.sendMessage(chatId, `✅ Chat ID ${newAdminId} has been added as an admin.`, addBackButton({ reply_markup: { inline_keyboard: [] } }));
                        }
                    });
                }
            });
        });
    } else {
        bot.sendMessage(chatId, "🚫 Unauthorized access.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
    }
});

bot.onText(/\/remove_admins/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId === ownerChatId) {
        db.all("SELECT chat_id FROM admins", (err, rows) => {
            if (err) {
                bot.sendMessage(chatId, `⚠️ Error retrieving admins: ${err.message}`);
            } else if (rows.length > 0) {
                const adminList = rows.map(row => ({ text: row.chat_id.toString(), callback_data: `remove_admin_${row.chat_id}` }));
                const removeAdminOptions = addBackButton({
                    reply_markup: {
                        inline_keyboard: adminList.map(admin => [admin]),
                    },
                });
                bot.sendMessage(chatId, "Select an admin to remove:", removeAdminOptions);
            } else {
                bot.sendMessage(chatId, "❌ There are no admins added yet.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
            }
        });
    } else {
        bot.sendMessage(chatId, "🚫 Unauthorized access.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
    }
});

bot.onText(/\/list_admins/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId === ownerChatId) {
        db.all("SELECT chat_id FROM admins", (err, rows) => {
            if (err) {
                bot.sendMessage(chatId, `⚠️ Error retrieving admins: ${err.message}`);
            } else if (rows.length > 0) {
                const adminList = rows.map(row => row.chat_id).join(", ");
                bot.sendMessage(chatId, `👥 Current admins: ${adminList}`, addBackButton({ reply_markup: { inline_keyboard: [] } }));
            } else {
                bot.sendMessage(chatId, "❌ There are no admins added yet.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
            }
        });
    } else {
        bot.sendMessage(chatId, "🚫 Unauthorized access.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
    }
});

bot.onText(/\/remove_file/, (msg, match) => {
    const chatId = msg.chat.id;
    const fileId = parseInt(match.input.split(' ')[1], 10);

    if (isNaN(fileId)) {
        db.all("SELECT id, file_name, category FROM uploads", (err, rows) => {
            if (err) {
                bot.sendMessage(chatId, `⚠️ Error retrieving file list: ${err.message}`);
            } else if (rows.length > 0) {
                const fileList = rows
                    .map((row) => `🆔 ID: ${row.id}, 📄 File: ${row.file_name}, 🗂️ Category: ${row.category}`)
                    .join("\n");
                bot.sendMessage(chatId, `Available files:\n${fileList}\n\nUse /remove_file <ID> to remove a file.`, addBackButton({ reply_markup: { inline_keyboard: [] } }));
            } else {
                bot.sendMessage(chatId, "❌ No files uploaded yet.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
            }
        });
    } else {
        db.get("SELECT file_name FROM uploads WHERE id = ?", [fileId], (err, row) => {
            if (err) {
                bot.sendMessage(chatId, `⚠️ Error retrieving file: ${err.message}`);
            } else if (row) {
                db.run("DELETE FROM uploads WHERE id = ?", [fileId], (dbErr) => {
                    if (dbErr) {
                        bot.sendMessage(chatId, `⚠️ Error deleting file from database: ${dbErr.message}`);
                    } else {
                        bot.sendMessage(chatId, `✅ File ID ${fileId} deleted successfully.`, addBackButton({ reply_markup: { inline_keyboard: [] } }));
                    }
                });
            } else {
                bot.sendMessage(chatId, "❌ File not found.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
            }
        });
    }
});

bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    // Messages to exclude from deletion
    const nonDeletableMessages = ["check_payment_status_", "pay"];

    // Only delete messages that are not in the nonDeletableMessages list
    if (!nonDeletableMessages.some(ndm => data.includes(ndm))) {
        try {
            await bot.deleteMessage(chatId, messageId);
        } catch (error) {
            console.error(`Failed to delete message ${messageId} for chat ${chatId}:`, error.response ? error.response.data : error.message);
        }
    }

    if (data.startsWith("check_payment_status_")) {
        const invoiceId = data.split('_').pop();
        checkPaymentStatus(chatId, invoiceId);
    } else if (data.startsWith("remove_admin_")) {
        const adminIdToRemove = parseInt(data.split("_")[2], 10);
        db.run("DELETE FROM admins WHERE chat_id = ?", [adminIdToRemove], (err) => {
            if (err) {
                bot.sendMessage(chatId, `⚠️ Error removing admin: ${err.message}`);
            } else {
                bot.sendMessage(chatId, `✅ Admin ID ${adminIdToRemove} has been removed.`, addBackButton({ reply_markup: { inline_keyboard: [] } }));
            }
        });
    } else if (data === "ban_user") {
        promptBanUser(chatId);  // Call the function to prompt for banning a user
    } else {
        handleCallbackData(chatId, data);
    }
});

// Handle callback data for bot commands
const handleCallbackData = (chatId, data) => {
    switch (data) {
        case "back":
            bot.sendMessage(chatId, `🔙 Welcome Back, Please choose an option:`, mainMenuOptions(chatId));
            break;
        case "manage_user":
            manageUser(chatId);
            break;
        case "increase_balance":
            increaseBalance(chatId);
            break;
        case "remove_balance":
            removeBalance(chatId);
            break;
        case "transfer_tools":
            transferTools(chatId);
            break;
        case "remove_user_tool":
            removeUserTool(chatId);
            break;
        case "generate_license":
            bot.sendMessage(chatId, "🔑 Choose which license to generate:", generateOptions);
            break;
        case "generate_sender":
            generateLicense(chatId, "sender");
            break;
        case "generate_email_wizard":
            generateLicense(chatId, "email_wizard");
            break;
        case "generate_sorter":
            generateLicense(chatId, "sorter");
            break;
        case "generate_Blue_Sqli":
            generateLicense(chatId, "Blue_Sqli");
            break;
            case "generate_Dorkgen":
                generateLicense(chatId, "Dorkgen");
                break;
        case "buy":
            bot.sendMessage(chatId, "🛒 You selected Buy. Select an option:", buyOptions);
            break;
        case "download":
            bot.sendMessage(chatId, "🗄 Select an option:", downloadOptions);
            break;
        case "about":
            bot.sendMessage(chatId, "💼 *Blue Node Mailer*: $400 - 5 tokens\n📂 *Office 365 Email Sorter*: $200 - 5 tokens\n🔍 *Email Wizard*: $400 - 5 tokens\n🔧 *Dorkgen*: $150 - 5 tokens\n🔐 *Blue SQLi*: $400 - 5 tokens\n\nSUPPORT:@BLUE_SUPPORTx\nOwner:@bluexdemon", addBackButton({ reply_markup: { inline_keyboard: [] } }));
            break;
        case "my_info":
            showUserInfo(chatId);
            break;
        case "buy_sender":
            bot.sendMessage(chatId, "💸 Buy sender selected. Choose a price:", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "💵 5 Sender Licenses - $400", callback_data: "price_2_sender" }],
                        [{ text: "🔙 Back", callback_data: "back" }]
                    ]
                }
            });
            break;
        case "buy_email_wizard":
            bot.sendMessage(chatId, "📂 Email Wizard\n📊 Uses Microsoft Graph\n\n👤 Profile Maker ➥ 📝 Creates a profile for each email you log in to\n\n🔗 Links Extractor ➥ 🌐 Extracts domains, Query URLs, and sorts possible Open redirects.. with many options\n🚨 The possible Open redirects to be used with the open redirect scanner\n\n✉️ Emails Extractor ➥ 📧 Extracts Emails\n\n👂 Listen ➥ 📡 Monitors boxes in real time and notifies when a message is received containing specific keyword(s)\n🔔 Can grab the body and attachments, and notify in the console, email, or telegram\n\n🔍 Keyword Search ➥ 🔑 Searches for specific keyword anywhere\n📅 Can specify the date range and generates a file with all matched messages\n\n📨 B2B Sending ➥ 📬 Sends campaigns using the email profile created to send emails to the email contacts\n📎 Sends HTML attachment, PDF attachment, generates a new IP for each sending, and more\n\n🌍 Proxies are inbuilt....\n\nPreview here: https://ibb.co/nRSr9qT \n\n💸 Buy Email Wizard selected. Choose a price:", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "💵 5 Email Wizard Licenses - $400", callback_data: "price_2_email_wizard" }],
                        [{ text: "🔙 Back", callback_data: "back" }]
                    ]
                }
            });
            break;
        case "buy_sorter":
            bot.sendMessage(chatId, "✅ Email Checking ➥ 📧 Checks the whole email with the username, not just the domain (for Office emails only)\n\n🗂️ Sorting ➥ 📊 Sorts by ADFS, Godaddy, Okta Office, Office Exchange, IONOS, Amazon, Strato, Rackspace, GMX, Gsuite, Mimecast, Namecheap, Outlook, Serverdata, Zoho, Others\n\n🚫 Proxyless Mode ➥ 🔄 Can work without proxies\n\n🔧 Customization ➥ 🔢 Can set the number of threads\n\n🤖 Debouncing ➥ 🔄 You can debounce with our debounce bot @BlueBounce_bot\n\n Preview here: https://ibb.co/9W6LScJ \n\n 💸 Buy Sorter selected. Choose a price:", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "💵 5 Sorter Licenses - $200", callback_data: "price_2_sorter" }],
                        [{ text: "🔙 Back", callback_data: "back" }]
                    ]
                }
            });
            break;
        case "buy_Blue_Sqli":
            bot.sendMessage(chatId, " 🚀 Fastest URL Scrapper ➥ 🌐 Works with Google, Yahoo, Startpage, Nona, WOW, and GOO\n⚡ Faster than Sqli Dumper and collects 10x more URLs\n📊 Collects thousands of high-quality URLs in minutes\n🔄 Skips duplicates and collects only URLs, no domains\n🔗 Collects possible open redirects\n\n🛠️ Proxy Features ➥ 🌍 Proxies are inbuilt...\n\n🔧🔢 Number of threads for each scrapper can be adjusted\n\nPreview here: https://ibb.co/m5KVnMs \n\n💸 Buy Blue Sqli selected. Choose a price:", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "💵 5 Blue Sqli Licenses - $400", callback_data: "price_2_Blue_Sqli" }],
                        [{ text: "🔙 Back", callback_data: "back" }]
                    ]
                }
            });
            break;
            case "buy_Dorkgen":
                bot.sendMessage(chatId, " 🖱️ One-Click Solution ➥ 🔄 No need to understand dorks or follow any steps, just one click is enough\n\n⚙️ Automated Dorks Generator ➥ 📊 Fully automated dorks generator\n\n📈 Different Levels ➥ 🔄 Can create basic, advanced, and expert dorks\n\n🔑 Keyword Generator ➥ 📋 Can gather or create high-quality keywords\n\nPreview here: https://ibb.co/RTtc3cK \n\n💸 Buy Blue Dockgen selected. Choose a price:", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "💵 5 Dorkgen Licenses - $150", callback_data: "price_2_Dorkgen" }],
                            [{ text: "🔙 Back", callback_data: "back" }]
                        ]
                    }
                });
            break;
        case "price_1_sender":
            handlePurchase(chatId, 150, 1, "sender");
            break;
        case "price_2_sender":
            handlePurchase(chatId, 400, 5, "sender");
            break;
        case "price_1_email_wizard":
            handlePurchase(chatId, 150, 1, "email_wizard");
            break;
        case "price_2_email_wizard":
            handlePurchase(chatId, 400, 5, "email_wizard");
            break;
        case "price_1_sorter":
            handlePurchase(chatId, 100, 1, "sorter");
            break;
        case "price_2_sorter":
            handlePurchase(chatId, 200, 5, "sorter");
            break;
        case "price_1_Blue_Sqli":
            handlePurchase(chatId, 100, 1, "Blue_Sqli");
            break;
        case "price_2_Blue_Sqli":
            handlePurchase(chatId, 400, 5, "Blue_Sqli");
            break;
            case "price_2_Dorkgen":
                handlePurchase(chatId, 150, 5, "Dorkgen");
                break;
        case "upload_tool":
            if (chatId === ownerChatId) {
                bot.sendMessage(chatId, "📤 Select upload option:", uploadToolOptions);
            } else {
                bot.sendMessage(chatId, "🚫 Only the owner can upload tools.");
            }
            break;
        case "upload_sender":
            handleFileUpload(chatId, "Sender");
            break;
        case "upload_email_wizard":
            handleFileUpload(chatId, "Email Wizard [B2B Sender]");
            break;
        case "upload_sorter":
            handleFileUpload(chatId, "Sorter");
            break;
        case "upload_Blue_Sqli":
            handleFileUpload(chatId, "Blue Sqli");
            break;
            case "upload_Dorkgen":
                handleFileUpload(chatId, "Dorkgen");
                break;
        case "list_files":
            listFiles(chatId);
            break;
        case "remove_file_prompt":
            removeFilePrompt(chatId);
            break;
        case "add_balance":
            addBalance(chatId);
            break;
        case "download_sender":
            handleFileDownload(chatId, "Sender");
            break;
        case "download_email_wizard":
            handleFileDownload(chatId, "Email Wizard [B2B Sender]");
            break;
        case "download_sorter":
            handleFileDownload(chatId, "Sorter");
            break;
        case "download_Blue_Sqli":
            handleFileDownload(chatId, "Blue Sqli");
            case "download_Dorkgen":
                handleFileDownload(chatId, "Dorkgen");
            break;
        case "stats":
            showStats(chatId);
            break;
        case "newsletter":
            sendNewsletter(chatId);
            break;
        case "add_user":
            addUser(chatId);
            break;
        case "tutorial":
            bot.sendMessage(chatId, "📚 Select an option:", tutorialOptions);
            break;
        default:
            bot.sendMessage(chatId, "⚠️ Unknown command.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
    }
};

// Function definitions for command handlers
const manageUser = (chatId) => {
    bot.sendMessage(chatId, "Please enter the user's chat ID:").then(() => {
        bot.once("message", (msg) => {
            if (msg.chat.id === chatId) {
                const userChatId = msg.text;
                db.get("SELECT username, chat_id, balance, sender_licenses_remaining, email_wizard_licenses_remaining, sorter_licenses_remaining, Blue_Sqli_licenses_remaining FROM users WHERE chat_id = ?", [userChatId], (err, row) => {
                    if (err) {
                        bot.sendMessage(chatId, `⚠️ Error retrieving user info: ${err.message}`);
                    } else if (row) {
                        const licenses = [];
                        if (row.sender_licenses_remaining > 0) licenses.push("Sender");
                        if (row.email_wizard_licenses_remaining > 0) licenses.push("Email Wizard [B2B Sender]");
                        if (row.sorter_licenses_remaining > 0) licenses.push("Sorter");
                        if (row.Blue_Sqli_licenses_remaining > 0) licenses.push("Blue Sqli");
                        if (row.Dorkgen_licenses_remaining > 0) licenses.push("Dorkgen");
                        const licensesBought = licenses.length > 0 ? licenses.join(", ") : "N/A";

                        let responseMessage = `👤 User Info:\n📝 Name: ${row.username}\n🆔 Chat ID: ${row.chat_id}\n💰 Balance: $${row.balance}\n🔐 Licenses Bought: ${licensesBought}`;
                        bot.sendMessage(chatId, responseMessage, addBackButton({ reply_markup: { inline_keyboard: [] } }));
                    } else {
                        bot.sendMessage(chatId, "❌ User not found.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
                    }
                });
            }
        });
    });
};

const increaseBalance = (chatId) => {
    bot.sendMessage(chatId, "Please enter the user's chat ID and amount to increase in the format 'chat_id amount':").then(() => {
        bot.once("message", (msg) => {
            if (msg.chat.id === chatId) {
                const [userChatId, amount] = msg.text.split(' ');
                const amountInt = parseFloat(amount);

                db.run("UPDATE users SET balance = balance + ? WHERE chat_id = ?", [amountInt, userChatId], (err) => {
                    if (err) {
                        bot.sendMessage(chatId, `⚠️ Error updating balance: ${err.message}`);
                    } else {
                        bot.sendMessage(chatId, `✅ Balance updated successfully for user ${userChatId}.`);
                        bot.sendMessage(ownerChatId, `Admin ${chatId} increased the balance of user ${userChatId} by $${amountInt}.`);
                    }
                });
            }
        });
    });
};

const removeBalance = (chatId) => {
    bot.sendMessage(chatId, "Please enter the user's chat ID and amount to remove in the format 'chat_id amount':").then(() => {
        bot.once("message", (msg) => {
            if (msg.chat.id === chatId) {
                const [userChatId, amount] = msg.text.split(' ');
                const amountInt = parseFloat(amount);

                db.run("UPDATE users SET balance = balance - ? WHERE chat_id = ?", [amountInt, userChatId], (err) => {
                    if (err) {
                        bot.sendMessage(chatId, `⚠️ Error updating balance: ${err.message}`);
                    } else {
                        bot.sendMessage(chatId, `✅ Balance updated successfully for user ${userChatId}.`);
                        bot.sendMessage(ownerChatId, `Admin ${chatId} decreased the balance of user ${userChatId} by $${amountInt}.`);
                    }
                });
            }
        });
    });
};

const transferTools = (chatId) => {
    bot.sendMessage(chatId, "Please enter the transfer command in the format 'tool+old_user_chat_id+new_user_chat_id' (e.g., 'sender+5678738+65378376'):").then(() => {
        bot.once("message", (msg) => {
            if (msg.chat.id === chatId) {
                const [toolType, oldUserChatId, newUserChatId] = msg.text.split('+');
                const columnMap = {
                    "sender": "sender_licenses_remaining",
                    "email_wizard": "email_wizard_licenses_remaining",
                    "sorter": "sorter_licenses_remaining",
                    "Blue_Sqli": "Blue_Sqli_licenses_remaining",
                    "Dorkgen": "Dorkgen_licenses_remaining"
                };
                const column = columnMap[toolType];

                if (!column) {
                    return bot.sendMessage(chatId, "⚠️ Invalid tool type.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
                }

                db.serialize(() => {
                    db.get(`SELECT ${column} FROM users WHERE chat_id = ?`, [oldUserChatId], (err, row) => {
                        if (err) {
                            bot.sendMessage(chatId, `⚠️ Error retrieving user info: ${err.message}`);
                        } else if (row) {
                            const licenseCount = row[column];
                            db.run(`UPDATE users SET ${column} = ${column} - ? WHERE chat_id = ? AND ${column} >= ?`, [licenseCount, oldUserChatId, licenseCount], function(err) {
                                if (err) {
                                    bot.sendMessage(chatId, `⚠️ Error transferring tool: ${err.message}`);
                                } else if (this.changes === 0) {
                                    bot.sendMessage(chatId, `❌ The user ${oldUserChatId} does not have any ${toolType} licenses to transfer.`);
                                } else {
                                    db.run(`UPDATE users SET ${column} = ${column} + ? WHERE chat_id = ?`, [licenseCount, newUserChatId], (err) => {
                                        if (err) {
                                            bot.sendMessage(chatId, `⚠️ Error updating new user's licenses: ${err.message}`);
                                        } else {
                                            bot.sendMessage(chatId, `✅ Tool transferred successfully from user ${oldUserChatId} to user ${newUserChatId}.`);
                                            bot.sendMessage(newUserChatId, `🔐 You have received ${licenseCount} ${toolType} licenses from user ${oldUserChatId}.`);
                                            bot.sendMessage(ownerChatId, `Admin ${chatId} transferred ${toolType} licenses from user ${oldUserChatId} to user ${newUserChatId}.`);
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            }
        });
    });
};

const removeUserTool = (chatId) => {
    bot.sendMessage(chatId, "Please enter the command in the format 'type+chat_id+amount' (e.g., 'sender+6537846+1'):").then(() => {
        bot.once("message", (msg) => {
            if (msg.chat.id === chatId) {
                const [type, userChatId, amount] = msg.text.split('+');
                const amountInt = parseInt(amount, 10);
                const columnMap = {
                    "sender": "sender_licenses_remaining",
                    "email_wizard": "email_wizard_licenses_remaining",
                    "sorter": "sorter_licenses_remaining",
                    "Blue_Sqli": "Blue_Sqli_licenses_remaining",
                    "Dorkgen": "Dorkgen_licenses_remaining"
                };
                const column = columnMap[type];

                if (!column) {
                    return bot.sendMessage(chatId, "⚠️ Invalid tool type.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
                }

                db.run(`UPDATE users SET ${column} = ${column} - ? WHERE chat_id = ? AND ${column} >= ?`, [amountInt, userChatId, amountInt], (err) => {
                    if (err) {
                        bot.sendMessage(chatId, `⚠️ Error updating licenses: ${err.message}`);
                    } else {
                        bot.sendMessage(chatId, `✅ Licenses removed successfully for user ${userChatId}.`);
                        bot.sendMessage(ownerChatId, `Admin ${chatId} removed ${amountInt} ${type} licenses from user ${userChatId}.`);
                    }
                });
            }
        });
    });
};

const generateLicense = (chatId, licenseType) => {
    const columnMap = {
        "sender": "sender_licenses_remaining",
        "email_wizard": "email_wizard_licenses_remaining",
        "sorter": "sorter_licenses_remaining",
        "Blue_Sqli": "Blue_Sqli_licenses_remaining",
        "Dorkgen": "Dorkgen_licenses_remaining"
    };
    const endpointMap = {
        "sender": "http://191.101.15.245:3088/generateLicense",
        "email_wizard": "http://191.101.15.245:3000/generateLicense",
        "sorter": "http://191.101.15.245:3077/generateLicense", // Update this URL with the correct one if necessary
        "Blue_Sqli": "http://191.101.15.245:3027/generateLicense",// Update this URL with the correct one if necessary
        "Dorkgen": "http://191.101.15.245:3039/generateLicense"
    };

    const column = columnMap[licenseType];
    const endpoint = endpointMap[licenseType];

    if (!column || !endpoint) {
        return bot.sendMessage(chatId, "⚠️ Invalid license type.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
    }

    db.get(`SELECT ${column} FROM users WHERE chat_id = ?`, [chatId], (err, row) => {
        if (err) {
            console.error("Error checking remaining licenses:", err.message);
            bot.sendMessage(chatId, `⚠️ Error checking remaining licenses: ${err.message}`);
        } else if (row && row[column] > 0) {
            console.log(`Generating ${licenseType} license for user ${chatId}`);
            axios.post(endpoint)
                .then(response => {
                    console.log(`Response from ${licenseType} license generation endpoint:`, response.data);
                    const license = response.data.license_code;
                    bot.sendMessage(chatId, `✅ License generated successfully: ${license}`);
                    db.run(`UPDATE users SET ${column} = ${column} - 1 WHERE chat_id = ?`, [chatId], (err) => {
                        if (err) {
                            console.error("Error updating remaining licenses:", err.message);
                            bot.sendMessage(chatId, `⚠️ Error updating remaining licenses: ${err.message}`);
                        } else {
                            console.log(`User ${chatId} now has ${row[column] - 1} ${licenseType} licenses remaining.`);
                        }
                    });
                })
                .catch(error => {
                    console.error("Error generating license:", error.message);
                    bot.sendMessage(chatId, `⚠️ Error generating license: ${error.message}`);
                });
        } else {
            console.log(`User ${chatId} has no remaining ${licenseType} licenses to generate.`);
            bot.sendMessage(chatId, "❌ You have no remaining licenses to generate.", addBuyButton({ reply_markup: { inline_keyboard: [] } }));
        }
    });
};

const showUserInfo = (chatId) => {
    db.get("SELECT username, chat_id, balance, sender_licenses_remaining, email_wizard_licenses_remaining, sorter_licenses_remaining, Blue_Sqli_licenses_remaining, Dorkgen_licenses_remaining FROM users WHERE chat_id = ?", [chatId], (err, row) => {
        if (err) {
            console.error("Error retrieving user info:", err.message);
            bot.sendMessage(chatId, `⚠️ Error retrieving user info: ${err.message}`);
        } else if (row) {
            let responseMessage = `👤 Your Info\n`;
            responseMessage += `📝 Name: ${row.username}\n`;
            responseMessage += `🆔 Chat ID: ${row.chat_id}\n`;
            responseMessage += `💰 Balance: $${row.balance.toFixed(2)}`;
            responseMessage += `\n++++++++++++++++++++\n`;
            responseMessage += `🔐 Licenses Bought\n`;

            if (row.sender_licenses_remaining > 0) {
                responseMessage += `📤 Sender: ${row.sender_licenses_remaining}\n`;
            }
            if (row.email_wizard_licenses_remaining > 0) {
                responseMessage += `🔍 Email Wizard [B2B Sender]: ${row.email_wizard_licenses_remaining}\n`;
            }
            if (row.sorter_licenses_remaining > 0) {
                responseMessage += `🗂️ Sorter: ${row.sorter_licenses_remaining}\n`;
            }
            if (row.Blue_Sqli_licenses_remaining > 0) {
                responseMessage += `🌐 Blue Sqli: ${row.Blue_Sqli_licenses_remaining}\n`;
            }
            if (row.Dorkgen_licenses_remaining > 0) {
                responseMessage += `Dorkgen: ${row.Blue_Sqli_licenses_remaining}\n`;
            }
            // If no licenses, indicate none bought
            if (row.sender_licenses_remaining === 0 && row.email_wizard_licenses_remaining === 0 && row.sorter_licenses_remaining === 0 && row.Blue_Sqli_licenses_remaining === 0 && row.Dorkgen_licenses_remaining === 0) {
                responseMessage += `❌ No licenses bought.\n`;
            }

            // Send the message
            bot.sendMessage(chatId, responseMessage, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔙 Back", callback_data: "back" }]
                    ]
                }
            });
        } else {
            bot.sendMessage(chatId, "⚠️ User info not found.", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔙 Back", callback_data: "back" }]
                    ]
                }
            });
        }
    });
};

const handlePurchase = (chatId, amount, licenses, type) => {
    db.get("SELECT balance FROM users WHERE chat_id = ?", [chatId], (err, row) => {
        if (err) {
            console.error("Error retrieving balance:", err.message);
            bot.sendMessage(chatId, `⚠️ Error retrieving balance: ${err.message}`);
        } else if (row.balance < amount) {
            bot.sendMessage(chatId, "⚠️ Insufficient balance. Please top up.", addBalanceOptions);
        } else {
            const columnMap = {
                "sender": "sender_licenses_remaining",
                "email_wizard": "email_wizard_licenses_remaining",
                "sorter": "sorter_licenses_remaining",
                "Blue_Sqli": "Blue_Sqli_licenses_remaining",
                "Dorkgen": "Dorkgen_licenses_remaining"
            };
            const column = columnMap[type];

            db.run(`UPDATE users SET balance = balance - ?, ${column} = ${column} + ? WHERE chat_id = ?`, [amount, licenses, chatId], (err) => {
                if (err) {
                    console.error("Error updating balance:", err.message);
                    bot.sendMessage(chatId, `⚠️ Error updating balance: ${err.message}`);
                } else {
                    console.log(`User ${chatId} purchased ${licenses} ${type} licenses.`);
                    bot.sendMessage(chatId, `✅ Purchase successful. $${amount} deducted and ${licenses} ${type} license(s) added.`, addBackButton({ reply_markup: { inline_keyboard: [] } }));

                    db.get("SELECT username, balance, sender_licenses_remaining, email_wizard_licenses_remaining, sorter_licenses_remaining, Blue_Sqli_licenses_remaining, Dorkgen_licenses_remaining FROM users WHERE chat_id = ?", [chatId], (err, row) => {
                        if (err) {
                            console.error("Error fetching updated user info:", err.message);
                        } else {
                            const licensesRemaining = row[`${column}`];
                            const notificationMessage = `A user buys ${type}\nUsername: ${row.username}\nChat ID: ${chatId}\nLicense Bought: ${type}\nLicenses Remaining: ${licensesRemaining}\nCurrent Balance: $${row.balance.toFixed(2)}`;
                            notifyOwner(notificationMessage);
                        }
                    });
                }
            });
        }
    });
};

const handleFileUpload = (chatId, category) => {
    bot.sendMessage(chatId, `📤 Please upload your zip file for ${category}.`);
    bot.once("document", async (msg) => {
        const document = msg.document;

        if (document.file_name && document.file_name.toLowerCase().endsWith('.zip')) {
            try {
                const file = await bot.getFile(document.file_id);
                const fileLink = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
                const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
                const fileData = response.data;

                db.get("SELECT id FROM uploads WHERE category = ?", [category], (err, row) => {
                    if (err) {
                        console.error("Error checking existing file:", err.message);
                        bot.sendMessage(chatId, `⚠️ Error checking existing file: ${err.message}`);
                    } else if (row) {
                        // If a file already exists, delete it before inserting the new file
                        db.run("DELETE FROM uploads WHERE id = ?", [row.id], (deleteErr) => {
                            if (deleteErr) {
                                console.error("Error deleting old file:", deleteErr.message);
                                bot.sendMessage(chatId, `⚠️ Error deleting old file: ${deleteErr.message}`);
                                return;
                            }

                            insertNewFile(chatId, document.file_name, fileData, category);
                        });
                    } else {
                        insertNewFile(chatId, document.file_name, fileData, category);
                    }
                });
            } catch (error) {
                console.error("Failed to retrieve file link:", error.message);
                bot.sendMessage(chatId, `⚠️ Failed to retrieve file link: ${error.message}`, addBackButton({ reply_markup: { inline_keyboard: [] } }));
            }
        } else {
            bot.sendMessage(chatId, "⚠️ Please upload a valid zip file.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
        }
    });
};

const insertNewFile = (chatId, fileName, fileData, category) => {
    const stmt = db.prepare("INSERT INTO uploads (file_name, file_data, category) VALUES (?, ?, ?)");
    stmt.run(fileName, fileData, category, (err) => {
        if (err) {
            console.error("Failed to save file to database:", err.message);
            bot.sendMessage(chatId, `⚠️ Failed to save file to database: ${err.message}`);
        } else {
            console.log(`File ${fileName} uploaded successfully.`);
            bot.sendMessage(chatId, "✅ File uploaded successfully.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
        }
    });
    stmt.finalize();
};


const handleFileDownload = (chatId, category) => {
    const columnMap = {
        "Sender": "sender_licenses_remaining",
        "Email Wizard [B2B Sender]": "email_wizard_licenses_remaining",
        "Sorter": "sorter_licenses_remaining",
        "Blue Sqli": "Blue_Sqli_licenses_remaining",
        "Dorkgen": "dorkgen_licenses_remaining"
    };
    const column = columnMap[category];

    if (!column) {
        return bot.sendMessage(chatId, "⚠️ Invalid tool type.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
    }

    db.get(`SELECT ${column} FROM users WHERE chat_id = ?`, [chatId], (err, row) => {
        if (err) {
            console.error("Error checking licenses:", err.message);
            bot.sendMessage(chatId, `⚠️ Error checking licenses: ${err.message}`);
        } else if (row && row[column] > 0) {
            db.get("SELECT file_name, file_data FROM uploads WHERE category = ? ORDER BY id DESC LIMIT 1", [category], (err, fileRow) => {
                if (err) {
                    console.error("Error retrieving file:", err.message);
                    bot.sendMessage(chatId, `⚠️ Error retrieving file: ${err.message}`);
                } else if (fileRow) {
                    const buffer = Buffer.from(fileRow.file_data);

                    bot.sendDocument(chatId, buffer, {}, {
                        filename: fileRow.file_name,
                        contentType: 'application/zip'
                    });
                } else {
                    bot.sendMessage(chatId, "❌ No file found.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
                }
            });
        } else {
            bot.sendMessage(chatId, `❌ You don't have a ${category} license. Please get a license to download the file.`, addBackButton(addBalanceOptions));
        }
    });
};





const listFiles = (chatId) => {
    if (chatId === ownerChatId) {
        db.all("SELECT id, file_name, category FROM uploads GROUP BY category ORDER BY id DESC", (err, rows) => {
            if (err) {
                console.error("Error retrieving file list:", err.message);
                bot.sendMessage(chatId, `⚠️ Error retrieving file list: ${err.message}`);
            } else if (rows.length > 0) {
                const fileList = rows
                    .map((row) => `🆔 ID: ${row.id}, 📄 File: ${row.file_name}, 🗂️ Category: ${row.category}`)
                    .join("\n");
                bot.sendMessage(chatId, `Uploaded files:\n${fileList}`, addBackButton({ reply_markup: { inline_keyboard: [] } }));
            } else {
                bot.sendMessage(chatId, "❌ No files uploaded yet.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
            }
        });
    } else {
        bot.sendMessage(chatId, "🚫 Only the owner can list files.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
    }
};


const removeFilePrompt = (chatId) => {
    if (chatId === ownerChatId) {
        bot.sendMessage(chatId, "🗑️ Please enter the file ID to remove:").then(() => {
            bot.once("message", (msg) => {
                if (msg.chat.id === chatId) {
                    const fileId = parseInt(msg.text, 10);
                    db.get("SELECT file_name FROM uploads WHERE id = ?", [fileId], (err, row) => {
                        if (err) {
                            console.error("Error retrieving file:", err.message);
                            bot.sendMessage(chatId, `⚠️ Error retrieving file: ${err.message}`);
                        } else if (row) {
                            db.run("DELETE FROM uploads WHERE id = ?", [fileId], (dbErr) => {
                                if (dbErr) {
                                    console.error("Error deleting file from database:", dbErr.message);
                                    bot.sendMessage(chatId, `⚠️ Error deleting file from database: ${dbErr.message}`);
                                } else {
                                    console.log(`File ID ${fileId} deleted successfully.`);
                                    bot.sendMessage(chatId, `✅ File ID ${fileId} deleted successfully.`, addBackButton({ reply_markup: { inline_keyboard: [] } }));
                                }
                            });
                        } else {
                            bot.sendMessage(chatId, "❌ File not found.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
                        }
                    });
                }
            });
        });
    } else {
        bot.sendMessage(chatId, "🚫 Only the owner can remove files.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
    }
};

const showStats = (chatId) => {
    const toolCounts = {
        sender: 0,
        email_wizard: 0,
        sorter: 0,
        Blue_Sqli: 0,
        Dorkgen:0
    };

    const queries = [
        { tool: "sender", column: "sender_licenses_remaining" },
        { tool: "email_wizard", column: "email_wizard_licenses_remaining" },
        { tool: "sorter", column: "sorter_licenses_remaining" },
        { tool: "Blue_Sqli", column: "Blue_Sqli_licenses_remaining" },
        { tool: "Dorkgen", column: "Dorkgen_licenses_remaining" }
    ];

    let completedQueries = 0;

    queries.forEach(query => {
        db.get(`SELECT COUNT(*) AS count FROM users WHERE ${query.column} > 0`, (err, row) => {
            if (err) {
                console.error(`Error retrieving ${query.tool} stats:`, err.message);
                bot.sendMessage(chatId, `⚠️ Error retrieving ${query.tool} stats: ${err.message}`);
            } else {
                toolCounts[query.tool] = row.count;
            }

            completedQueries++;

            if (completedQueries === queries.length) {
                const statsMessage = `
                📊 Tool Stats:
                📤 Sender: ${toolCounts.sender}
                🔍 Email Wizard: ${toolCounts.email_wizard}
                🗂️ Sorter: ${toolCounts.sorter}
                🌐 Blue Sqli: ${toolCounts.Blue_Sqli}
                🧙‍♂️ Dorkgen: ${toolCounts.Dorkgen}
                `;

                bot.sendMessage(chatId, statsMessage, addBackButton({ reply_markup: { inline_keyboard: [] } }));
            }
        });
    });
};

const sendNewsletter = (chatId) => {
    bot.sendMessage(chatId, "📰 Please enter the message to broadcast:").then(() => {
        const onMessageListener = (msg) => {
            if (msg.chat.id === chatId) {
                const message = msg.text;

                const sentMessages = new Set();

                db.all("SELECT chat_id FROM users", (err, rows) => {
                    if (err) {
                        console.error("Error retrieving users:", err.message);
                        bot.sendMessage(chatId, `⚠️ Error retrieving users: ${err.message}`);
                    } else {
                        rows.forEach((row) => {
                            if (!sentMessages.has(row.chat_id)) {
                                sentMessages.add(row.chat_id);
                                bot.sendMessage(row.chat_id, message).catch((error) => {
                                    console.error(`Error sending message to chat ID ${row.chat_id}:`, error.message);
                                });
                            }
                        });
                        bot.sendMessage(chatId, "📬 Message broadcasted successfully.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
                    }
                });

                bot.removeListener('message', onMessageListener);
            }
        };

        bot.removeListener('message', onMessageListener);
        bot.on('message', onMessageListener);
    });
};

const addUser = (chatId) => {
    bot.sendMessage(chatId, "Please enter the command in the format 'type+chat_id+amount' (e.g., 'sender+6537846+1'):").then(() => {
        bot.once("message", (msg) => {
            if (msg.chat.id === chatId) {
                const [type, userChatId, amount] = msg.text.split('+');
                const amountInt = parseInt(amount, 10);
                const columnMap = {
                    "sender": "sender_licenses_remaining",
                    "email_wizard": "email_wizard_licenses_remaining",
                    "sorter": "sorter_licenses_remaining",
                    "Blue_Sqli": "Blue_Sqli_licenses_remaining",
                    "Dorkgen": "Dorkgen_licenses_remaining"
                };
                const column = columnMap[type];

                if (!column) {
                    return bot.sendMessage(chatId, "⚠️ Invalid tool type.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
                }

                db.run(`UPDATE users SET ${column} = ${column} + ? WHERE chat_id = ?`, [amountInt, userChatId], (err) => {
                    if (err) {
                        console.error("Error updating licenses:", err.message);
                        bot.sendMessage(chatId, `⚠️ Error updating licenses: ${err.message}`);
                    } else {
                        console.log(`Added ${amountInt} ${type} licenses to user ${userChatId}.`);
                        bot.sendMessage(chatId, `✅ Licenses updated successfully for user ${userChatId}.`);
                        bot.sendMessage(ownerChatId, `Admin ${chatId} added ${amountInt} ${type} licenses to user ${userChatId}.`);
                    }
                });
            }
        });
    });
};

const promptBanUser = (chatId) => {
    if (chatId === ownerChatId) {
        bot.sendMessage(chatId, "🚫 Please enter the user's chat ID to ban:").then(() => {
            bot.once("message", (msg) => {
                if (msg.chat.id === chatId) {
                    const userChatId = msg.text.trim();
                    banUser(chatId, userChatId);
                }
            });
        });
    } else {
        bot.sendMessage(chatId, "🚫 Unauthorized access.", addBackButton({ reply_markup: { inline_keyboard: [] } }));
    }
};

const banUser = (ownerChatId, userChatId) => {
    db.get("SELECT * FROM users WHERE chat_id = ?", [userChatId], (err, row) => {
        if (err) {
            bot.sendMessage(ownerChatId, `⚠️ Error retrieving user info: ${err.message}`);
        } else if (row) {
            db.run("DELETE FROM users WHERE chat_id = ?", [userChatId], (err) => {
                if (err) {
                    bot.sendMessage(ownerChatId, `⚠️ Error banning user: ${err.message}`);
                } else {
                    bot.sendMessage(ownerChatId, `✅ User with Chat ID ${userChatId} has been banned successfully.`);
                }
            });
        } else {
            bot.sendMessage(ownerChatId, "❌ User not found.");
        }
    });
};

const createInvoice = async (userId, amount) => {
    const url = 'https://api.cryptocloud.plus/v2/invoice/create';
    const headers = {
        'Authorization': `Token ${API_KEY}`,
        'Content-Type': 'application/json'
    };
    const body = {
        shop_id: 'oCKOlK6Srsp5lfyn',
        amount,
        currency: 'USD',
        order_id: `user_${userId}_${Date.now()}`,
        description: 'Top up balance'
    };

    try {
        const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        const data = await response.json();
        console.log('Invoice Creation Response:', data);
        if (!response.ok) {
            throw new Error(data.message || 'Unknown error');
        }
        if (!data.result || !data.result.link || !data.result.uuid) {
            throw new Error('Payment URL or Invoice ID is missing in the response');
        }
        return data.result;
    } catch (error) {
        console.error('Invoice Creation Error:', error);
        throw error;
    }
};

const checkInvoiceStatus = async (invoiceId) => {
    const url = 'https://api.cryptocloud.plus/v2/invoice/merchant/info';
    const headers = {
        'Authorization': `Token ${API_KEY}`,
        'Content-Type': 'application/json'
    };
    const body = {
        uuids: [invoiceId]
    };

    try {
        const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        const data = await response.json();
        console.log('Invoice Status Response:', data);
        if (!response.ok) {
            throw new Error(data.message || 'Unknown error');
        }
        return data.result[0];
    } catch (error) {
        console.error('Invoice Status Error:', error);
        throw error;
    }
};

const addBalance = (chatId) => {
    bot.sendMessage(chatId, "💰 Please enter the amount to add:").then(() => {
        bot.once('message', async (msg) => {
            if (msg.chat.id === chatId) {
                const amount = parseFloat(msg.text);
                if (isNaN(amount) || amount <= 0) {
                    return bot.sendMessage(chatId, "⚠️ Invalid amount. Please enter a valid number.");
                }

                try {
                    const userId = chatId;
                    const invoice = await createInvoice(userId, amount);
                    const { link, uuid } = invoice;

                    db.run("INSERT INTO payments (chat_id, invoice_id, amount) VALUES (?, ?, ?)", [chatId, uuid, amount], (err) => {
                        if (err) {
                            console.error("Error creating payment record:", err.message);
                            return bot.sendMessage(chatId, `⚠️ Error creating payment record: ${err.message}`);
                        }
                        bot.sendMessage(chatId, `🧾 Invoice ID: #${uuid}\nYou'll receive a notification once the payment is confirmed.`, {
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: "PAY 💳", url: link }],
                                    [{ text: "Check for Payment ✅", callback_data: `check_payment_status_${uuid}` }],
                                    [{ text: "🔙 Back", callback_data: "back" }]
                                ]
                            }
                        });
                    });
                } catch (error) {
                    console.error("Error creating invoice:", error.message);
                    bot.sendMessage(chatId, `⚠️ Error creating invoice: ${error.message}`);
                }
            }
        });
    });
};

const checkPaymentStatus = async (chatId, invoiceId) => {
    try {
        const invoice = await checkInvoiceStatus(invoiceId);
        if (invoice.status === 'paid' || invoice.invoice_status === 'success') {
            const amount = invoice.amount || 0; 

            db.run("UPDATE users SET balance = balance + ? WHERE chat_id = ?", [amount, chatId], (err) => {
                if (err) {
                    console.error("Error updating balance:", err.message);
                    return bot.sendMessage(chatId, '⚠️ Error updating balance.');
                }

                db.get("SELECT username, balance FROM users WHERE chat_id = ?", [chatId], (err, row) => {
                    if (err) {
                        console.error("Error retrieving updated user info:", err.message);
                    } else if (row) {
                        const username = row.username || 'N/A';
                        const balance = row.balance.toFixed(2);

                        // Send success message to the user
                        bot.sendMessage(chatId, '✅ Your account has been topped up successfully.');

                        // Notify the owner about the top-up
                        const notificationMessage = `A user funds bot\nUsername: ${username}\nChat ID: ${chatId}\nAmount Added: $${amount.toFixed(2)}\nTotal Balance: $${balance}`;
                        notifyOwner(notificationMessage);
                    }
                });
            });
        } else {
            bot.sendMessage(chatId, '❌ The payment has not been confirmed yet. Please try again later.');
        }
    } catch (error) {
        console.error("Error checking payment status:", error.message);
        bot.sendMessage(chatId, `⚠️ Error checking payment status: ${error.message}`);
    }
};

console.log("🤖 Bot is running...");
