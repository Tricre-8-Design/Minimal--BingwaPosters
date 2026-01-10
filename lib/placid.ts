const PLACID_BASE = "https://api.placid.app/api/rest";

export async function placidFetch(path: string) {
    const res = await fetch(`${PLACID_BASE}${path}`, {
        headers: {
            Authorization: `Bearer ${process.env.PLACID_API_KEY}`,
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        throw new Error(`Placid API error: ${res.status}`);
    }

    return res.json();
}
