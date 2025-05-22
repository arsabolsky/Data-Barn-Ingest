/**
 * Data Barn Endpoint
 * 
 * This script handles HTTP POST and GET requests, processes incoming data, and manages configurations
 * for the Data Barn Control Panel. It uses Google Apps Script to interact with Google Sheets.
 * 
 * Author: Elder Andrew Sabolsky
 * Date: 02/13/25
 * 
 * Description:
 * - Handles HTTP POST requests to process and ingest data.
 * - Retrieves configuration data from the control panel sheet.
 * - Processes data based on content type and performs specified operations.
 * - Manages Google Sheets data by appending or replacing content.
 * 
 * Credits:
 * - BetterLog library for logging
 * - PapaParse library for CSV parsing
 * - 30 seconds of code for the flatten function
 * 
 * Usage:
 * - Deploy the script
 * - Customize the CONTROL_PANEL constant with your Google Sheets ID.
 * - Use the doPost function to handle incoming HTTP POST requests.
 * - something like that idk man
 */

// Data Barn Control Panel Sheet ID
const CONTROL_PANEL = "1yaRNixtT_iCwb0BXbPOFpM5G3tqtMmUpFi4WFHioCys";

// Initilize BetterLog
const Logger = BetterLog.useSpreadsheet(CONTROL_PANEL, "LOGGER");

//Initilize Config
const CONFIG = getConfig();

/**
 * Handles HTTP POST requests and processes the incoming data based on its content type.
 *
 * @param {Object} e - An object containing the POST request data and parameters.
 * @returns {String} - The processed output from the ingest function.
 */
function doPost(e) {
  try {
    // Retrieve URL parameters with default values if they are missing
    const locationName = e.parameter.location || "Test";
    const locationID = getSheetID(locationName);
    if (!locationID) throw new Error(`Invalid location: ${locationName}`);
    const operation = e.parameter.operation || "replace";

    // Retrieve the Content-Type header
    const type = e.postData.type;

    // Retrieve the actual body/content of the POST data
    const data = e.postData.contents;

    // Process the data using the ingest function
    const processedOutput = ingest(data, type, locationID, operation);

    // Return Success Reponse
    const response = {
      status: "SUCCESS",
      type: type,
      location: locationName,
      operation: operation,
      message: "Ingest was successful."
    };
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    // Return Error Response
    const response = {
      status: "ERROR",
      type: type,
      location: locationName,
      operation: operation,
      message: error.message
    };
    Logger.log(`Error in doPost: ${error.message}`);
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles HTTP GET requests and processes the incoming data based on its content type.
 *
 * @param {Object} e - An object containing the GET request data and parameters.
 * @returns {String} - The deployment ID from CONTROL PANEL sheet
 */
// function doGet(e) {
//   try {
//     const sheet = SpreadsheetApp.openById(CONTROL_PANEL).getSheetByName("DEPLOYMENT");
//     if (!sheet) throw new Error("Sheet 'DEPLOYMENT' not found"); // I didn't know this was possible.
//     // Return Success Reponse
//     const response = {
//       status: "SUCCESS",
//       message: sheet.getRange('A2').getValue().toString()
//     };
//     return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
//   } catch (error) {
//     // Return Error Response
//     const response = {
//       status: "ERROR",
//       message: error.message
//     };
//     Logger.log(`Error in doPost: ${error.message}`);
//     return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
//   }
// }

/**
 * Retrieves configuration data from the control panel sheet.
 *
 * @returns {Array} - An array of configuration objects, each containing a location and its corresponding sheet ID.
 * @throws {Error} - Throws an error if the sheet cannot be accessed.
 */
function getConfig() {
  try {
    const sheet = SpreadsheetApp.openById(CONTROL_PANEL).getSheetByName("LOCATIONS");
    if (!sheet) throw new Error("Sheet 'LOCATIONS' not found"); // I didn't know this was possible.
    const data = sheet.getRange(1, 1, sheet.getMaxRows(), 2).getValues();
    if (!Array.isArray(data) || data.length === 0) throw new Error("No data found in the sheet");
    let config = []
    for (let i = 1; i < data.length; ++i) {
      if (data[i][0] === "END") {
        break;
      } else {
        config.push({ "location": data[i][0], "id": data[i][1] });
      }
    }
    if (config.length === 0) throw new Error("No valid configuration data found");
    return config;
  } catch (error) {
    Logger.log(`Error in getConfig: ${error.message}`);
    throw new Error(`Failed to retrieve configuration: ${error.message}`);
  }
}

/**
 * Retrieves the sheet ID for a given location from the CONFIG array.
 *
 * @param {String} location - The location name for which to find the corresponding sheet ID.
 * @returns {String|null} - The sheet ID if found, otherwise null.
 */
function getSheetID(location) {
  const result = CONFIG.find(obj => obj.location === location);
  if (!result) {
    Logger.log(`Location not found: ${location}`);
    return null;
  }
  return result.id;
}

/**
 * Processes the incoming data based on its content type and performs the specified operation.
 *
 * @param {String} data - The data to be ingested.
 * @param {String} type - The content type of the data (e.g., "text/csv", "application/json").
 * @param {String} location - The location where the data will be processed.
 * @param {String} operation - The operation to be performed ("replace" or "append").
 * @returns {Object} - The processed data.
 */
function ingest(data, type, location, operation) {
  try {
    Logger.log(`Content-Type: ${type}`);
    switch (type) {
      case "text/csv":
        const csvObject = Papa.parse(data).data;
        if (operation == "replace") {
          Logger.log(`Replacing CSV: ${operation}`);
          replace(csvObject, location);
        } else {
          Logger.log(`Append CSV: ${operation}`);
          append(csvObject, location);
        }
        Logger.log(`${type} ingest to ${location} using ${operation} has completed.`);
        return csvObject;
      case "application/json":
        let flatStanley = [];
        let jsonData = JSON.parse(data);
        jsonData.forEach(function (object) {
          flatStanley.push(flatten(object));
        });
        const csv = JSON.stringify(flatStanley);
        const parsedData = Papa.parse(Papa.unparse(csv, { header: true })).data;
        if (operation == "replace") {
          Logger.log(`Replacing JSON: ${operation}`);
          replace(parsedData, location);
        } else {
          Logger.log(`Append JSON: ${operation}`);
          append(parsedData, location);
        }
        Logger.log(`${type} ingest to ${location} using ${operation} has been completed.`);
        return parsedData;
      default:
        throw new Error("Unsupported content type");
    }
  } catch (error) {
    Logger.log(`Error in ingest: ${error.message}`);
    return ContentService.createTextOutput(`Error: ${error.message}`);
  }
}

/**
 * Ensures that all rows in the data array have the same number of columns by adding empty cells where necessary. Elder Morgan is hecka smart and wrote this.
 *
 * @param {Array} data - A 2D array containing the data.
 * @returns {Array} - The data array with consistent column sizes.
 */
function fixColumnSizeMismatch(data) {
  // Ensure data is an array and not empty
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Input data must be a non-empty array.");
  }

  // Determine the maximum number of columns in the data
  let maxColumns = Math.max.apply(null, data.map(function (row) {
    if (!Array.isArray(row)) {
      throw new Error("Each row in the data must be an array.");
    }
    return row.length;
  }));

  // Loop through each row and add empty cells if the row has fewer columns than maxColumns
  for (let i = 0; i < data.length; i++) {
    while (data[i].length < maxColumns) {
      data[i].push(""); // Add empty string to fill up the row
    }
  }

  // Return the fixed data
  return data;
}

/**
 * Appends new data to the existing data in the specified sheet.
 *
 * @param {Array} data - A 2D array containing the new data.
 * @param {String} location - The name of the sheet where the data will be appended.
 */
function append(data, location) {
  try {
    // Open the sheet by ID and name
    const sheet = SpreadsheetApp.openById(location).getActiveSheet();

    // Grab the old data from row 2 onward (this allows the new data to put its own headers up)
    const oldData = sheet.getRange(2, 1, sheet.getMaxRows() - 1, sheet.getMaxColumns()).getValues();

    // Merge the new data with the old data
    const mergedData = data.concat(oldData);

    // Replace the sheet with the merged (appened) data starting from row 2
    replace(mergedData, location);
  } catch (error) {
    Logger.log(`Error in append: ${error.message}`);
    throw new Error(`Failed to append data: ${error.message}`);
  }
}

/**
 * Clears the contents of the specified sheet and sets the values to the provided data.
 *
 * @param {Array} data - A 2D array containing the data.
 * @param {String} location - The name of the sheet to be cleared and updated.
 */
function replace(data, location) {
  try {
    // Open the sheet by ID and name
    const sheet = SpreadsheetApp.openById(location).getActiveSheet();

    // Clear existing Data
    sheet.clear();

    // Get the number of rows and columns in the new data
    const numRows = data.length;
    const numCols = data[0].length;

    // Log the dimensions of the data
    Logger.log(`Data Dimensions: ${numRows} rows, ${numCols} columns`);

    // Resize the sheet to match the new data
    if (sheet.getMaxRows() < numRows) {
      sheet.insertRowsAfter(sheet.getMaxRows(), numRows - sheet.getMaxRows());
    } else if (sheet.getMaxRows() > numRows) {
      sheet.deleteRows(numRows + 1, sheet.getMaxRows() - numRows);
    }
    if (sheet.getMaxColumns() < numCols) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), numCols - sheet.getMaxColumns());
    } else if (sheet.getMaxColumns() > numCols) {
      sheet.deleteColumns(numCols + 1, sheet.getMaxColumns() - numCols);
    }

    // Ensure the data has consistent column size (fix any mismatch)  
    data = fixColumnSizeMismatch(data);

    // Log the fixed data dimensions
    Logger.log(`Fixed Data Dimensions: ${data.length} rows, ${data[0].length} columns`);

    // Set the new values from the 2D array
    sheet.getRange(1, 1, numRows, numCols).setValues(data);
  } catch (error) {
    Logger.log(`Error in replace: ${error.message}`);
    throw new Error(`Failed to replace data: ${error.message}`);
  }
}

/**
 * Flattens a nested object into a single-level object with dot-separated keys. https://www.30secondsofcode.org/js/s/flatten-unflatten-object/
 *
 * @param {Object} obj - The object to be flattened.
 * @param {String} [delimiter="."] - The delimiter to use for separating keys.
 * @param {String} [prefix=""] - The prefix to use for the keys.
 * @returns {Object} - The flattened object.
 */
const flatten = (obj, delimiter = ".", prefix = "") =>
  Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? `${prefix}${delimiter}` : "";
    if (typeof obj[k] === "object" && obj[k] !== null && Object.keys(obj[k]).length > 0)
      Object.assign(acc, flatten(obj[k], delimiter, pre + k));
    else acc[pre + k] = obj[k];
    return acc;
  }, {});