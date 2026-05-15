#!/usr/bin/env node
require("dotenv").config();
const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/deapseak";
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getZipCode(lift) {
    const src = [lift.postalCode, lift.address && lift.address.zipCode].filter(Boolean).join(" ");
    const m = src.match(/\d{4}-\d{3}/);
    return m ? m[0] : null;
}

function getAddressString(lift) {
    if (typeof lift.address === "object" && lift.address) {
        const { street="", city="", zipCode="", country="Portugal" } = lift.address;
        const c = city || (lift.municipality && lift.municipality.name) || "";
        return [street, zipCode, c, country].filter(Boolean).join(", ");
    }
    return "";
}

function isTestLift(lift) {
    // Only skip real test entries - lifts starting with 000 may be valid home/monte prato lifts
    return /^(test|demo|temp|xxx)/i.test(lift.municipalNumber || "");
}

async function geocodePhoton(query) {
    try {
        const url = "https://photon.komoot.io/api/?q=" + encodeURIComponent(query) + "&limit=1";
        const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!resp.ok) { console.log("    [Photon HTTP " + resp.status + "]"); return null; }
        const data = await resp.json();
        if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].geometry.coordinates;
            const p = data.features[0].properties;
            const city = p.city || p.town || p.village || p.county || "";
            return { lat, lon: lng, city, source: "photon" };
        }
    } catch (e) { console.log("    [Photon: " + e.message + "]"); }
    return null;
}

async function geocodeGoogle(address) {
    if (!GOOGLE_KEY) return null;
    try {
        const url = "https://maps.googleapis.com/maps/api/geocode/json?address=" + encodeURIComponent(address + ", Portugal") + "&key=" + GOOGLE_KEY;
        const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
        const data = await resp.json();
        if (data.status === "OK" && data.results.length > 0) {
            const loc = data.results[0].geometry.location;
            const city = (data.results[0].address_components || [])
                .find(c => c.types.includes("locality") || c.types.includes("administrative_area_level_2"))?.long_name || "";
            return { lat: loc.lat, lon: loc.lng, city, source: "google" };
        }
    } catch (e) {}
    return null;
}

async function main() {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const lifts = client.db().collection("lifts");
    const all = await lifts.find({}).toArray();
    console.log("\nFound " + all.length + " lifts\n");

    let updated=0, skipped=0, failed=0;

    for (let i=0; i<all.length; i++) {
        const lift = all[i];
        const label = "[" + (i+1) + "/" + all.length + "] " + (lift.municipalNumber || lift._id);

        if (isTestLift(lift)) { console.log(label + " — SKIP"); skipped++; continue; }

        const zip = getZipCode(lift);
        const addr = getAddressString(lift);
        const query = zip ? zip + " Portugal" : addr;

        if (!query) { console.log(label + " — SKIP (no data)"); skipped++; continue; }

        console.log(label + " — " + query);

        let geo = await geocodeGoogle(addr);
        if (!geo) geo = await geocodePhoton(query);

        if (geo) {
            const lat = parseFloat(geo.lat.toFixed(7));
            const lng = parseFloat(geo.lon.toFixed(7));
            await lifts.updateOne({ _id: lift._id }, { $set: {
                lat, lng,
                "location.coordinates": [lng, lat],
                "location.city": geo.city || (lift.municipality && lift.municipality.name) || "",
                geocodedCity: geo.city,
                geocodeSource: geo.source,
                geocodedAt: new Date()
            }});
            console.log("  OK " + geo.source + ": " + lat + ", " + lng + " | " + geo.city);
            updated++;
        } else {
            console.log("  FAIL");
            failed++;
        }

        await sleep(700);
    }

    await client.close();
    console.log("\nUpdated: " + updated + " | Skipped: " + skipped + " | Failed: " + failed + "\n");
}

main().catch(e => { console.error(e); process.exit(1); });
