const PROJECT_ID = 'districts-after-dark';

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

  if (idIndex === -1) {
    SpreadsheetApp.getUi().alert("Error: Your sheet must have an 'id' column header.");
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
  const sheetIds = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const docId = String(row[idIndex]).trim();
    if (!docId) continue;

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

  SpreadsheetApp.getUi().alert(`Sync Complete!\n\nAdded/Updated: ${successCount} venue(s)\nDeleted: ${deleteCount} removed venue(s)`);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Firebase Sync')
    .addItem('1. Geocode Addresses -> Lat/Lng', 'geocodeAddresses')
    .addItem('2. Sync Venues to Map', 'syncToFirestore')
    .addToUi();
}
