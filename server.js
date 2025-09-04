import express from "express";
import fetch from "node-fetch";
import whois from "whois-json";

const app = express();
app.use(express.json());

// === Utility: WHOIS Check ===
async function checkWhois(domain) {
  try {
    const result = await whois(domain);
    return {
      registrar: result.registrar || "Unknown",
      creationDate: result.creationDate || "Unknown",
      status: result.status || "Unknown"
    };
  } catch (err) {
    return { error: "WHOIS lookup failed" };
  }
}

// === Utility: Trademark Check (USPTO API) ===
async function checkTrademark(keyword) {
  try {
    const url = `https://developer.uspto.gov/ibd-api/v1/application/publications?searchText=${encodeURIComponent(
      keyword
    )}&rows=5&start=0`;

    const res = await fetch(url);
    const data = await res.json();

    if (data?.results?.length > 0) {
      return data.results.map(r => ({
        serialNumber: r.serialNumber,
        mark: r.markIdentification,
        status: r.markCurrentStatusExternalDescription
      }));
    } else {
      return [];
    }
  } catch (err) {
    return { error: "Trademark API failed" };
  }
}

// === API Endpoint ===
app.post("/check-domain", async (req, res) => {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ error: "Domain is required" });
  }

  const keyword = domain.split(".")[0];
  const whoisData = await checkWhois(domain);
  const trademarkData = await checkTrademark(keyword);
  const risk =
    trademarkData.length > 0 ? "High risk (trademark conflict found)" : "Low risk";

  res.json({
    domain,
    keyword,
    whois: whoisData,
    trademarks: trademarkData,
    risk
  });
});

// === Start Server ===
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ API running on http://localhost:${PORT}`);
});
