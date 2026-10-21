// Escape text before putting it into HTML, so database values can't inject markup or scripts
export function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Send a request to the server API. Throws an error with the server's message if it fails
export async function apiRequest(method, url, body) {
    const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        let message = "Something went wrong";
        try {
            message = (await response.json()).error || message;
        } catch { }
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }

    return response.status === 204 ? null : response.json();
}
