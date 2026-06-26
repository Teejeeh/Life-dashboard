const { list, put } = require("@vercel/blob");

const BLOB_PATH = "dashboard/data.json";

function isAuthorized(req) {
	const secret = process.env.API_SECRET;
	if (!secret) return false;
	const auth = req.headers["authorization"] || "";
	return auth === `Bearer ${secret}`;
}

module.exports = async function handler(req, res) {
	if (!isAuthorized(req)) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	if (req.method === "GET") {
		try {
			const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
			if (blobs.length === 0) {
				return res.status(200).json({});
			}
			const response = await fetch(blobs[0].url, {
				headers: {
					Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
				},
			});
			if (!response.ok) {
				return res
					.status(500)
					.json({ error: "Failed to fetch blob content" });
			}
			const data = await response.json();
			return res.status(200).json(data);
		} catch (err) {
			console.error("GET /api/data error:", err);
			return res
				.status(500)
				.json({ error: err.message || "Failed to load data" });
		}
	}

	if (req.method === "POST") {
		try {
			// Parse body manually if not already parsed
			let body = req.body;
			if (typeof body === "string") {
				body = JSON.parse(body);
			}
			if (!body || typeof body !== "object") {
				return res.status(400).json({ error: "Invalid request body" });
			}
			await put(BLOB_PATH, JSON.stringify(body), {
				access: "public",
				contentType: "application/json",
				addRandomSuffix: false,
			});
			return res.status(200).json({ ok: true });
		} catch (err) {
			console.error("POST /api/data error:", err);
			return res
				.status(500)
				.json({ error: err.message || "Failed to save data" });
		}
	}

	return res.status(405).json({ error: "Method not allowed" });
};
