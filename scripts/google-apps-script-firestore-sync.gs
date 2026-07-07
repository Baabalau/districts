const PROJECT_ID = 'districts-after-dark';

// SAFETY: when false, the sync will NEVER delete venue docs that are missing from
// the sheet (it only logs what it would have removed). Keep false during the live
// event so an accidental sheet edit can't wipe venues (and their votes).
const ALLOW_DELETES = false;

// Live-data fields owned by the app, not the sheet. The sync must never overwrite
// these or it would reset vote tallies / check-in counts on every run.
const PROTECTED_FIELDS = ['votecount', 'votes', 'visitcount', 'optoutrunoff'];

// Convert business name + district into a stable, URL-safe ID.
// Example: "Brittany's Restaurant & Lounge" + "E" -> "brittanys-restaurant-lounge-e"
function slugify(name, district) {
  const slug = String(name || '')
    .toLowerCase()
    .replace(/['']/g, '')           // Remove apostrophes
    .replace(/&/g, 'and')           // & -> and
    .replace(/[^a-z0-9]+/g, '-')    // Non-alphanumeric -> hyphen
    .replace(/^-+|-+$/g, '')        // Trim leading/trailing hyphens
    .substring(0, 50);              // Cap length
  const dist = String(district || '').trim().toLowerCase();
  return dist ? `${slug}-${dist}` : slug;
}

// Map sheet headers to distinct Firestore field names (prevents "address #" overwriting "address").
function normalizeHeader(header) {
  const h = String(header).trim().toLowerCase();
  if (h === 'address #') return 'addressNumber';
  if (h === 'address street' || h === 'address stre') return 'addressStreet';
  if (h === 'address') return 'address';
  return h.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
}

function buildCanonicalAddress(rowValues) {
  const full = String(rowValues.address || '').trim();
  const street = String(rowValues.addressStreet || '').trim();
  const number = String(rowValues.addressNumber || '').trim();
  const hasStreetName = (value) => /[a-zA-Z]{2,}/.test(value);

  if (hasStreetName(full)) return full;

  if (hasStreetName(street)) {
    if (/^\d+\s*[a-zA-Z]/.test(street)) return street;
    if (number || (/^\d/.test(full) && !hasStreetName(full))) {
      return `${number || full} ${street}`.replace(/\s+/g, ' ').trim();
    }
    return street;
  }

  return full || [number, street].filter(Boolean).join(' ').trim();
}

function geocodeAddresses() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const addressIdx = headers.findIndex(h => String(h).trim().toLowerCase() === 'address');
  const latIdx = headers.findIndex(h => String(h).trim().toLowerCase() === 'lat');
  const lngIdx = headers.findIndex(h => String(h).trim().toLowerCase() === 'lng');

  if (addressIdx === -1 || latIdx === -1 || lngIdx === -1) {
    SpreadsheetApp.getUi().alert("Error: Your sheet must have 'address', 'lat', and 'lng' columns.");
    return;
  }

  let count = 0;
  const geocoder = Maps.newGeocoder();

  for (let i = 1; i < data.length; i++) {
    const address = data[i][addressIdx];
    const currentLat = data[i][latIdx];
    const currentLng = data[i][lngIdx];

    if (address && (!currentLat || !currentLng)) {
      const fullAddress = address.toLowerCase().includes('new orleans') ? address : `${address}, New Orleans, LA`;
      const response = geocoder.geocode(fullAddress);

      if (response.status === 'OK' && response.results.length > 0) {
        const location = response.results[0].geometry.location;
        sheet.getRange(i + 1, latIdx + 1).setValue(location.lat);
        sheet.getRange(i + 1, lngIdx + 1).setValue(location.lng);
        count++;
        Utilities.sleep(200);
      }
    }
  }

  SpreadsheetApp.getUi().alert(`Successfully geocoded ${count} new address(es)!`);
}

function syncToFirestore() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert("No data found to sync.");
    return;
  }

  const headers = data[0];
  const idIndex = headers.findIndex(h => String(h).trim().toLowerCase() === 'id');
  const nameIndex = headers.findIndex(h => String(h).trim().toLowerCase() === 'name');
  const districtIndex = headers.findIndex(h => String(h).trim().toLowerCase() === 'district');

  if (idIndex === -1) {
    SpreadsheetApp.getUi().alert("Error: Your sheet must have an 'id' column header.");
    return;
  }

  if (nameIndex === -1) {
    SpreadsheetApp.getUi().alert("Error: Your sheet must have a 'name' column to auto-generate IDs.");
    return;
  }

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/venues`;
  const token = ScriptApp.getOAuthToken();
  const authHeader = { 'Authorization': 'Bearer ' + token };

  let existingIds = [];
  let nextPageToken = '';

  try {
    do {
      let fetchUrl = `${url}?pageSize=300`;
      if (nextPageToken) fetchUrl += `&pageToken=${encodeURIComponent(nextPageToken)}`;

      const fetchResponse = UrlFetchApp.fetch(fetchUrl, {
        method: 'get',
        headers: authHeader,
        muteHttpExceptions: true
      });

      if (fetchResponse.getResponseCode() === 200) {
        const responseData = JSON.parse(fetchResponse.getContentText());
        if (responseData.documents) {
          existingIds = existingIds.concat(responseData.documents.map(doc => {
            const parts = doc.name.split('/');
            return parts[parts.length - 1];
          }));
        }
        nextPageToken = responseData.nextPageToken || '';
      } else {
        break;
      }
    } while (nextPageToken !== '');
  } catch (e) {
    Logger.log("Error fetching existing venues: " + e);
  }

  let successCount = 0;
  let generatedCount = 0;
  const sheetIds = [];
  const usedIds = new Set(existingIds);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    let docId = String(row[idIndex]).trim();
    
    // Auto-generate ID if blank
    if (!docId) {
      const name = row[nameIndex];
      const district = districtIndex !== -1 ? row[districtIndex] : '';
      
      if (!name || String(name).trim() === '') {
        continue; // Skip rows with no name
      }
      
      let baseId = slugify(name, district);
      docId = baseId;
      
      // If this ID is already used, add a counter suffix
      let counter = 2;
      while (usedIds.has(docId)) {
        docId = `${baseId}-${counter}`;
        counter++;
      }
      
      // Write the generated ID back to the sheet
      sheet.getRange(i + 1, idIndex + 1).setValue(docId);
      generatedCount++;
    }
    
    usedIds.add(docId);
    sheetIds.push(docId);

    const rowValues = {};
    headers.forEach((header, index) => {
      const headerKey = normalizeHeader(header);
      if (headerKey === 'id' || headerKey === '') return;
      rowValues[headerKey] = row[index];
    });

    rowValues.address = buildCanonicalAddress(rowValues);

    const payload = { fields: {} };
    Object.keys(rowValues).forEach((key) => {
      // Never let the sheet clobber app-owned live data (vote counts, etc.).
      if (PROTECTED_FIELDS.indexOf(key.toLowerCase()) !== -1) return;
      const val = rowValues[key];
      if (val === '') return;
      if (key === 'lat' || key === 'lng') {
        payload.fields[key] = { doubleValue: Number(val) };
      } else {
        payload.fields[key] = { stringValue: String(val) };
      }
    });

    let updateMaskQuery = '';
    Object.keys(payload.fields).forEach((field, index) => {
      updateMaskQuery += (index === 0 ? '?' : '&') + `updateMask.fieldPaths=${field}`;
    });

    if (Object.keys(payload.fields).length === 0) continue;

    const response = UrlFetchApp.fetch(`${url}/${docId}${updateMaskQuery}`, {
      method: 'patch',
      contentType: 'application/json',
      headers: authHeader,
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
      successCount++;
    } else {
      Logger.log(`Error syncing row ${i + 1}: ${response.getContentText()}`);
    }
  }

  let deleteCount = 0;
  const idsToDelete = existingIds.filter(id => !sheetIds.includes(id));

  if (ALLOW_DELETES) {
    idsToDelete.forEach(idToDelete => {
      const deleteResponse = UrlFetchApp.fetch(`${url}/${idToDelete}`, {
        method: 'delete',
        headers: authHeader,
        muteHttpExceptions: true
      });
      if (deleteResponse.getResponseCode() >= 200 && deleteResponse.getResponseCode() < 300) {
        deleteCount++;
      }
    });
  } else if (idsToDelete.length > 0) {
    Logger.log('ALLOW_DELETES is false. Skipped deleting ' + idsToDelete.length +
               ' venue(s) not present in the sheet: ' + idsToDelete.join(', '));
  }

  let message = `Sync Complete!\n\nAdded/Updated: ${successCount} venue(s)`;
  if (ALLOW_DELETES) {
    message += `\nDeleted: ${deleteCount} removed venue(s)`;
  } else if (idsToDelete.length > 0) {
    message += `\nSkipped ${idsToDelete.length} delete(s) (ALLOW_DELETES is off).`;
  }
  if (generatedCount > 0) {
    message += `\n\nAuto-generated ${generatedCount} new ID(s) in your sheet.`;
  }
  SpreadsheetApp.getUi().alert(message);
}

// Publish a compact {lat, lng, type} point list to settings/mapSnapshot so the
// homepage map can render its decorative dots with a SINGLE Firestore read
// instead of pulling every venue for every visitor.
function publishMapSnapshot() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert('No data found to publish.');
    return;
  }

  const headers = data[0];
  const latIdx = headers.findIndex(h => String(h).trim().toLowerCase() === 'lat');
  const lngIdx = headers.findIndex(h => String(h).trim().toLowerCase() === 'lng');
  const typeIdx = headers.findIndex(h => String(h).trim().toLowerCase() === 'type');
  const nameIdx = headers.findIndex(h => String(h).trim().toLowerCase() === 'name');

  if (latIdx === -1 || lngIdx === -1) {
    SpreadsheetApp.getUi().alert("Error: Your sheet must have 'lat' and 'lng' columns.");
    return;
  }

  const points = [];
  for (let i = 1; i < data.length; i++) {
    let lat = Number(data[i][latIdx]);
    let lng = Number(data[i][lngIdx]);
    if (!lat || !lng) continue;

    // Bake in the historical Saturn Bar coordinate fix so the client no longer
    // has to special-case it.
    const name = nameIdx !== -1 ? String(data[i][nameIdx] || '').trim().toUpperCase() : '';
    if (name === 'SATURN BAR') {
      lat = 29.9679094;
      lng = -90.0442228;
    }

    const point = { lat: lat, lng: lng };
    if (typeIdx !== -1 && data[i][typeIdx]) {
      point.type = String(data[i][typeIdx]).trim();
    }
    points.push(point);
  }

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings/mapSnapshot`;
  const token = ScriptApp.getOAuthToken();
  const payload = {
    fields: {
      points: { stringValue: JSON.stringify(points) },
      updatedAt: { timestampValue: new Date().toISOString() }
    }
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
    SpreadsheetApp.getUi().alert(`Homepage map snapshot published: ${points.length} point(s).`);
  } else {
    Logger.log('Error publishing snapshot: ' + response.getContentText());
    SpreadsheetApp.getUi().alert('Error publishing snapshot. Check the logs for details.');
  }
}

// Publish per-district STATIC venue snapshots (settings/venues_<A-E>) plus a
// SEED of the live vote-count aggregates (settings/voteCounts_<A-E>). This lets
// each district page render its map/leaderboard from 2 doc reads instead of
// ~150 collection reads. Run AFTER "2. Sync Venues to Map" so venue IDs exist.
//
// Static data comes from the sheet (source of truth for venue details). Vote
// counts are seeded from the LIVE venue docs (app-owned truth), never the sheet.
// The seed is a full overwrite, so removed venues drop out; re-running repairs
// any drift. Because the seed overwrites, run it during a quiet moment - votes
// landing in the read->write window would be reset in the aggregate (they remain
// correct on the venue docs and re-appear on the venue's next vote/seed).
function publishDistrictSnapshots() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert('No data found to publish.');
    return;
  }

  const headers = data[0];
  const colIdx = (name) => headers.findIndex(h => String(h).trim().toLowerCase() === name);
  const idIdx = colIdx('id');
  const nameIdx = colIdx('name');
  const districtIdx = colIdx('district');
  const latIdx = colIdx('lat');
  const lngIdx = colIdx('lng');
  const typeIdx = colIdx('type');
  const websiteIdx = colIdx('website');
  const facebookIdx = colIdx('facebook');
  const descIdx = colIdx('description');

  if (idIdx === -1 || districtIdx === -1 || latIdx === -1 || lngIdx === -1) {
    SpreadsheetApp.getUi().alert("Error: sheet needs 'id', 'district', 'lat', and 'lng' columns. Run 'Sync Venues to Map' first.");
    return;
  }

  // Group static venue records by district.
  const byDistrict = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = String(row[idIdx]).trim();
    if (!id) continue; // needs a synced id; run Sync first
    const district = String(row[districtIdx] || '').trim().toUpperCase();
    if (!district) continue;

    let lat = Number(row[latIdx]);
    let lng = Number(row[lngIdx]);
    if (!lat || !lng) continue;

    const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
    if (name.toUpperCase() === 'SATURN BAR') {
      lat = 29.9679094;
      lng = -90.0442228;
    }

    // Canonical address, mirroring what "Sync Venues to Map" writes to the docs.
    const rowValues = {};
    headers.forEach((h, index) => {
      const key = normalizeHeader(h);
      if (key === 'id' || key === '') return;
      rowValues[key] = row[index];
    });
    const address = buildCanonicalAddress(rowValues);

    const point = { id: id, name: name, lat: lat, lng: lng };
    if (typeIdx !== -1 && row[typeIdx]) point.type = String(row[typeIdx]).trim();
    if (address) point.address = address;
    if (websiteIdx !== -1 && row[websiteIdx]) point.website = String(row[websiteIdx]).trim();
    if (facebookIdx !== -1 && row[facebookIdx]) point.facebook = String(row[facebookIdx]).trim();
    if (descIdx !== -1 && row[descIdx]) point.description = String(row[descIdx]).trim();

    (byDistrict[district] = byDistrict[district] || []).push(point);
  }

  const liveCounts = fetchLiveVoteCounts_();

  const token = ScriptApp.getOAuthToken();
  const authHeader = { 'Authorization': 'Bearer ' + token };
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings`;
  const now = new Date().toISOString();

  let published = 0;
  const districts = Object.keys(byDistrict);
  districts.forEach((d) => {
    // 1) Static snapshot: full overwrite of the points string.
    const staticPayload = {
      fields: {
        points: { stringValue: JSON.stringify(byDistrict[d]) },
        updatedAt: { timestampValue: now }
      }
    };
    const r1 = UrlFetchApp.fetch(`${base}/venues_${d}`, {
      method: 'patch',
      contentType: 'application/json',
      headers: authHeader,
      payload: JSON.stringify(staticPayload),
      muteHttpExceptions: true
    });
    if (r1.getResponseCode() >= 200 && r1.getResponseCode() < 300) {
      published++;
    } else {
      Logger.log(`Error publishing venues_${d}: ` + r1.getContentText());
    }

    // 2) Counts seed: full overwrite of the counts map (updateMask ensures
    // removed venues drop out rather than lingering).
    const countsFields = {};
    const dc = liveCounts[d] || {};
    Object.keys(dc).forEach((id) => { countsFields[id] = { integerValue: String(dc[id]) }; });
    const countsPayload = {
      fields: {
        counts: { mapValue: { fields: countsFields } },
        updatedAt: { timestampValue: now }
      }
    };
    const r2 = UrlFetchApp.fetch(
      `${base}/voteCounts_${d}?updateMask.fieldPaths=counts&updateMask.fieldPaths=updatedAt`, {
      method: 'patch',
      contentType: 'application/json',
      headers: authHeader,
      payload: JSON.stringify(countsPayload),
      muteHttpExceptions: true
    });
    if (r2.getResponseCode() < 200 || r2.getResponseCode() >= 300) {
      Logger.log(`Error seeding voteCounts_${d}: ` + r2.getContentText());
    }
  });

  SpreadsheetApp.getUi().alert(`Published ${published} district snapshot(s) for: ${districts.join(', ') || '(none)'}`);
}

// Reads every venue doc's live voteCount + district straight from Firestore
// (NOT the sheet) so the counts aggregate is seeded from app-owned truth.
// Returns { <DISTRICT>: { <venueId>: <count> } }.
function fetchLiveVoteCounts_() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/venues`;
  const token = ScriptApp.getOAuthToken();
  const authHeader = { 'Authorization': 'Bearer ' + token };
  const result = {};
  let nextPageToken = '';

  try {
    do {
      let fetchUrl = `${url}?pageSize=300`;
      if (nextPageToken) fetchUrl += `&pageToken=${encodeURIComponent(nextPageToken)}`;

      const resp = UrlFetchApp.fetch(fetchUrl, {
        method: 'get',
        headers: authHeader,
        muteHttpExceptions: true
      });
      if (resp.getResponseCode() !== 200) break;

      const body = JSON.parse(resp.getContentText());
      (body.documents || []).forEach((docItem) => {
        const parts = docItem.name.split('/');
        const id = parts[parts.length - 1];
        const f = docItem.fields || {};
        const district = (f.district && f.district.stringValue)
          ? f.district.stringValue.trim().toUpperCase() : '';
        if (!district) return;

        let count = 0;
        if (f.voteCount) {
          if (f.voteCount.integerValue !== undefined) count = parseInt(f.voteCount.integerValue, 10);
          else if (f.voteCount.doubleValue !== undefined) count = Math.round(Number(f.voteCount.doubleValue));
        }
        (result[district] = result[district] || {})[id] = count || 0;
      });
      nextPageToken = body.nextPageToken || '';
    } while (nextPageToken !== '');
  } catch (e) {
    Logger.log('Error fetching live vote counts: ' + e);
  }

  return result;
}

// One-time installer: auto-refresh the STATIC district snapshots every 15 min so
// new/edited/removed businesses propagate without opening the sheet. This also
// re-seeds counts on each run - acceptable since re-seeding matches the live
// venue docs; if you prefer counts to only ever move via live votes, install a
// static-only variant instead. Run this once from the Apps Script editor.
function installSnapshotTrigger() {
  // Avoid stacking duplicate triggers if run more than once.
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (t.getHandlerFunction() === 'publishDistrictSnapshots') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('publishDistrictSnapshots').timeBased().everyMinutes(15).create();
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Firebase Sync')
    .addItem('1. Geocode Addresses -> Lat/Lng', 'geocodeAddresses')
    .addItem('2. Sync Venues to Map', 'syncToFirestore')
    .addItem('3. Publish Homepage Map Snapshot', 'publishMapSnapshot')
    .addItem('4. Publish District Map Snapshots', 'publishDistrictSnapshots')
    .addToUi();
}
