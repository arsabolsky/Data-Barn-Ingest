**Data Barn Ingest Endpoint**

### **Overview**

This API endpoint is designed for data ingestion into the FTM "Data Warehouse" nicknamed "Data Barn". It supports handling HTTP POST requests and processes incoming data based on its content type.

### **Endpoint**

`POST /data-barn`

### **Parameters**

* `location` (optional): The location name for which to find the corresponding sheet ID. Default is "Test".  
* `operation` (optional): The operation to be performed on the data. Can be "replace" or "append". Default is "replace".

### **Headers**

* `Content-Type`: The content type of the data being sent. Supported types are "text/csv" and "application/json".

### **Request Body**

The body of the POST request should contain the data to be ingested. The format of the data should match the specified `Content-Type`.

### **Responses**

* **Success**: Returns a success message indicating the type of data processed, the location, and the operation performed.

```json
  {
    "message": "Success: {type} Data processed for location {locationName} with operation {operation}."
  }
```

* **Error**: Returns an error message if any issues occur during processing.

```json
  {
    "message": "Error: {error.message}"
  }
```

### **Example Request**

```json
POST /exec?location=Test&operation=replace

Content-Type: application/json

[
    {"key1": "value1", "key2": "value2"},
    {"key1": "value3", "key2": "value4"}
]
```

### **Example Response**

```json
{
  "message": "Success: application/json Data processed for location Test with operation replace."
}
```

### **Error Handling**

* If the specified location is invalid, an error message will be returned.  
* If the content type is unsupported, an error message will be returned.  
* If any other error occurs during processing, an error message will be returned.

