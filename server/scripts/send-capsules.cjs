const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const { getPool } = require("../db.cjs");
const { listDueTimeCapsules, markTimeCapsuleSent } = require("../repositories.cjs");

dotenv.config();

function requireEnv(name) {
    if (!process.env[name]) {
        throw new Error(`缺少环境变量 ${name}`);
    }
    return process.env[name];
}

function formatDate(dateValue) {
    return new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(new Date(dateValue));
}

function createTransporter() {
    return nodemailer.createTransport({
        host: requireEnv("SMTP_HOST"),
        port: Number(process.env.SMTP_PORT || 465),
        secure: process.env.SMTP_SECURE !== "false",
        auth: {
            user: requireEnv("SMTP_USER"),
            pass: requireEnv("SMTP_PASS"),
        },
    });
}

function createMail(capsule) {
    const siteUrl = (process.env.PUBLIC_SITE_URL || "").replace(/\/$/, "");
    const residentUrl = siteUrl ? `${siteUrl}/resident.html?id=${encodeURIComponent(capsule.residentId)}` : "";
    const subject = `鼠鼠星球寄来一封给未来的信：${capsule.residentName}`;
    const text = [
        "一年也好，很多天也好，时间胶囊终于到了。",
        "",
        `这封信和「${capsule.residentName}」有关。它在 ${formatDate(capsule.residentArrivedAt)} 抵达鼠星。`,
        "",
        "你当时写下：",
        capsule.message,
        "",
        "那段最初的回忆是：",
        capsule.residentMemory,
        "",
        residentUrl ? `回到它的纪念页：${residentUrl}` : "愿它在鼠星安睡，也愿你今天被温柔接住。",
    ].join("\n");

    return {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: capsule.email,
        subject,
        text,
    };
}

async function main() {
    const limit = Number(process.env.CAPSULE_SEND_LIMIT || 50);
    const capsules = await listDueTimeCapsules(limit);

    if (!capsules.length) {
        console.log("没有到期的时间胶囊。");
        return;
    }

    const transporter = createTransporter();

    for (const capsule of capsules) {
        await transporter.sendMail(createMail(capsule));
        await markTimeCapsuleSent(capsule.id);
        console.log(`已发送时间胶囊: ${capsule.id}`);
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await getPool().end();
    });