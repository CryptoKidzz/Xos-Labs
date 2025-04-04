const fs = require('fs');
const chalk = require('chalk').default;
const axios = require('axios');
const banner = require('./config/banner.js');

const me_url = 'https://api.x.ink/v1/me';
const draw_url = 'https://api.x.ink/v1/draw';
const checkIn_url = 'https://api.x.ink/v1/check-in';

function getBearerTokens() {
    try {
        const tokens = fs.readFileSync('token.txt', 'utf8')
            .split('\n')
            .map(t => t.trim())
            .filter(Boolean);
        console.log(chalk.green(`Found ${tokens.length} tokens.\n`));
        return tokens;
    } catch (err) {
        console.log(chalk.red('❌ Error reading token file:', err.message));
        return [];
    }
}

function convertUTCtoWIB(utcTime) {
    const date = new Date(utcTime);
    date.setHours(date.getHours() + 7);
    return date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}

function isCheckInAvailable(lastCheckInTime) {
    if (!lastCheckInTime) return true;
    const lastCheck = new Date(lastCheckInTime);
    const now = new Date();
    const nextCheckIn = new Date(lastCheck.getTime() + 24 * 60 * 60 * 1000);
    return now >= nextCheckIn;
}

async function getUserInfo(headers) {
    try {
        const response = await axios.get(me_url, { headers });
        const result = response.data;

        if (result && result.data) {
            const { eth, points, currentDraws, lastCheckIn } = result.data;
            console.log(chalk.cyan(`User: ${eth}, Points: ${points}, Draws: ${currentDraws}`));
            return result.data;
        } else {
            console.log(chalk.red('Unexpected response format:'));
            console.log(chalk.red(JSON.stringify(result, null, 2)));
            return null;
        }
    } catch (error) {
        console.log(chalk.red('❌ Error fetching user info!'));
        if (error.response) {
            console.log(chalk.red(JSON.stringify(error.response.data, null, 2)));
        } else {
            console.log(chalk.red(error.message));
        }
        return null;
    }
}

async function checkIn(headers) {
    try {
        const response = await axios.post(checkIn_url, {}, { headers });
        const result = response.data;

        if (result.message?.toLowerCase().includes("already")) {
            console.log(chalk.yellow("ℹ️ Already checked in today."));
        } else if (result.code === 200 || result.message?.toLowerCase().includes("success")) {
            console.log(chalk.green("✅ Check-in successful!"), result.message);
        } else {
            console.log(chalk.red("Check-in failed:"), result.message);
        }
    } catch (error) {
        console.log(chalk.red("❌ Error during check-in:"), error.response?.data || error.message);
    }
}

async function draw(headers, drawCount) {
    console.log(chalk.blue(`🎯 Starting ${drawCount} draw(s)...`));
    for (let i = 0; i < drawCount; i++) {
        try {
            const response = await axios.post(draw_url, {}, { headers });
            const result = response.data;

            if (result.message?.toLowerCase().includes("successful")) {
                console.log(chalk.green(`🎉 Draw ${i + 1}: ${result.message}, Points Earned: ${result.pointsEarned}`));
            } else {
                console.log(chalk.red(`⚠️ Draw ${i + 1} failed:`), result.message);
            }

        } catch (error) {
            console.log(chalk.red(`❌ Draw ${i + 1} error:`), error.response?.data || error.message);
        }
    }
}

async function runBot() {
    const tokens = getBearerTokens();
    if (tokens.length === 0) return;

    for (const token of tokens) {
        console.log(chalk.magenta(`\n=== 🤖 Running bot at ${new Date().toLocaleString('id-ID')} ===`));
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        const user = await getUserInfo(headers);
        if (!user) continue;

        if (isCheckInAvailable(user.lastCheckIn)) {
            await checkIn(headers);
        } else {
            const nextCheckIn = new Date(new Date(user.lastCheckIn).getTime() + 24 * 60 * 60 * 1000);
            console.log(chalk.yellow(`🕒 Already checked in. Next check-in at: ${convertUTCtoWIB(nextCheckIn.toISOString())}`));
        }

        if (user.currentDraws > 0) {
            await draw(headers, user.currentDraws);
        } else {
            console.log(chalk.gray('➖ No draws available.'));
        }

        const updated = await getUserInfo(headers);
        if (updated) {
            console.log(chalk.greenBright(`✨ Final Points: ${updated.points}\n`));
        }

        console.log(chalk.gray(`⏳ Waiting 60 minutes before next check...\n`));
    }
}

async function startLoop() {
    while (true) {
        await runBot();
        await new Promise(resolve => setTimeout(resolve, 60 * 60 * 1000)); // 60 menit
    }
}

startLoop();
