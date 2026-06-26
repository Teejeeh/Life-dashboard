const { get, put } = require("@vercel/blob");

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
			const result = await get(BLOB_PATH, {
				access: "private",
				useCache: false,
			});
			if (!result || result.statusCode !== 200 || !result.stream) {
				return res.status(200).json({});
			}
			const text = await new Response(result.stream).text();
			return res.status(200).json(JSON.parse(text));
		} catch (err) {
			// Blob doesn't exist yet
			if (err.message && err.message.includes("404")) {
				return res.status(200).json({});
			}
			console.error("GET /api/data error:", err);
			return res
				.status(500)
				.json({ error: err.message || "Failed to load data" });
		}
	}

	if (req.method === "POST") {
		try {
			let body = req.body;
			if (typeof body === "string") {
				body = JSON.parse(body);
			}
			if (!body || typeof body !== "object") {
				return res.status(400).json({ error: "Invalid request body" });
			}
			await put(BLOB_PATH, JSON.stringify(body), {
				access: "private",
				contentType: "application/json",
				addRandomSuffix: false,
				allowOverwrite: true,
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
