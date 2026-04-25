exports.handler = async (event) => {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
        return {
            statusCode: 500,
            body: JSON.stringify({ ok: false, error: 'Missing env vars' })
        };
    }

    try {
        const contentType = event.headers['content-type'] || '';

        // Xử lý FormData (upload file)
        if (contentType.includes('multipart/form-data')) {
            const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
            const boundary = contentType.split('boundary=')[1];
            const sections = bodyBuffer.toString('binary').split(`--${boundary}`);

            const parts = {};
            for (const section of sections) {
                const nameMatch = section.match(/name="([^"]+)"/);
                const filenameMatch = section.match(/filename="([^"]+)"/);
                if (!nameMatch) continue;

                const name = nameMatch[1];
                const filename = filenameMatch ? filenameMatch[1] : null;
                const headerEnd = section.indexOf('\r\n\r\n');
                if (headerEnd === -1) continue;

                let start = headerEnd + 4;
                let end = section.lastIndexOf('\r\n');
                if (end <= start) end = section.length;

                const data = Buffer.from(section.substring(start, end), 'binary');
                parts[name] = filename ? { data, filename } : data.toString('utf8').trim();
            }

            const endpoint = parts['endpoint'];
            const fileField = parts['audio'] || parts['photo'] || parts['document'];
            const caption = parts['caption'] || '';

            const FormData = require('form-data');
            const form = new FormData();
            form.append('chat_id', CHAT_ID);
            if (caption) form.append('caption', caption);
            form.append(
                Object.keys(parts).find(k => ['audio', 'photo', 'document'].includes(k)),
                fileField.data,
                { filename: fileField.filename }
            );

            const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
                method: 'POST',
                headers: form.getHeaders(),
                body: form
            });
            return { statusCode: 200, body: JSON.stringify(await res.json()) };
        }

        // Xử lý JSON
        const { endpoint, data } = JSON.parse(event.body);
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, ...data })
        });
        return { statusCode: 200, body: JSON.stringify(await res.json()) };

    } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
    }
};
