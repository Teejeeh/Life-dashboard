import { head, put } from "@vercel/blob";

const BLOB_PATH = "dashboard/data.json";

function isAuthorized(req) {
	const secret = process.env.API_SECRET;
	if (!secret) return false;
	const auth = req.headers["authorization"] || "";
	return auth === `Bearer ${secret}`;
}

export default async function handler(req, res) {
	if (!isAuthorized(req)) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	if (req.method === "GET") {
		try {
			const metadata = await head(BLOB_PATH);
			if (!metadata) {
				return res.status(200).json({});
			}
			const response = await fetch(metadata.downloadUrl, {
				headers: {
					Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
				},
			});
			if (!response.ok) {
				return res.status(200).json({});
			}
			const data = await response.json();
			return res.status(200).json(data);
		} catch (err) {
			if (
				err.name === "BlobNotFoundError" ||
				(err.message && (
					err.message.includes("404") ||
					err.message.includes("does not exist")
				))
			) {
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
}
